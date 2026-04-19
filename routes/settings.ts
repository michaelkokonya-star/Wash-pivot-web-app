import express from 'express';
import admin from 'firebase-admin';

const router = express.Router();
const db = admin.firestore();

// Fetch pricing rules
router.get('/pricing-rules', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('pricing_rules').get();
    if (!doc.exists) {
      // Return defaults if document doesn't exist
      return res.json({
        'Solar Panels': 150,
        'Batteries': 800,
        'Inverter': 12000,
        'Charge Controller': 500
      });
    }
    const data = doc.data();
    res.json(data?.value || {});
  } catch (err: any) {
    console.error('Error fetching pricing rules:', err);
    res.status(500).json({ error: err.message });
  }
});

// Save pricing rules
router.post('/pricing-rules', async (req, res) => {
  try {
    await db.collection('settings').doc('pricing_rules').set({
      value: req.body,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving pricing rules:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delivery Rules
router.get('/delivery-rules', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('delivery_rules').get();
    if (!doc.exists) {
      return res.json({
        baseRate: 200,
        ratePerKm: 50,
        freeThreshold: 50000
      });
    }
    const data = doc.data();
    res.json(data?.value || {});
  } catch (err: any) {
    console.error('Error fetching delivery rules:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/delivery-rules', async (req, res) => {
  try {
    await db.collection('settings').doc('delivery_rules').set({
      value: req.body,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving delivery rules:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
