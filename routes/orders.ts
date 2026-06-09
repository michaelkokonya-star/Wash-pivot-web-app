import express from 'express';
import admin from 'firebase-admin';
import { getDb } from './db.ts';

const router = express.Router();

// Middleware to verify Firebase ID Token and enforce admin-only access
const authenticateAdmin = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;

    const adminEmail = 'michael.kokonya@washpivot.com';
    if (decodedToken.email !== adminEmail) {
      // Also allow users with admin role stored in Firestore
      const userDoc = await getDb().collection('users').doc(decodedToken.uid).get();
      const userRole = userDoc.exists ? userDoc.data()?.role : null;
      if (userRole !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
    }

    next();
  } catch (error) {
    console.error('[Orders] Error verifying ID token:', error);
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// GET /api/orders — fetch all orders, newest first
router.get('/', authenticateAdmin, async (req: any, res) => {
  try {
    const { status } = req.query;

    let query: FirebaseFirestore.Query = getDb()
      .collection('orders')
      .orderBy('createdAt', 'desc');

    if (status && typeof status === 'string') {
      query = getDb()
        .collection('orders')
        .where('status', '==', status)
        .orderBy('createdAt', 'desc');
    }

    const snapshot = await query.get();

    const orders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data.status || 'pending',
        userEmail: data.userEmail || '',
        totalAmount: data.totalAmount || 0,
        paymentMethod: data.paymentMethod || '',
        items: data.items || [],
        shippingInfo: data.shippingInfo || {},
        trackingTimeline: data.trackingTimeline || [],
        // Serialize Firestore Timestamps to ISO strings for JSON transport
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt ?? null,
      };
    });

    console.log(`[Orders] Fetched ${orders.length} orders${status ? ` with status="${status}"` : ''}`);
    res.json(orders);
  } catch (err: any) {
    console.error('[Orders] Error fetching orders:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch orders' });
  }
});

// GET /api/orders/:id — fetch a single order by ID
router.get('/:id', authenticateAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const doc = await getDb().collection('orders').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const data = doc.data()!;
    const order = {
      id: doc.id,
      status: data.status || 'pending',
      userEmail: data.userEmail || '',
      totalAmount: data.totalAmount || 0,
      paymentMethod: data.paymentMethod || '',
      items: data.items || [],
      shippingInfo: data.shippingInfo || {},
      trackingTimeline: data.trackingTimeline || [],
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt ?? null,
    };

    res.json(order);
  } catch (err: any) {
    console.error(`[Orders] Error fetching order ${req.params.id}:`, err);
    res.status(500).json({ error: err.message || 'Failed to fetch order' });
  }
});

// PATCH /api/orders/:id — update order status and tracking timeline
router.patch('/:id', authenticateAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { status, trackingTimeline } = req.body;

    const updateData: Record<string, any> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status !== undefined) updateData.status = status;
    if (trackingTimeline !== undefined) updateData.trackingTimeline = trackingTimeline;

    await getDb().collection('orders').doc(id).set(updateData, { merge: true });

    const updatedDoc = await getDb().collection('orders').doc(id).get();
    const data = updatedDoc.data()!;

    res.json({
      id: updatedDoc.id,
      status: data.status || 'pending',
      userEmail: data.userEmail || '',
      totalAmount: data.totalAmount || 0,
      paymentMethod: data.paymentMethod || '',
      items: data.items || [],
      shippingInfo: data.shippingInfo || {},
      trackingTimeline: data.trackingTimeline || [],
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt ?? null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() ?? data.updatedAt ?? null,
    });
  } catch (err: any) {
    console.error(`[Orders] Error updating order ${req.params.id}:`, err);
    res.status(500).json({ error: err.message || 'Failed to update order' });
  }
});

// DELETE /api/orders/:id — delete an order
router.delete('/:id', authenticateAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    await getDb().collection('orders').doc(id).delete();
    console.log(`[Orders] Deleted order ${id}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error(`[Orders] Error deleting order ${req.params.id}:`, err);
    res.status(500).json({ error: err.message || 'Failed to delete order' });
  }
});

export default router;
