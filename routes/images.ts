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

// Trusted domains that can be proxied — prevents open-proxy abuse
const PROXY_ALLOWED_DOMAINS = [
  'unsplash.com',
  'images.unsplash.com',
  'picsum.photos',
  'drive.google.com',
  'ui-avatars.com',
  'via.placeholder.com',
];

/**
 * GET /api/images/proxy?url=<encoded-url>
 * Proxies external images through the server to avoid CORS/mixed-content issues.
 * Only allows requests to domains in PROXY_ALLOWED_DOMAINS.
 */
router.get('/images/proxy', async (req, res) => {
  const rawUrl = req.query.url as string;

  if (!rawUrl) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(rawUrl);
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname;

    const isAllowed = PROXY_ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      console.warn(`Image proxy: blocked request to untrusted domain: ${hostname}`);
      return res.status(403).json({ error: `Domain not allowed: ${hostname}` });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await fetch(targetUrl);

    if (!response.ok) {
      console.warn(`Image proxy: upstream returned ${response.status} for ${targetUrl}`);
      return res.status(response.status).json({ error: `Upstream error: ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 h

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error(`Image proxy: fetch failed for ${targetUrl}:`, err.message);
    res.status(502).json({ error: 'Failed to fetch image' });
  }
});

/**
 * GET /api/images/s3/:key(*)
 * Streams an object from the configured S3 bucket.
 * Useful as a fallback when the bucket is not publicly accessible.
 */
router.get('/images/s3/:key(*)', async (req, res) => {
  const key = req.params.key;
  const bucket = process.env.BUCKET || '';

  if (!bucket) {
    return res.status(500).json({ error: 'S3 bucket not configured' });
  }

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const s3Response = await s3.send(command);

    const contentType = s3Response.ContentType || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 h

    if (s3Response.Body instanceof Readable) {
      s3Response.Body.pipe(res);
    } else {
      // SDK v3 returns a ReadableStream in some environments
      const stream = s3Response.Body as any;
      const reader = stream.getReader();
      const pump = async () => {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(value);
        await pump();
      };
      await pump();
    }
  } catch (err: any) {
    const statusCode = err.name === 'NoSuchKey' ? 404 : 502;
    console.error(`S3 image route: failed to fetch key "${key}":`, err.message);
    res.status(statusCode).json({ error: err.message });
  }
});

export default router;
