import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * Image proxy route — fetches external images server-side to avoid CORS
 * and browser restrictions on Google Drive / other CDN links.
 *
 * Usage: GET /api/images/proxy?url=<encoded-image-url>
 *
 * Supports:
 *   - Google Drive share links:  drive.google.com/file/d/{id}/view
 *   - Google Drive direct links: drive.google.com/uc?export=view&id={id}
 *   - lh3.googleusercontent.com CDN links
 *   - Any other publicly accessible image URL
 */
router.get('/proxy', async (req, res) => {
  const rawUrl = req.query.url as string;

  if (!rawUrl) {
    return res.status(400).json({ error: 'Missing required query parameter: url' });
  }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(rawUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL encoding' });
  }

  // Normalise Google Drive share links → direct download URL
  try {
    const urlObj = new URL(targetUrl);

    if (urlObj.hostname.includes('drive.google.com')) {
      if (urlObj.pathname.includes('/file/d/')) {
        const fileId = urlObj.pathname.split('/file/d/')[1].split('/')[0];
        targetUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
      }
    }

    // lh3.googleusercontent.com/d/{id} → drive uc link
    if (
      urlObj.hostname === 'lh3.googleusercontent.com' &&
      urlObj.pathname.startsWith('/d/')
    ) {
      const fileId = urlObj.pathname.split('/d/')[1].split('/')[0];
      targetUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  } catch {
    // Not a valid URL — let axios fail naturally with a useful error
  }

  try {
    const response = await axios.get(targetUrl, {
      responseType: 'stream',
      timeout: 15000,
      headers: {
        // Mimic a browser request so Google Drive doesn't block us
        'User-Agent':
          'Mozilla/5.0 (compatible; WashPivot-ImageProxy/1.0)',
        Accept: 'image/*,*/*;q=0.8',
      },
      maxRedirects: 5,
    });

    const contentType: string =
      (response.headers['content-type'] as string) || 'image/jpeg';

    // Only proxy image content types
    if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
      return res.status(400).json({ error: 'URL does not point to an image' });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache for 1 day
    res.setHeader('Access-Control-Allow-Origin', '*');

    response.data.pipe(res);
  } catch (err: any) {
    console.error('Image proxy error:', err.message);
    res.status(502).json({ error: 'Failed to fetch image', details: err.message });
  }
});

export default router;
