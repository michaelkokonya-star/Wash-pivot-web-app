import express from 'express';
import { S3Client, GetObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const router = express.Router();

// Only proxy requests to this specific S3-compatible storage endpoint.
// Restricting to a known hostname prevents the proxy from being abused
// as an open relay for arbitrary external URLs.
const ALLOWED_PROXY_HOSTNAME = 't3.storageapi.dev';

// Re-use the same S3 client configuration as the upload route so that
// authenticated requests are made with the same credentials/endpoint.
const s3Config = {
  region: process.env.REGION as string,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID as string,
    secretAccessKey: process.env.SECRET_ACCESS_KEY as string,
  },
  ...(process.env.ENDPOINT ? { endpoint: process.env.ENDPOINT } : {}),
  forcePathStyle: false,
};

console.log('[ImageProxy] S3 client configuration:', {
  region: s3Config.region || '(not set)',
  endpoint: process.env.ENDPOINT || '(AWS default)',
  bucket: process.env.BUCKET || '(not set)',
  accessKeyId: process.env.ACCESS_KEY_ID
    ? `${process.env.ACCESS_KEY_ID.slice(0, 4)}…` // log prefix only — never log full key
    : '(not set)',
  secretAccessKey: process.env.SECRET_ACCESS_KEY ? '(set)' : '(not set)',
});

