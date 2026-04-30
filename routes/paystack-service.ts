import axios from 'axios';
import crypto from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

function getSecret(): string {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured');
  }
  return secret;
}

function paystackHeaders() {
  return {
    Authorization: `Bearer ${getSecret()}`,
    'Content-Type': 'application/json',
  };
}

export interface InitializeTransactionParams {
  email: string;
  /** Amount in the currency's major unit (e.g. KES 500). Converted to kobo/cents internally. */
  amount: number;
  metadata?: Record<string, any>;
  callback_url?: string;
  cancel_url?: string;
  channels?: string[];
}

export interface InitializeTransactionResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

/**
 * Initialize a Paystack transaction.
 * Returns the hosted payment page URL and the transaction reference.
 */
export async function initializeTransaction(
  params: InitializeTransactionParams,
): Promise<InitializeTransactionResult> {
  const { email, amount, metadata, callback_url, cancel_url, channels } = params;

  const payload: Record<string, any> = {
    email,
    // Paystack expects the amount in the smallest currency unit (kobo for NGN, pesewas for GHS, etc.)
    // For KES (which Paystack treats as a zero-decimal currency) we still multiply by 100 to be safe
    // and consistent with how the existing inline route works.
    amount: Math.round(amount * 100),
    channels: channels ?? ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
  };

  if (metadata) payload.metadata = metadata;
  if (callback_url) payload.callback_url = callback_url;
  if (cancel_url) payload.cancel_url = cancel_url;

  const response = await axios.post(
    `${PAYSTACK_BASE_URL}/transaction/initialize`,
    payload,
    { headers: paystackHeaders() },
  );

  const { data } = response.data;
  return {
    authorization_url: data.authorization_url,
    access_code: data.access_code,
    reference: data.reference,
  };
}

export interface VerifyTransactionResult {
  status: string;          // e.g. "success" | "failed" | "abandoned"
  reference: string;
  amount: number;          // in major units (divided by 100)
  currency: string;
  paidAt: string | null;
  customerEmail: string;
  metadata: Record<string, any>;
  gatewayResponse: string;
  channel: string;
}

/**
 * Verify a Paystack transaction by its reference.
 */
export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  const response = await axios.get(
    `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: paystackHeaders() },
  );

  const { data } = response.data;
  return {
    status: data.status,
    reference: data.reference,
    amount: data.amount / 100,
    currency: data.currency,
    paidAt: data.paid_at ?? null,
    customerEmail: data.customer?.email ?? '',
    metadata: data.metadata ?? {},
    gatewayResponse: data.gateway_response ?? '',
    channel: data.channel ?? '',
  };
}

/**
 * Verify that a webhook request genuinely came from Paystack by comparing
 * the X-Paystack-Signature header against an HMAC-SHA512 of the raw body.
 */
export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const secret = getSecret();
  const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  return hash === signature;
}
