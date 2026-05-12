import express from 'express';
import axios from 'axios';

const router = express.Router();

// Only proxy requests to this specific S3-compatible storage endpoint.
// Restricting to a known hostname prevents the proxy from being abused
// as an open relay for arbitrary external URLs.
const ALLOWED_PROXY_HOSTNAME = 't3.storageapi.dev';

/**
 * GET /api/images/proxy?url=<encoded-url>
 *
 * Fetches an image from t3.storageapi.dev and re-serves it with CORS
 * headers so the browser can display it without a CORS error.
 *
 * Security:
 *   - Only URLs whose hostname is t3.storageapi.dev are accepted.
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

  try {
    const upstream = await axios.get(targetUrl.toString(), {
      responseType: 'arraybuffer',
      timeout: 15_000,
      headers: {
        // Forward a neutral User-Agent so the storage endpoint doesn't reject the request
        'User-Agent': 'WashPivot-ImageProxy/1.0',
      },
    });

    const contentType: string = upstream.headers['content-type'] || 'application/octet-stream';

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
    res.status(200).send(Buffer.from(upstream.data));
  } catch (err: any) {
    const status: number = err.response?.status;
    console.error(
      `ImageProxy: failed to fetch "${targetUrl.toString()}" — ` +
        (status ? `upstream returned HTTP ${status}` : err.message)
    );

    if (status === 404) {
      return res.status(404).json({ error: 'Image not found at the upstream URL' });
    }

    res.status(502).json({
      error: 'Failed to fetch image from upstream storage',
      detail: err.message,
    });
  }
});

export default router;