const s3 = new S3Client(s3Config);

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

  console.log(`[ImageProxy] GET /proxy called — url param: ${rawUrl ?? '(missing)'}`);

  if (!rawUrl) {
    console.warn('[ImageProxy] Rejected: missing url query parameter');
    return res.status(400).json({ error: 'Missing required query parameter: url' });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    console.warn(`[ImageProxy] Rejected: invalid URL — "${rawUrl}"`);
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  console.log(`[ImageProxy] Parsed URL — hostname: ${targetUrl.hostname}, pathname: ${targetUrl.pathname}`);

  // Security: only allow requests to the known S3-compatible endpoint
  if (
    targetUrl.hostname !== ALLOWED_PROXY_HOSTNAME &&
    !targetUrl.hostname.endsWith(`.${ALLOWED_PROXY_HOSTNAME}`)
  ) {
    console.warn(`[ImageProxy] Rejected: hostname "${targetUrl.hostname}" is not allowed (expected ${ALLOWED_PROXY_HOSTNAME})`);
    return res.status(403).json({
      error: `Proxy only allows requests to ${ALLOWED_PROXY_HOSTNAME}`,
    });
  }

  if (!BUCKET) {
    console.error('[ImageProxy] BUCKET environment variable is not set — cannot proxy request');
    return res.status(500).json({ error: 'S3 bucket configuration missing' });
  }

  // Extract the object key from the URL path.
  // The path may be /<bucket>/<key> (path-style) or just /<key> (virtual-host style).
  // Strip a leading slash and, if the first path segment matches the bucket name,
  // remove it so we always end up with just the object key.
  let key = targetUrl.pathname.replace(/^\//, '');
  const rawKey = key;
  if (key.startsWith(`${BUCKET}/`)) {
    key = key.slice(BUCKET.length + 1);
    console.log(`[ImageProxy] Stripped bucket prefix from path-style URL — raw: "${rawKey}", key: "${key}"`);
  } else {
    console.log(`[ImageProxy] Using pathname as key (no bucket prefix found) — key: "${key}"`);
  }

  if (!key) {
    console.warn(`[ImageProxy] Rejected: could not extract object key from pathname "${targetUrl.pathname}"`);
    return res.status(400).json({ error: 'Could not determine S3 object key from URL' });
  }

  const commandParams = { Bucket: BUCKET, Key: key };
  console.log('[ImageProxy] Sending GetObjectCommand:', commandParams);

  try {
    const command = new GetObjectCommand(commandParams);
    const s3Response = await s3.send(command);

    const contentType: string = s3Response.ContentType || 'application/octet-stream';
    console.log(`[ImageProxy] S3 response received — ContentType: ${contentType}, ContentLength: ${s3Response.ContentLength ?? 'unknown'}`);

    // Validate that the upstream response is actually an image
    if (!contentType.startsWith('image/')) {
      console.error(`[ImageProxy] Unexpected content type from S3: "${contentType}" for key "${key}"`);
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

    console.log(`[ImageProxy] Streaming response to client — key: "${key}", contentType: ${contentType}`);

    // Stream the S3 body directly to the response for memory efficiency
    if (s3Response.Body instanceof Readable) {
      s3Response.Body.pipe(res);
      s3Response.Body.on('end', () => {
        console.log(`[ImageProxy] Stream complete — key: "${key}"`);
      });
      s3Response.Body.on('error', (streamErr) => {
        console.error(`[ImageProxy] Stream error for key "${key}":`, streamErr);
      });
    } else {
      // Fallback: collect the body as a buffer (handles non-Node stream types)
      const chunks: Uint8Array[] = [];
      for await (const chunk of s3Response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);
      console.log(`[ImageProxy] Buffered response — key: "${key}", bytes: ${buffer.byteLength}`);
      res.status(200).send(buffer);
    }
  } catch (err: any) {
    const code: string | undefined = err.name || err.Code;
    console.error(
      `[ImageProxy] ERROR fetching key "${key}" from bucket "${BUCKET}"\n` +
      `  Error name    : ${err.name}\n` +
      `  Error code    : ${err.Code ?? err.$metadata?.httpStatusCode ?? 'n/a'}\n` +
      `  HTTP status   : ${err.$metadata?.httpStatusCode ?? 'n/a'}\n` +
      `  Message       : ${err.message}\n` +
      `  Request ID    : ${err.$metadata?.requestId ?? 'n/a'}\n` +
      `  Endpoint used : ${process.env.ENDPOINT || '(AWS default)'}\n` +
      `  Bucket        : ${BUCKET}\n` +
      `  Key           : ${key}`
    );

    if (code === 'NoSuchKey' || code === 'NotFound') {
      return res.status(404).json({ error: 'Image not found in S3 bucket' });
    }

    if (code === 'NoSuchBucket') {
      return res.status(502).json({
        error: 'S3 bucket not found — check BUCKET environment variable',
        detail: err.message,
      });
    }

    if (code === 'InvalidAccessKeyId' || code === 'SignatureDoesNotMatch') {
      return res.status(502).json({
        error: 'S3 authentication failed — check ACCESS_KEY_ID and SECRET_ACCESS_KEY',
        detail: err.message,
      });
    }

    res.status(502).json({
      error: 'Failed to fetch image from upstream storage',
      detail: err.message,
    });
  }
});

/**
 * GET /api/images/health
 *
 * Returns the current S3 configuration status and tests connectivity to the
 * bucket by issuing a HeadBucket request.  Useful for verifying that all
 * environment variables are set correctly and that the S3 client can reach
 * the storage endpoint before attempting to proxy real image requests.
 *
 * Response shape:
 *   { config: { … }, connectivity: { ok: boolean, error?: string } }
 */
router.get('/health', async (_req, res) => {
  console.log('[ImageProxy] GET /health called');

  const config = {
    region: process.env.REGION || '(not set)',
    endpoint: process.env.ENDPOINT || '(AWS default)',
    bucket: BUCKET || '(not set)',
    accessKeyId: process.env.ACCESS_KEY_ID
      ? `${process.env.ACCESS_KEY_ID.slice(0, 4)}…`
      : '(not set)',
    secretAccessKey: process.env.SECRET_ACCESS_KEY ? 'set' : 'not set',
    allowedProxyHostname: ALLOWED_PROXY_HOSTNAME,
  };

  console.log('[ImageProxy] Health check — config:', config);

  let connectivity: { ok: boolean; error?: string; httpStatus?: number } = { ok: false };

  if (!BUCKET) {
    connectivity = { ok: false, error: 'BUCKET environment variable is not set' };
    console.warn('[ImageProxy] Health check: BUCKET not configured');
  } else {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
      connectivity = { ok: true };
      console.log(`[ImageProxy] Health check: HeadBucket succeeded for "${BUCKET}"`);
    } catch (err: any) {
      const httpStatus: number | undefined = err.$metadata?.httpStatusCode;
      const errMsg = `${err.name}: ${err.message}`;
      connectivity = { ok: false, error: errMsg, httpStatus };
      console.error(
        `[ImageProxy] Health check: HeadBucket FAILED for "${BUCKET}"\n` +
        `  Error name  : ${err.name}\n` +
        `  HTTP status : ${httpStatus ?? 'n/a'}\n` +
        `  Message     : ${err.message}\n` +
        `  Request ID  : ${err.$metadata?.requestId ?? 'n/a'}`
      );
    }
  }

  const statusCode = connectivity.ok ? 200 : 502;
  res.status(statusCode).json({ config, connectivity });
});

export default router;
