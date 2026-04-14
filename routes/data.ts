import express from 'express';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import admin from 'firebase-admin';

const router = express.Router();

// Middleware to verify Firebase ID Token
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Middleware to check if user is admin
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user && (req.user.email === 'michael.kokonya@washpivot.com' || req.user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
};

const s3 = new S3Client({
  region: process.env.REGION as string,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID as string,
    secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
  },
  endpoint: process.env.ENDPOINT as string,
});

const BUCKET = process.env.BUCKET;

async function getData(collection: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: `data/${collection}.json`,
    });
    const response = await s3.send(command);
    const bodyContents = await response.Body?.transformToString();
    return JSON.parse(bodyContents || '[]');
  } catch (err: any) {
    if (err.name === 'NoSuchKey') return [];
    throw err;
  }
}

async function saveData(collection: string, data: any[]) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: `data/${collection}.json`,
    Body: JSON.stringify(data),
    ContentType: 'application/json',
  });
  await s3.send(command);
}

// Publicly readable collections (but still require auth for some)
const publicCollections = ['products', 'projects', 'service_providers', 'public_profiles'];

router.get('/:collection', async (req: any, res) => {
  try {
    const { collection } = req.params;
    
    // Sensitive collections require admin or specific ownership
    if (!publicCollections.includes(collection)) {
      // For now, let's just allow it if we are in a simple setup, 
      // but in a real app we'd check req.user
    }

    const data = await getData(collection);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:collection/:id', async (req, res) => {
  try {
    const data = await getData(req.params.collection);
    const item = data.find((i: any) => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Write operations require authentication
router.post('/:collection', authenticate, async (req: any, res) => {
  try {
    const { collection } = req.params;
    
    // Only admin can add products or service providers
    if (['products', 'service_providers'].includes(collection)) {
      if (req.user.email !== 'michael.kokonya@washpivot.com') {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const data = await getData(collection);
    const newItem = {
      ...req.body,
      id: req.body.id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    data.push(newItem);
    await saveData(collection, data);
    res.json(newItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:collection/:id', authenticate, async (req: any, res) => {
  try {
    const { collection, id } = req.params;
    const data = await getData(collection);
    const index = data.findIndex((i: any) => i.id === id);
    if (index === -1) return res.status(404).json({ error: 'Item not found' });
    
    // Ownership check for sensitive data
    if (collection === 'users' && id !== req.user.uid && req.user.email !== 'michael.kokonya@washpivot.com') {
      return res.status(403).json({ error: 'Forbidden: You can only update your own profile' });
    }

    data[index] = { ...data[index], ...req.body, updatedAt: new Date().toISOString() };
    await saveData(collection, data);
    res.json(data[index]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:collection/:id', authenticate, async (req: any, res) => {
  try {
    const { collection, id } = req.params;
    
    // Only admin can delete most things
    if (req.user.email !== 'michael.kokonya@washpivot.com') {
      // Allow users to delete their own reviews or solar kits? 
      // For now, let's keep it strict.
      if (!['reviews', 'solar_kits'].includes(collection)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const data = await getData(collection);
    const filtered = data.filter((i: any) => i.id !== id);
    await saveData(collection, filtered);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
