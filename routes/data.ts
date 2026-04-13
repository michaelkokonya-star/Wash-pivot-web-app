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

router.get('/:collection', async (req, res) => {
  try {
    const data = await getData(req.params.collection);
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

router.post('/:collection', async (req, res) => {
  try {
    const data = await getData(req.params.collection);
    const newItem = {
      ...req.body,
      id: req.body.id || Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    data.push(newItem);
    await saveData(req.params.collection, data);
    res.json(newItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:collection/:id', async (req, res) => {
  try {
    const data = await getData(req.params.collection);
    const index = data.findIndex((i: any) => i.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Item not found' });
    
    data[index] = { ...data[index], ...req.body, updatedAt: new Date().toISOString() };
    await saveData(req.params.collection, data);
    res.json(data[index]);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:collection/:id', async (req, res) => {
  try {
    const data = await getData(req.params.collection);
    const filtered = data.filter((i: any) => i.id !== req.params.id);
    await saveData(req.params.collection, filtered);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
