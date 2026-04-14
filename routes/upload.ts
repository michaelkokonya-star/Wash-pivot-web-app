import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

const s3 = new S3Client({
  region: process.env.REGION as string,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID as string,
    secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
  },
  endpoint: process.env.ENDPOINT as string,
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const key = `uploads/${Date.now()}-${req.file.originalname}`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    // Return a proxied URL so the browser fetches through the backend,
    // avoiding CORS issues with direct S3 access.
    const url = `/api/image?key=${encodeURIComponent(key)}`;
    res.json({ url, key });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/image', async (req, res) => {
  const key = req.query.key as string;

  if (!key) {
    return res.status(400).json({ error: 'Missing key query parameter' });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.BUCKET,
      Key: key,
    });

    const s3Response = await s3.send(command);

    res.setHeader('Content-Type', s3Response.ContentType ?? 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    (s3Response.Body as Readable).pipe(res);
  } catch (err: any) {
    console.error('Image proxy error:', err);
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
