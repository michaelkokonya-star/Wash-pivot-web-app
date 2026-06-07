import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import cors from 'cors';
import Stripe from 'stripe';
import axios from 'axios';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { GoogleGenAI } from "@google/genai";
import uploadRoutes from './routes/upload.ts';
import settingsRoutes from './routes/settings.ts';
import dataRoutes from './routes/data.ts';

dotenv.config();

// Initialize AI
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in the server environment');
  }
  return new GoogleGenAI({ apiKey });
};

// Load Firebase Config safely
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(readFileSync(firebaseConfigPath, 'utf-8'));
} catch (error) {
  console.log('Note: firebase-applet-config.json not found or invalid. Using environment variables instead.');
}

// Initialize Firebase Admin only if explicitly configured
let adminDb: any = null;
try {
  const projectId = process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId;
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  const options: any = {
    projectId: projectId,
  };

  let initialized = false;
  if (serviceAccount) {
    try {
      const cert = JSON.parse(serviceAccount);
      options.credential = admin.credential.cert(cert);
      console.log('Firebase Admin: Using service account from FIREBASE_SERVICE_ACCOUNT env var');
      initialized = true;
    } catch (e) {
      console.error('Firebase Admin: Failed to parse FIREBASE_SERVICE_ACCOUNT environment variable.');
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('Firebase Admin: Using credentials from GOOGLE_APPLICATION_CREDENTIALS file');
    initialized = true;
  }

  if (admin.apps.length === 0) {
    if (initialized) {
      admin.initializeApp(options);
      adminDb = admin.firestore();
      console.log(`Firebase Admin Initialized for project: ${projectId} with provided credentials`);
    } else if (projectId) {
      // Fallback for AI Studio environmental ADC or basic setup
      admin.initializeApp({ projectId });
      adminDb = admin.firestore();
      console.log(`Firebase Admin Initialized for project: ${projectId} (ADC fallback)`);
    } else {
      console.warn('Firebase Admin: No project ID or credentials found. Admin features may fail.');
    }
  }
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

    // Proxy Image Route to bypass iframe constraints for Google Drive and external images
    app.get('/api/proxy-image', async (req, res) => {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).json({ error: 'No URL provided' });
      }

      try {
        const parsedUrl = new URL(imageUrl);
        
        // Prevent SSRF: only allow HTTP/HTTPS, and do not allow localhost/private IPs
        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
          return res.status(400).json({ error: 'Invalid URL protocol' });
        }
        
        const hostname = parsedUrl.hostname.toLowerCase();
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
          return res.status(403).json({ error: 'Access to local resources is forbidden' });
        }

        const response = await axios({
          method: 'get',
          url: imageUrl,
          responseType: 'stream',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
          timeout: 15000,
          maxRedirects: 5,
        });

        // Set correct Content-Type if it is an image or fallback
        const contentType = response.headers['content-type'];
        if (contentType && (contentType.startsWith('image/') || contentType.startsWith('application/octet-stream'))) {
          res.setHeader('content-type', contentType);
        } else {
          res.setHeader('content-type', 'image/jpeg');
        }

        response.data.pipe(res);
      } catch (error: any) {
        console.error('Error proxying image:', imageUrl, error.message);
        res.status(500).json({ error: 'Failed to proxy image' });
      }
    });

    // AI Proxy Routes
    app.post('/api/ai/generate', async (req, res) => {
      try {
        const { model, prompt, systemInstruction, history, config } = req.body;
        const ai = getAiClient();
        
        let response;
        if (history) {
          const chat = ai.chats.create({
            model: model || "gemini-3-flash-preview",
            config: {
              systemInstruction,
            },
            history,
          });
          response = await chat.sendMessage({ message: prompt });
        } else {
          response = await ai.models.generateContent({
            model: model || "gemini-3-flash-preview",
            contents: prompt,
            config,
          });
        }
        
        res.json({ 
          text: response.text, 
          candidates: response.candidates,
          usageMetadata: response.usageMetadata 
        });
      } catch (error: any) {
        console.error('AI Proxy Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/ai/generate-image', async (req, res) => {
      try {
        const { model, prompt, config } = req.body;
        const ai = getAiClient();
        
        const response = await ai.models.generateContent({
          model: model || "gemini-2.5-flash-image",
          contents: {
            parts: [{ text: prompt }],
          },
          config,
        });

        res.json(response);
      } catch (error: any) {
        console.error('AI Image Proxy Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/ai/generate-video', async (req, res) => {
      try {
        const { model, prompt, image, config } = req.body;
        const ai = getAiClient();
        
        const operation = await ai.models.generateVideos({
          model: model || 'veo-3.1-generate-preview',
          prompt: prompt || 'Animate this scene with cinematic motion',
          image: image,
          config,
        });

        res.json(operation);
      } catch (error: any) {
        console.error('AI Video Proxy Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/ai/video-status', async (req, res) => {
      try {
        const { operation } = req.body;
        const ai = getAiClient();
        
        const status = await ai.operations.getVideosOperation({ operation });
        res.json(status);
      } catch (error: any) {
        console.error('AI Video Status Proxy Error:', error);
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/ai/video-download', async (req, res) => {
      try {
        const uri = req.query.uri as string;
        if (!uri) return res.status(400).json({ error: 'URI is required' });
        
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        
        const response = await axios.get(uri, {
          headers: {
            'x-goog-api-key': apiKey,
          },
          responseType: 'stream'
        });

        res.setHeader('Content-Type', response.headers['content-type']);
        response.data.pipe(res);
      } catch (error: any) {
        console.error('AI Video Download Proxy Error:', error);
        res.status(500).json({ error: error.message });
      }
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

    // Paystack Checkout
    app.post('/api/paystack/initialize', async (req, res) => {
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecret) {
        return res.status(500).json({ error: 'Paystack is not configured' });
      }

      try {
        const { email, amount, metadata } = req.body;

        const response = await axios.post(
          'https://api.paystack.co/transaction/initialize',
          {
            email,
            amount: Math.round(amount * 100), // Paystack expects minor units (cents/kobo)
            metadata: {
              ...metadata,
              custom_fields: metadata.items?.map((item: any) => ({
                display_name: item.name,
                variable_name: item.id,
                value: item.quantity
              }))
            },
            callback_url: `${process.env.APP_URL}/checkout/success?orderId=${metadata.orderId}&method=paystack`,
            cancel_url: `${process.env.APP_URL}/cart`
          },
          {
            headers: {
              Authorization: `Bearer ${paystackSecret}`,
              'Content-Type': 'application/json'
            }
          }
        );

        res.json(response.data);
      } catch (error: any) {
        console.error('Paystack Initialize Error:', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.message || 'Failed to initialize Paystack transaction' });
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
      try {
        const { phoneNumber, amount, accountReference, transactionDesc } = req.body;
        
        // Format phone number to 254XXXXXXXXX
        let formattedPhone = phoneNumber.replace(/\+/g, '').replace(/\s/g, '');
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '254' + formattedPhone.slice(1);
        } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
          formattedPhone = '254' + formattedPhone;
        }

        // If credentials are not set/valid, use a polished, simulated/sandbox-mock experience
        if (!mpesaConfig.consumerKey || !mpesaConfig.consumerSecret || !mpesaConfig.passkey) {
          console.warn('M-Pesa API Keys are missing - Running in Simulation Mode (Returns beautiful mock STK response)');
          return res.json({
            MerchantRequestID: 'SIM-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            CheckoutRequestID: 'ws_CO_' + Math.random().toString(36).substring(2, 15),
            ResponseCode: '0',
            ResponseDescription: 'Success. Request accepted for processing (Simulation Mode)',
            CustomerMessage: 'Success. Request accepted for processing',
            simulated: true
          });
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
            timeout: 15000
          }
        );

        res.json(response.data);
      } catch (error: any) {
        console.error('M-Pesa STK Push Error:', error.response?.data || error.message);
        res.status(500).json({ error: error.response?.data?.errorMessage || error.message });
      }
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
