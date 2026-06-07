import express from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const router = express.Router();

const s3 = new S3Client({
  region: process.env.REGION as string,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID as string,
    secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
  },
  endpoint: process.env.ENDPOINT as string,
  forcePathStyle: true,
});

// Proxy S3 images to avoid CORS/auth issues on the frontend.
// GET /api/images/proxy?key=uploads/some-image.jpg
router.get('/proxy', async (req, res) => {
  const key = req.query.key as string;

  if (!key) {
    return res.status(400).json({ error: 'Missing required query parameter: key' });
  }

  const bucket = process.env.BUCKET || '';
  if (!bucket) {
    console.error('BUCKET environment variable is missing');
    return res.status(500).json({ error: 'S3 bucket configuration missing' });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    const s3Response = await s3.send(command);

    // Forward content-type so the browser renders the image correctly
    const contentType = s3Response.ContentType || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (s3Response.ContentLength) {
      res.setHeader('Content-Length', s3Response.ContentLength.toString());
    }

    // Stream the S3 body directly to the response
    const stream = s3Response.Body as Readable;
    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('S3 stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream image' });
      }
    });
  } catch (err: any) {
    console.error('S3 image proxy error:', err);
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
