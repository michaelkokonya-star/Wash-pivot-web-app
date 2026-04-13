import express from 'express';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const router = express.Router();

const s3 = new S3Client({
  region: process.env.REGION as string,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID as string,
    secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
  },
  endpoint: process.env.ENDPOINT as string,
});

const BUCKET = process.env.BUCKET;
const PRICING_RULES_KEY = 'settings/pricing_rules.json';

router.get('/pricing-rules', async (req, res) => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: PRICING_RULES_KEY,
    });
    const response = await s3.send(command);
    const bodyContents = await response.Body?.transformToString();
    res.json(JSON.parse(bodyContents || '{}'));
  } catch (err: any) {
    if (err.name === 'NoSuchKey') {
      // Return defaults if file doesn't exist
      return res.json({
        'Solar Panels': 150,
        'Batteries': 800,
        'Inverter': 12000,
        'Charge Controller': 500
      });
    }
    console.error('Error fetching pricing rules:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/pricing-rules', async (req, res) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: PRICING_RULES_KEY,
      Body: JSON.stringify(req.body),
      ContentType: 'application/json',
    });
    await s3.send(command);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Error saving pricing rules:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
