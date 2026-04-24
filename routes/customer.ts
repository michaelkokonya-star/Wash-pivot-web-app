import express from 'express';
import multer from 'multer';
import admin from 'firebase-admin';
import { getDb } from './db.ts';

const router = express.Router();

// Accept multipart uploads (up to 10 MB) or fall back to JSON body
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// ---------------------------------------------------------------------------
// Auth middleware – verifies Firebase ID token
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Product CRUD
// ---------------------------------------------------------------------------

// POST /api/customer/products – create a product
router.post('/products', authenticate, async (req: any, res) => {
  try {
    const { name, description, category, price, companyId } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const newProduct = {
      name,
      description: description || '',
      category: category || 'General',
      price: price ? parseFloat(price) : 0,
      companyId: companyId || req.user.uid,
      photos: [],
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await getDb().collection('customer_products').add(newProduct);
    const saved = await docRef.get();
    res.status(201).json({ id: docRef.id, ...saved.data() });
  } catch (err: any) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customer/products – list products (optionally filtered by companyId)
router.get('/products', async (req: any, res) => {
  try {
    const { companyId } = req.query;
    let query: any = getDb().collection('customer_products');
    if (companyId) {
      // Filter by companyId; sort client-side to avoid requiring a composite index
      query = query.where('companyId', '==', companyId);
      const snapshot = await query.get();
      const products = snapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
      return res.json(products);
    }
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const products = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    res.json(products);
  } catch (err: any) {
    console.error('Error listing products:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customer/products/:productId – get single product
router.get('/products/:productId', async (req, res) => {
  try {
    const doc = await getDb().collection('customer_products').doc(req.params.productId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Product not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err: any) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customer/products/:productId – update a product
router.put('/products/:productId', authenticate, async (req: any, res) => {
  try {
    const ref = getDb().collection('customer_products').doc(req.params.productId);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: 'Product not found' });

    const data = existing.data() as any;
    if (data.createdBy !== req.user.uid && req.user.email !== 'michael.kokonya@washpivot.com') {
      return res.status(403).json({ error: 'Forbidden: You can only update your own products' });
    }

    const { id: _id, createdAt: _ca, createdBy: _cb, ...updates } = req.body;
    await ref.set(
      { ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    const updated = await ref.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err: any) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customer/products/:productId – delete a product
router.delete('/products/:productId', authenticate, async (req: any, res) => {
  try {
    const ref = getDb().collection('customer_products').doc(req.params.productId);
    const existing = await ref.get();
    if (!existing.exists) return res.status(404).json({ error: 'Product not found' });

    const data = existing.data() as any;
    if (data.createdBy !== req.user.uid && req.user.email !== 'michael.kokonya@washpivot.com') {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own products' });
    }

    await ref.delete();
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting product:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Photo upload
// POST /api/customer/products/:productId/photo
//
// Accepts either:
//   - multipart/form-data with a "photo" field (binary file)
//   - application/json with { data: "<base64>", mimeType: "image/jpeg" }
//
// Stores the image as a base64 string inside a Firestore sub-collection so
// that no external storage bucket is required.
// ---------------------------------------------------------------------------
router.post(
  '/products/:productId/photo',
  authenticate,
  upload.single('photo'),
  async (req: any, res) => {
    try {
      const { productId } = req.params;

      // Verify product exists
      const productRef = getDb().collection('customer_products').doc(productId);
      const productDoc = await productRef.get();
      if (!productDoc.exists) {
        return res.status(404).json({ error: 'Product not found' });
      }

      let base64Data: string;
      let mimeType: string;

      if (req.file) {
        // Multipart upload
        base64Data = req.file.buffer.toString('base64');
        mimeType = req.file.mimetype || 'image/jpeg';
      } else if (req.body.data) {
        // JSON upload – strip data-URL prefix if present
        const raw: string = req.body.data;
        if (raw.startsWith('data:')) {
          const commaIdx = raw.indexOf(',');
          const header = raw.substring(5, commaIdx); // e.g. "image/jpeg;base64"
          mimeType = header.split(';')[0];
          base64Data = raw.substring(commaIdx + 1);
        } else {
          base64Data = raw;
          mimeType = req.body.mimeType || 'image/jpeg';
        }
      } else {
        return res.status(400).json({ error: 'No photo data provided. Send a multipart "photo" field or JSON { data, mimeType }.' });
      }

      // Validate size – base64 is ~4/3 of binary; 8 MB binary ≈ 10.7 MB base64
      if (base64Data.length > 11 * 1024 * 1024) {
        return res.status(413).json({ error: 'Image too large. Maximum size is 8 MB.' });
      }

      // Store in Firestore sub-collection
      const photoData = {
        productId,
        uploadedBy: req.user.uid,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        mimeType,
        data: base64Data,
      };

      const photoRef = await getDb()
        .collection('customer_products')
        .doc(productId)
        .collection('photos')
        .add(photoData);

      // Also push the photo ID into the product's photos[] array
      await productRef.update({
        photos: admin.firestore.FieldValue.arrayUnion(photoRef.id),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const photoUrl = `/api/customer/products/${productId}/photo/${photoRef.id}`;
      res.status(201).json({ id: photoRef.id, url: photoUrl, mimeType });
    } catch (err: any) {
      console.error('Error uploading product photo:', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// Photo retrieval
// GET /api/customer/products/:productId/photo/:photoId
// OPTIONS /api/customer/products/:productId/photo/:photoId  (CORS preflight)
// ---------------------------------------------------------------------------

// Handle CORS preflight for photo endpoints
router.options('/products/:productId/photo/:photoId', (req, res) => {
  res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.set('Access-Control-Allow-Credentials', 'true');
  res.set('Access-Control-Max-Age', '86400'); // cache preflight for 24 h
  res.status(204).end();
});

router.get('/products/:productId/photo/:photoId', async (req, res) => {
  try {
    const { productId, photoId } = req.params;

    const photoDoc = await getDb()
      .collection('customer_products')
      .doc(productId)
      .collection('photos')
      .doc(photoId)
      .get();

    if (!photoDoc.exists) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photoData = photoDoc.data() as any;
    const imageBuffer = Buffer.from(photoData.data, 'base64');
    const mimeType = photoData.mimeType || 'image/jpeg';

    // Explicit CORS headers on the image response so browsers can render it
    // whether loaded via <img src>, fetch(), or XHR from any origin.
    res.set('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.set('Access-Control-Allow-Credentials', 'true');
    res.set('Access-Control-Expose-Headers', 'Content-Type, Content-Length, Cache-Control');

    res.set('Content-Type', mimeType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Content-Length', String(imageBuffer.length));
    res.send(imageBuffer);
  } catch (err: any) {
    console.error('Error retrieving product photo:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Photo deletion
// DELETE /api/customer/products/:productId/photo/:photoId
// ---------------------------------------------------------------------------
router.delete('/products/:productId/photo/:photoId', authenticate, async (req: any, res) => {
  try {
    const { productId, photoId } = req.params;

    const productRef = getDb().collection('customer_products').doc(productId);
    const photoRef = productRef.collection('photos').doc(photoId);

    const photoDoc = await photoRef.get();
    if (!photoDoc.exists) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const photoData = photoDoc.data() as any;
    if (photoData.uploadedBy !== req.user.uid && req.user.email !== 'michael.kokonya@washpivot.com') {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own photos' });
    }

    await photoRef.delete();
    await productRef.update({
      photos: admin.firestore.FieldValue.arrayRemove(photoId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting product photo:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
