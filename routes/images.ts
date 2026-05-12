import express from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const router = express.Router();

// Only proxy requests to this specific S3-compatible storage endpoint.
// Restricting to a known hostname prevents the proxy from being abused
// as an open relay for arbitrary external URLs.
const ALLOWED_PROXY_HOSTNAME = 't3.storageapi.dev';

// Re-use the same S3 client configuration as the upload route so that
// authenticated requests are made with the same credentials/endpoint.
const s3 = new S3Client({
  region: process.env.REGION as string,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID as string,
    secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
  },
  ...(process.env.ENDPOINT ? { endpoint: process.env.ENDPOINT } : {}),
  forcePathStyle: false,
});

const BUCKET = process.env.BUCKET || '';

/**
 * GET /api/images/proxy?url=<encoded-url>
 *
 * Fetches an image from t3.storageapi.dev via the AWS SDK (with S3
 * credentials) and re-serves it with CORS headers so the browser can
 * display it without a CORS error.
 *
 * Using GetObjectCommand instead of a plain HTTP request ensures that
 * proper AWS Signature V4 Authorization headers are sent, which is
 * required by t3.storageapi.dev even for objects with a public-read ACL.
 *
 * Security:
 *   - Only URLs whose hostname is t3.storageapi.dev are accepted.
 *   - The S3 key is extracted from the URL path; the bucket is taken
 *     from the BUCKET environment variable, not from the URL.
 *   - The response Content-Type is validated to be an image/* type.
 *   - A 24-hour Cache-Control header is set so repeated requests are
 *     served from the browser cache rather than hitting this proxy.
 */
router.get('/proxy', async (req, res) => {
  const rawUrl = req.query.url as string | undefined;

  if (!rawUrl) {
    return res.status(400).json({ error: 'Missing required query parameter: url' });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  // Security: only allow requests to the known S3-compatible endpoint
  if (
    targetUrl.hostname !== ALLOWED_PROXY_HOSTNAME &&
    !targetUrl.hostname.endsWith(`.${ALLOWED_PROXY_HOSTNAME}`)
  ) {
    return res.status(403).json({
      error: `Proxy only allows requests to ${ALLOWED_PROXY_HOSTNAME}`,
    });
  }

  if (!BUCKET) {
    console.error('ImageProxy: BUCKET environment variable is not set');
    return res.status(500).json({ error: 'S3 bucket configuration missing' });
  }

  // Extract the object key from the URL path.
  // The path may be /<bucket>/<key> (path-style) or just /<key> (virtual-host style).
  // Strip a leading slash and, if the first path segment matches the bucket name,
  // remove it so we always end up with just the object key.
  let key = targetUrl.pathname.replace(/^\//, '');
  if (key.startsWith(`${BUCKET}/`)) {
    key = key.slice(BUCKET.length + 1);
  }

  if (!key) {
    return res.status(400).json({ error: 'Could not determine S3 object key from URL' });
  }

  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const s3Response = await s3.send(command);

    const contentType: string = s3Response.ContentType || 'application/octet-stream';

    // Validate that the upstream response is actually an image
    if (!contentType.startsWith('image/')) {
      return res.status(502).json({
        error: `Upstream returned unexpected content type: ${contentType}`,
      });
    }

    // CORS — allow any origin so the browser can load the image
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    // Cache for 24 hours in the browser and at any intermediate CDN
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

    res.setHeader('Content-Type', contentType);

    // Stream the S3 body directly to the response for memory efficiency
    if (s3Response.Body instanceof Readable) {
      s3Response.Body.pipe(res);
    } else {
      // Fallback: collect the body as a buffer (handles non-Node stream types)
      const chunks: Uint8Array[] = [];
      for await (const chunk of s3Response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      res.status(200).send(Buffer.concat(chunks));
    }
  } catch (err: any) {
    const code: string | undefined = err.name || err.Code;
    console.error(
      `ImageProxy: failed to fetch key "${key}" from bucket "${BUCKET}" — ${err.message}`
    );

    if (code === 'NoSuchKey' || code === 'NotFound') {
      return res.status(404).json({ error: 'Image not found in S3 bucket' });
    }

    res.status(502).json({
      error: 'Failed to fetch image from upstream storage',
      detail: err.message,
    });
  }
});

export default router;
