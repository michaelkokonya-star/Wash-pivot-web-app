import express from 'express';
import axios from 'axios';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const router = express.Router();

// Initialise S3 client (same config as upload route)
const s3 = new S3Client({
  region: (process.env.REGION as string) || 'us-east-1',
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID as string,
    secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
  },
  endpoint: process.env.ENDPOINT as string,
  forcePathStyle: true,
});

// Common CORS + cache headers applied to every image response
function setImageHeaders(res: express.Response, contentType: string) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Content-Type', contentType || 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

// ---------------------------------------------------------------------------
// OPTIONS /api/images/*  — pre-flight
// ---------------------------------------------------------------------------
router.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.sendStatus(204);
});

// ---------------------------------------------------------------------------
// GET /api/images/proxy?url=<encoded-url>
// Proxies any external image URL (e.g. S3, DigitalOcean Spaces, CDN) and
// returns it with proper CORS + Content-Type headers so the browser can
// display it regardless of the origin's CORS policy.
// ---------------------------------------------------------------------------
router.get('/proxy', async (req, res) => {
  const rawUrl = req.query.url as string;

  if (!rawUrl) {
    return res.status(400).json({ error: 'Missing required query parameter: url' });
  }

  let imageUrl: string;
  try {
    imageUrl = decodeURIComponent(rawUrl);
    // Basic validation — must be an absolute http(s) URL
    new URL(imageUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid image URL' });
  }

  try {
    const upstream = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        // Forward a neutral user-agent so CDNs don't block the request
        'User-Agent': 'WashPivot-ImageProxy/1.0',
      },
      maxContentLength: 20 * 1024 * 1024, // 20 MB safety cap
    });

    const contentType =
      (upstream.headers['content-type'] as string) || 'image/jpeg';

    setImageHeaders(res, contentType);
    res.status(200).send(Buffer.from(upstream.data));
  } catch (err: any) {
    const status = err.response?.status;
    if (status === 404) {
      return res.status(404).json({ error: 'Image not found at source URL' });
    }
    console.error('[ImageProxy] Failed to fetch image:', imageUrl, err.message);
    res.status(502).json({ error: 'Failed to retrieve image from source' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/images/s3/:key
// Fetches an object directly from the configured S3 bucket by its key and
// streams it back with proper CORS + Content-Type headers.
// The key may contain slashes — express captures everything after /s3/ via
// the wildcard segment.
// ---------------------------------------------------------------------------
router.get('/s3/*', async (req, res) => {
  // Express stores the wildcard portion in req.params[0]
  const key = (req.params as any)[0] as string;

  if (!key) {
    return res.status(400).json({ error: 'Missing S3 object key' });
  }

  const bucket = process.env.BUCKET;
  if (!bucket) {
    return res.status(500).json({ error: 'S3 bucket is not configured' });
  }

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const s3Response = await s3.send(command);

    const contentType =
      (s3Response.ContentType as string) || 'image/jpeg';

    setImageHeaders(res, contentType);

    if (s3Response.ContentLength) {
      res.setHeader('Content-Length', s3Response.ContentLength);
    }

    // Stream the S3 body directly to the HTTP response
    (s3Response.Body as Readable).pipe(res);
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return res.status(404).json({ error: 'Image not found in storage' });
    }
    console.error('[S3Image] Failed to retrieve object:', key, err.message);
    res.status(500).json({ error: 'Failed to retrieve image from storage' });
  }
});

export default router;
