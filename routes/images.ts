import express from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const router = express.Router();

const s3 = new S3Client({
  region: (process.env.REGION as string) || 'us-east-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID as string,
    secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
  },
  endpoint: process.env.ENDPOINT as string,
  forcePathStyle: true,
});

// GET /api/images/proxy?url=https://t3.storageapi.dev/bucket/uploads/...
router.get('/proxy', async (req, res) => {
  const imageUrl = req.query.url as string;

  if (!imageUrl) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  console.log(`[ImageProxy] Proxying image: ${imageUrl}`);

  try {
    const bucket = process.env.BUCKET as string;
    if (!bucket) {
      console.error('[ImageProxy] BUCKET environment variable is not set');
      return res.status(500).json({ error: 'S3 bucket configuration missing' });
    }

    // Parse the S3 key from the URL
    // Expected format: https://t3.storageapi.dev/{bucket}/{key}
    // or: https://{endpoint}/{bucket}/{key}
    let key: string;
    try {
      const urlObj = new URL(imageUrl);
      const pathParts = urlObj.pathname.split('/').filter(Boolean);

      // If the first path segment matches the bucket name, strip it
      if (pathParts[0] === bucket) {
        key = pathParts.slice(1).join('/');
      } else {
        key = pathParts.join('/');
      }
    } catch (e) {
      console.error('[ImageProxy] Failed to parse image URL:', imageUrl, e);
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    if (!key) {
      return res.status(400).json({ error: 'Could not determine S3 key from URL' });
    }

    console.log(`[ImageProxy] Fetching from S3 — bucket: ${bucket}, key: ${key}`);

    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const s3Response = await s3.send(command);

    // Forward content-type and cache headers
    const contentType = s3Response.ContentType || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (s3Response.ContentLength) {
      res.setHeader('Content-Length', s3Response.ContentLength.toString());
    }

    // Stream the S3 body to the response
    if (s3Response.Body instanceof Readable) {
      s3Response.Body.pipe(res);
    } else {
      // AWS SDK v3 returns a ReadableStream in some environments
      const stream = s3Response.Body as any;
      if (stream && typeof stream.pipe === 'function') {
        stream.pipe(res);
      } else if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
        for await (const chunk of stream) {
          res.write(chunk);
        }
        res.end();
      } else {
        console.error('[ImageProxy] Unexpected S3 body type');
        res.status(500).json({ error: 'Failed to stream image from S3' });
      }
    }
  } catch (err: any) {
    console.error('[ImageProxy] Error fetching image from S3:', err.message || err);
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'Image not found' });
    }
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

export default router;
