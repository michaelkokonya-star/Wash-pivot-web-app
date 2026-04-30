import express from 'express';
import axios from 'axios';
import {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
} from './paystack-service.ts';
import { getDb } from './db.ts';
import admin from 'firebase-admin';

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/paystack/initialize
// ---------------------------------------------------------------------------
// Initializes a Paystack transaction and returns the hosted payment URL.
//
// Body:
//   email    {string}  Customer email address
//   amount   {number}  Amount in major currency units (e.g. KES 1500)
//   metadata {object}  Arbitrary metadata — must include orderId
//
// Response:
//   { status, data: { authorization_url, access_code, reference } }
// ---------------------------------------------------------------------------
router.post('/initialize', async (req, res) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: 'Paystack is not configured on this server' });
  }

  const { email, amount, metadata } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'A valid email address is required' });
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'A positive numeric amount is required' });
  }

  try {
    const appUrl = process.env.APP_URL || '';
    const orderId = metadata?.orderId ?? '';

    // Build custom_fields for the Paystack receipt (optional but helpful)
    const customFields = metadata?.items?.map((item: any) => ({
      display_name: item.name,
      variable_name: String(item.id ?? item.name).replace(/\s+/g, '_').toLowerCase(),
      value: String(item.quantity ?? 1),
    })) ?? [];

    const result = await initializeTransaction({
      email,
      amount,
      metadata: {
        ...metadata,
        custom_fields: customFields,
      },
      callback_url: `${appUrl}/checkout/success?orderId=${orderId}&method=paystack`,
      cancel_url: `${appUrl}/cart`,
    });

    res.json({
      status: true,
      message: 'Authorization URL created',
      data: result,
    });
  } catch (error: any) {
    console.error('[Paystack] Initialize error:', error.response?.data ?? error.message);
    const message =
      error.response?.data?.message ?? error.message ?? 'Failed to initialize Paystack transaction';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/paystack/verify
// ---------------------------------------------------------------------------
// Verifies a Paystack transaction after the customer returns from the
// hosted payment page.
//
// Body:
//   reference {string}  The transaction reference from the Paystack callback
//
// Response:
//   { status, message, data: { status, reference, amount, currency, ... } }
// ---------------------------------------------------------------------------
router.post('/verify', async (req, res) => {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return res.status(500).json({ error: 'Paystack is not configured on this server' });
  }

  const { reference } = req.body;

  if (!reference || typeof reference !== 'string') {
    return res.status(400).json({ error: 'A transaction reference is required' });
  }

  try {
    const result = await verifyTransaction(reference);

    // If the transaction succeeded and we have an orderId in metadata, update
    // the Firestore order document so the UI reflects the confirmed payment.
    if (result.status === 'success' && result.metadata?.orderId) {
      try {
        await getDb()
          .collection('orders')
          .doc(result.metadata.orderId)
          .set(
            {
              status: 'paid',
              paymentReference: reference,
              paidAt: result.paidAt ?? new Date().toISOString(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
      } catch (dbErr: any) {
        // Non-fatal — log but still return the verification result to the client
        console.error('[Paystack] Firestore update error after verify:', dbErr.message);
      }
    }

    res.json({
      status: true,
      message: result.status === 'success' ? 'Payment verified successfully' : `Payment ${result.status}`,
      data: result,
    });
  } catch (error: any) {
    console.error('[Paystack] Verify error:', error.response?.data ?? error.message);
    const message =
      error.response?.data?.message ?? error.message ?? 'Failed to verify Paystack transaction';
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/paystack/webhook
// ---------------------------------------------------------------------------
// Receives and processes Paystack webhook events.
// Paystack sends a POST with a JSON body and an X-Paystack-Signature header.
//
// IMPORTANT: This route must receive the raw (unparsed) request body so that
// the HMAC signature can be verified correctly.  The raw body is captured via
// the `verify` option on express.json() — see server.ts for the setup.
// ---------------------------------------------------------------------------
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    // Always acknowledge quickly so Paystack doesn't retry
    res.sendStatus(200);

    const signature = req.headers['x-paystack-signature'] as string | undefined;

    if (!signature) {
      console.warn('[Paystack Webhook] Missing X-Paystack-Signature header — ignoring event');
      return;
    }

    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error('[Paystack Webhook] PAYSTACK_SECRET_KEY not set — cannot verify signature');
      return;
    }

    const rawBody = req.body as Buffer;

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn('[Paystack Webhook] Invalid signature — ignoring event');
      return;
    }

    let event: any;
    try {
      event = JSON.parse(rawBody.toString('utf8'));
    } catch {
      console.error('[Paystack Webhook] Failed to parse event body');
      return;
    }

    console.log(`[Paystack Webhook] Received event: ${event.event}`);

    try {
      await handleWebhookEvent(event);
    } catch (err: any) {
      console.error('[Paystack Webhook] Handler error:', err.message);
    }
  },
);

// ---------------------------------------------------------------------------
// Internal webhook event handler
// ---------------------------------------------------------------------------
async function handleWebhookEvent(event: any): Promise<void> {
  const { event: eventType, data } = event;

  switch (eventType) {
    case 'charge.success':
      await handleChargeSuccess(data);
      break;

    case 'subscription.create':
      console.log('[Paystack Webhook] Subscription created:', data?.subscription_code);
      break;

    case 'subscription.disable':
      console.log('[Paystack Webhook] Subscription disabled:', data?.subscription_code);
      break;

    default:
      console.log(`[Paystack Webhook] Unhandled event type: ${eventType}`);
  }
}

async function handleChargeSuccess(data: any): Promise<void> {
  const reference = data?.reference;
  const metadata = data?.metadata ?? {};
  const orderId = metadata?.orderId;
  const customerEmail = data?.customer?.email;
  const amountPaid = (data?.amount ?? 0) / 100;
  const currency = data?.currency ?? 'KES';
  const paidAt = data?.paid_at ?? new Date().toISOString();

  console.log(`[Paystack Webhook] charge.success — ref: ${reference}, orderId: ${orderId}`);

  // 1. Update Firestore order status
  if (orderId) {
    try {
      await getDb()
        .collection('orders')
        .doc(orderId)
        .set(
          {
            status: 'paid',
            paymentReference: reference,
            paidAt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      console.log(`[Paystack Webhook] Order ${orderId} marked as paid`);
    } catch (err: any) {
      console.error(`[Paystack Webhook] Failed to update order ${orderId}:`, err.message);
    }
  }

  // 2. Send confirmation email via SendGrid (if configured)
  if (customerEmail && process.env.SENDGRID_API_KEY) {
    try {
      await sendOrderConfirmationEmail({
        to: customerEmail,
        orderId: orderId ?? reference,
        amountPaid,
        currency,
        reference,
        paidAt,
      });
      console.log(`[Paystack Webhook] Confirmation email sent to ${customerEmail}`);
    } catch (err: any) {
      // Non-fatal — log but don't fail the webhook handler
      console.error('[Paystack Webhook] Failed to send confirmation email:', err.message);
    }
  }
}

// ---------------------------------------------------------------------------
// SendGrid email helper
// ---------------------------------------------------------------------------
interface OrderConfirmationEmailParams {
  to: string;
  orderId: string;
  amountPaid: number;
  currency: string;
  reference: string;
  paidAt: string;
}

async function sendOrderConfirmationEmail(params: OrderConfirmationEmailParams): Promise<void> {
  const { to, orderId, amountPaid, currency, reference, paidAt } = params;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@washpivot.com';
  const appUrl = process.env.APP_URL || 'https://washpivot.com';

  const formattedAmount = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: currency === 'KES' ? 'KES' : currency,
    minimumFractionDigits: 0,
  }).format(amountPaid);

  const formattedDate = new Date(paidAt).toLocaleString('en-KE', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  await axios.post(
    'https://api.sendgrid.com/v3/mail/send',
    {
      personalizations: [
        {
          to: [{ email: to }],
          subject: `Payment Confirmed — Order #${orderId}`,
        },
      ],
      from: { email: fromEmail, name: 'Wash Pivot' },
      content: [
        {
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
              <div style="background: #059669; padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 28px; letter-spacing: -1px;">Payment Confirmed ✓</h1>
              </div>
              <div style="background: #f9fafb; padding: 32px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb; border-top: none;">
                <p style="font-size: 16px; margin-top: 0;">Thank you for your purchase! Your payment has been received and your order is now being processed.</p>

                <table style="width: 100%; border-collapse: collapse; margin: 24px 0; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
                  <tr style="background: #f3f4f6;">
                    <td style="padding: 12px 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #6b7280;">Order ID</td>
                    <td style="padding: 12px 16px; font-weight: bold;">${orderId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #6b7280;">Amount Paid</td>
                    <td style="padding: 12px 16px; font-weight: bold; color: #059669;">${formattedAmount}</td>
                  </tr>
                  <tr style="background: #f3f4f6;">
                    <td style="padding: 12px 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #6b7280;">Payment Reference</td>
                    <td style="padding: 12px 16px; font-family: monospace; font-size: 13px;">${reference}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #6b7280;">Date</td>
                    <td style="padding: 12px 16px;">${formattedDate}</td>
                  </tr>
                </table>

                <div style="text-align: center; margin-top: 32px;">
                  <a href="${appUrl}/profile" style="display: inline-block; background: #059669; color: #fff; font-weight: bold; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 15px;">
                    View My Orders →
                  </a>
                </div>

                <p style="font-size: 13px; color: #9ca3af; margin-top: 32px; text-align: center;">
                  If you have any questions, reply to this email or contact us at support@washpivot.com
                </p>
              </div>
            </div>
          `,
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
    },
  );
}

export default router;
