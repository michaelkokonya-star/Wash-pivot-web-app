import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import cors from 'cors';
import Stripe from 'stripe';
import axios from 'axios';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import uploadRoutes from './routes/upload.ts';
import settingsRoutes from './routes/settings.ts';
import dataRoutes from './routes/data.ts';

dotenv.config();

// Load Firebase Config safely
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any;
try {
  firebaseConfig = JSON.parse(readFileSync(firebaseConfigPath, 'utf-8'));
} catch (error) {
  console.error('Failed to load firebase-applet-config.json:', error);
  process.exit(1);
}

// Initialize Firebase Admin
try {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
  console.log('Firebase Admin Initialized');
} catch (error) {
  console.error('Firebase Admin Initialization Error:', error);
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : null;

const mpesaConfig = {
  consumerKey: process.env.MPESA_CONSUMER_KEY,
  consumerSecret: process.env.MPESA_CONSUMER_SECRET,
  shortcode: process.env.MPESA_SHORTCODE || '174379', // Default test shortcode
  passkey: process.env.MPESA_PASSKEY,
  callbackUrl: process.env.MPESA_CALLBACK_URL || `${process.env.APP_URL}/api/mpesa/callback`,
};

console.log('--- Server Starting ---');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('Stripe Initialized:', !!stripe);
console.log('M-Pesa Configured:', !!(mpesaConfig.consumerKey && mpesaConfig.consumerSecret));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// M-Pesa OAuth Token Generator
async function getMpesaToken() {
  const auth = Buffer.from(`${mpesaConfig.consumerKey}:${mpesaConfig.consumerSecret}`).toString('base64');
  try {
    const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: { Authorization: `Basic ${auth}` },
    });
    return response.data.access_token;
  } catch (error: any) {
    console.error('M-Pesa Token Error:', error.response?.data || error.message);
    throw new Error('Failed to get M-Pesa access token');
  }
}

async function startServer() {
  try {
    const app = express();
    const PORT = parseInt(process.env.PORT || '3000', 10);

    app.use(cors());
    app.use(express.json());

    // Upload API
    app.use('/api', uploadRoutes);
    app.use('/api/settings', settingsRoutes);
    app.use('/api/data', dataRoutes);

    // API routes
    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Provision System Owner
    app.post('/api/admin/provision-owner', async (req, res) => {
      const { secret, password } = req.body;
      const ownerEmail = 'michael.kokonya@washpivot.com';

      if (!process.env.PROVISIONING_SECRET) {
        return res.status(500).json({ error: 'PROVISIONING_SECRET is not set in the environment' });
      }

      if (secret !== process.env.PROVISIONING_SECRET) {
        return res.status(401).json({ error: 'Invalid provisioning secret' });
      }

      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      try {
        let user;
        try {
          user = await admin.auth().getUserByEmail(ownerEmail);
          console.log(`User ${ownerEmail} exists, updating password...`);
          await admin.auth().updateUser(user.uid, { password });
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            console.log(`User ${ownerEmail} not found, creating...`);
            user = await admin.auth().createUser({
              email: ownerEmail,
              password,
              displayName: 'System Owner',
              emailVerified: true,
            });
          } else {
            throw error;
          }
        }

        res.json({ success: true, message: `Successfully provisioned password for ${ownerEmail}` });
      } catch (error: any) {
        console.error('Provisioning Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // Stripe Checkout
    app.post('/api/create-checkout-session', async (req, res) => {
      if (!stripe) {
        return res.status(500).json({ error: 'Stripe is not configured' });
      }

      try {
        const { items, successUrl, cancelUrl } = req.body;

        const lineItems = items.map((item: any) => ({
          price_data: {
            currency: 'kes',
            product_data: {
              name: item.name,
              images: [item.imageUrl],
            },
            unit_amount: Math.round(item.price * 100), // Stripe expects cents
          },
          quantity: item.quantity,
        }));

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: successUrl,
          cancel_url: cancelUrl,
        });

        res.json({ id: session.id, url: session.url });
      } catch (error: any) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: error.message });
      }
    });

    // M-Pesa STK Push
    app.post('/api/mpesa/stkpush', async (req, res) => {
      return res.status(503).json({ error: 'M-Pesa integration is currently paused for maintenance. Please use Stripe.' });
      /*
      try {
        const { phoneNumber, amount, accountReference, transactionDesc } = req.body;
        
        // Format phone number to 254XXXXXXXXX
        let formattedPhone = phoneNumber.replace(/\+/g, '');
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '254' + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
          formattedPhone = '254' + formattedPhone;
        }

        const token = await getMpesaToken();
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const password = Buffer.from(`${mpesaConfig.shortcode}${mpesaConfig.passkey}${timestamp}`).toString('base64');

        const response = await axios.post(
          'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
          {
            BusinessShortCode: mpesaConfig.shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: formattedPhone,
            PartyB: mpesaConfig.shortcode,
            PhoneNumber: formattedPhone,
            CallBackURL: mpesaConfig.callbackUrl,
            AccountReference: accountReference || 'WashPivot',
            TransactionDesc: transactionDesc || 'Payment for sustainable products',
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        res.json(response.data);
      } catch (error: any) {
        console.error('M-Pesa STK Push Error:', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.errorMessage || error.message });
      }
      */
    });

    // M-Pesa Callback (Safaricom calls this)
    app.post('/api/mpesa/callback', (req, res) => {
      console.log('M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));
      // In a real app, you'd update the order status in Firestore here
      // For this demo, we'll just log it.
      res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('Starting in development mode with Vite middleware...');
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      console.log('Starting in production mode...');
      const distPath = path.join(process.cwd(), 'dist');
      console.log(`Serving static files from: ${distPath}`);
      
      // Serve static files with caching for hashed assets
      app.use(express.static(distPath, {
        maxAge: '1y',
        immutable: true,
        index: false, // Don't serve index.html from here, we handle it below
      }));
      
      // Handle SPA routing - serve index.html for all non-API routes
      app.get('*all', (req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        
        // Prevent caching of index.html to ensure users always get the latest version
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error('Error sending index.html:', err);
            res.status(500).send('Internal Server Error');
          }
        });
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is listening on 0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
