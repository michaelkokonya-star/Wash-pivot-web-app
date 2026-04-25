import express from 'express';
import multer from 'multer';
import admin from 'firebase-admin';
import { query as pgQuery } from './postgres-db.ts';

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
// Helper – map a products row to the API shape clients expect
// ---------------------------------------------------------------------------
function rowToProduct(row: any): any {
  return {
    id:          row.id,
    name:        row.name,
    description: row.description,
    category:    row.category,
    price:       parseFloat(row.price),
    companyId:   row.company_id,
    createdBy:   row.created_by,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
    // photos array is populated separately when needed
    photos:      row.photos ?? [],
  };
}

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

    const { rows } = await pgQuery(
      `INSERT INTO products (name, description, category, price, company_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        description || '',
        category    || 'General',
        price ? parseFloat(price) : 0,
        companyId   || req.user.uid,
        req.user.uid,
      ]
    );

    res.status(201).json(rowToProduct(rows[0]));
  } catch (err: any) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customer/products – list products (optionally filtered by companyId)
router.get('/products', async (req: any, res) => {
  try {
    const { companyId } = req.query;

    let result;
    if (companyId) {
      result = await pgQuery(
        `SELECT * FROM products WHERE company_id = $1 ORDER BY created_at DESC`,
        [companyId]
      );
    } else {
      result = await pgQuery(
        `SELECT * FROM products ORDER BY created_at DESC`
      );
    }

    // Attach photo IDs for each product
    const products = await Promise.all(
      result.rows.map(async (row: any) => {
        const photoResult = await pgQuery(
          `SELECT id FROM product_photos WHERE product_id = $1 ORDER BY uploaded_at ASC`,
          [row.id]
        );
        return rowToProduct({ ...row, photos: photoResult.rows.map((p: any) => p.id) });
      })
    );

    res.json(products);
  } catch (err: any) {
    console.error('Error listing products:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customer/products/:productId – get single product
router.get('/products/:productId', async (req, res) => {
  try {
    const { rows } = await pgQuery(
      `SELECT * FROM products WHERE id = $1`,
      [req.params.productId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const photoResult = await pgQuery(
      `SELECT id FROM product_photos WHERE product_id = $1 ORDER BY uploaded_at ASC`,
      [req.params.productId]
    );

    res.json(rowToProduct({ ...rows[0], photos: photoResult.rows.map((p: any) => p.id) }));
  } catch (err: any) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/customer/products/:productId – update a product
router.put('/products/:productId', authenticate, async (req: any, res) => {
  try {
    const { rows: existing } = await pgQuery(
      `SELECT * FROM products WHERE id = $1`,
      [req.params.productId]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Product not found' });

    if (existing[0].created_by !== req.user.uid && req.user.email !== 'michael.kokonya@washpivot.com') {
      return res.status(403).json({ error: 'Forbidden: You can only update your own products' });
    }

    const { id: _id, createdAt: _ca, createdBy: _cb, ...updates } = req.body;

    const { rows } = await pgQuery(
      `UPDATE products
       SET name        = COALESCE($1, name),
           description = COALESCE($2, description),
           category    = COALESCE($3, category),
           price       = COALESCE($4, price),
           company_id  = COALESCE($5, company_id),
           updated_at  = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        updates.name        ?? null,
        updates.description ?? null,
        updates.category    ?? null,
        updates.price != null ? parseFloat(updates.price) : null,
        updates.companyId   ?? null,
        req.params.productId,
      ]
    );

    const photoResult = await pgQuery(
      `SELECT id FROM product_photos WHERE product_id = $1 ORDER BY uploaded_at ASC`,
      [req.params.productId]
    );

    res.json(rowToProduct({ ...rows[0], photos: photoResult.rows.map((p: any) => p.id) }));
  } catch (err: any) {
    console.error('Error updating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/customer/products/:productId – delete a product
router.delete('/products/:productId', authenticate, async (req: any, res) => {
  try {
    const { rows: existing } = await pgQuery(
      `SELECT * FROM products WHERE id = $1`,
      [req.params.productId]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Product not found' });

    if (existing[0].created_by !== req.user.uid && req.user.email !== 'michael.kokonya@washpivot.com') {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own products' });
    }

    // Cascade deletes photos automatically (ON DELETE CASCADE in schema)
    await pgQuery(`DELETE FROM products WHERE id = $1`, [req.params.productId]);
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
// Stores the image as a base64 string in the product_photos table so that
// no external storage bucket is required.
// ---------------------------------------------------------------------------
router.post(
  '/products/:productId/photo',
  authenticate,
  upload.single('photo'),
  async (req: any, res) => {
    try {
      const { productId } = req.params;

      // Verify product exists
      const { rows: productRows } = await pgQuery(
        `SELECT id FROM products WHERE id = $1`,
        [productId]
      );
      if (productRows.length === 0) {
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

      const { rows } = await pgQuery(
        `INSERT INTO product_photos (product_id, data, mime_type, uploaded_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id, mime_type`,
        [productId, base64Data, mimeType, req.user.uid]
      );

      const photoId  = rows[0].id;
      const photoUrl = `/api/customer/products/${productId}/photo/${photoId}`;
      res.status(201).json({ id: photoId, url: photoUrl, mimeType: rows[0].mime_type });
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

    const { rows } = await pgQuery(
      `SELECT data, mime_type FROM product_photos WHERE id = $1 AND product_id = $2`,
      [photoId, productId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    const imageBuffer = Buffer.from(rows[0].data, 'base64');
    const mimeType    = rows[0].mime_type || 'image/jpeg';

    // Explicit CORS headers so browsers can render the image from any origin
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

    const { rows } = await pgQuery(
      `SELECT uploaded_by FROM product_photos WHERE id = $1 AND product_id = $2`,
      [photoId, productId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    if (rows[0].uploaded_by !== req.user.uid && req.user.email !== 'michael.kokonya@washpivot.com') {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own photos' });
    }

    await pgQuery(`DELETE FROM product_photos WHERE id = $1`, [photoId]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting product photo:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
