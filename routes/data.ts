import express from 'express';
import admin from 'firebase-admin';
import { getDb } from './db.ts';

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

// Publicly readable collections
const publicCollections = ['products', 'projects', 'service_providers', 'public_profiles'];

router.get('/:collection', async (req: any, res) => {
  try {
    const { collection } = req.params;
    const snapshot = await getDb().collection(collection).get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (err: any) {
    console.error(`Error fetching collection ${req.params.collection}:`, err);
    if (err.message?.includes('PERMISSION_DENIED')) {
      return res.status(403).json({ error: 'Permission denied. Please check your service account permissions.' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get('/:collection/:id', async (req, res) => {
  try {
    const { collection, id } = req.params;
    const doc = await getDb().collection(collection).doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Item not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error(`Error fetching document ${req.params.id} from ${req.params.collection}:`, err);
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

    const newItem = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    const docRef = await getDb().collection(collection).add(newItem);
    const savedDoc = await docRef.get();
    res.json({ id: docRef.id, ...savedDoc.data() });
  } catch (err: any) {
    console.error(`Error creating item in ${req.params.collection}:`, err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:collection/:id', authenticate, async (req: any, res) => {
  try {
    const { collection, id } = req.params;
    
    // Ownership check for sensitive data
    if (collection === 'users' && id !== req.user.uid && req.user.email !== 'michael.kokonya@washpivot.com') {
      return res.status(403).json({ error: 'Forbidden: You can only update your own profile' });
    }

    const updateData = {
      ...req.body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Handle the case where someone includes ID in the body
    delete updateData.id;

    await getDb().collection(collection).doc(id).set(updateData, { merge: true });
    const updatedDoc = await getDb().collection(collection).doc(id).get();
    res.json({ id: updatedDoc.id, ...updatedDoc.data() });
  } catch (err: any) {
    console.error(`Error updating item ${req.params.id} in ${req.params.collection}:`, err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:collection/:id', authenticate, async (req: any, res) => {
  try {
    const { collection, id } = req.params;
    
    // Only admin can delete most things
    if (req.user.email !== 'michael.kokonya@washpivot.com') {
      if (!['reviews', 'solar_kits'].includes(collection)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    await getDb().collection(collection).doc(id).delete();
    res.json({ success: true });
  } catch (err: any) {
    console.error(`Error deleting item ${req.params.id} from ${req.params.collection}:`, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
