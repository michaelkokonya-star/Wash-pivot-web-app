import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

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

router.post('/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const key = `photos/${Date.now()}-${req.file.originalname}`;
    await s3.send(new PutObjectCommand({
      Bucket: process.env.BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));

    console.log('Upload successful, key:', key);
    // Return both the key (for proxy URL construction) and the full S3 URL
    const url = `/api/image?key=${encodeURIComponent(key)}`;
    res.json({ url, key });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Image proxy: fetches the object from S3 and streams it to the client,
// avoiding CORS and mixed-content issues with direct S3 URLs.
router.get('/image', async (req, res) => {
  const key = req.query.key as string;
  if (!key) {
    return res.status(400).json({ error: 'Missing key parameter' });
  }

  try {
    console.log('Image proxy request for key:', key);
    const command = new GetObjectCommand({
      Bucket: process.env.BUCKET,
      Key: key,
    });
    const s3Response = await s3.send(command);

    if (s3Response.ContentType) {
      res.setHeader('Content-Type', s3Response.ContentType);
    }
    if (s3Response.ContentLength) {
      res.setHeader('Content-Length', s3Response.ContentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    // Stream the S3 body to the response
    const stream = s3Response.Body as any;
    stream.pipe(res);
  } catch (err: any) {
    console.error('Image proxy error for key', key, ':', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
