import express from 'express';
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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
  // Only pass a custom endpoint when explicitly configured (e.g. MinIO, DO Spaces).
  // For standard AWS S3 the SDK derives the correct endpoint from the region.
  ...(process.env.ENDPOINT ? { endpoint: process.env.ENDPOINT } : {}),
  // Virtual-host style is required for public-read bucket URLs on AWS S3.
  // Path-style is deprecated for new AWS buckets and causes CORS/ACL issues.
  forcePathStyle: false,
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const key = `uploads/${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
    const bucket = process.env.BUCKET || '';
    const region = process.env.REGION || 'us-east-1';

    if (!bucket) {
      console.error('BUCKET environment variable is missing');
      return res.status(500).json({ error: 'S3 bucket configuration missing' });
    }

    console.log('Upload params:', {
      bucket,
      region,
      key,
      publicUrl: process.env.PUBLIC_URL || '(none)',
      endpoint: process.env.ENDPOINT || '(AWS default)',
    });

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read',
      // CORS note: the S3 bucket must have a CORS policy that allows GET from
      // the app's origin. Apply it via the AWS console or CLI:
      //   aws s3api put-bucket-cors --bucket <bucket> --cors-configuration file://s3-cors.json
      // Minimum required rule: AllowedOrigins ["*"], AllowedMethods ["GET","HEAD"]
    }));

    // Build the public URL for the uploaded object.
    //
    // Priority order:
    //   1. PUBLIC_URL env var  – explicit override (custom domain, CDN, etc.)
    //   2. Custom ENDPOINT     – DigitalOcean Spaces, Cloudflare R2, MinIO, etc.
    //   3. AWS S3 (default)    – virtual-host style: https://<bucket>.s3.<region>.amazonaws.com/<key>
    //
    // AWS virtual-host style is the recommended format and is required for
    // public-read ACL to work correctly. Path-style URLs
    // (s3.<region>.amazonaws.com/<bucket>/<key>) are deprecated for new buckets
    // and can return "Access Denied" even with a public-read ACL because AWS
    // applies Block Public Access settings differently per URL style.

    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    let url = '';

    if (process.env.PUBLIC_URL) {
      // Explicit override – strip trailing slash to avoid double-slash
      const base = process.env.PUBLIC_URL.replace(/\/$/, '');
      url = `${base}/${cleanKey}`;
      console.log('Using PUBLIC_URL override:', url);
    } else if (process.env.ENDPOINT) {
      // Custom endpoint (DO Spaces, MinIO, R2, etc.)
      let endpoint = process.env.ENDPOINT;
      if (!endpoint.startsWith('http')) endpoint = `https://${endpoint}`;
      const base = endpoint.replace(/\/$/, '');
      const endpointHostname = new URL(base).hostname;

      if (endpointHostname.includes('digitaloceanspaces.com')) {
        // DO Spaces virtual-host CDN URL: https://<bucket>.<region>.cdn.digitaloceanspaces.com/<key>
        if (endpointHostname.startsWith(`${bucket}.`)) {
          url = `${base}/${cleanKey}`;
        } else {
          url = `https://${bucket}.${endpointHostname}/${cleanKey}`;
        }
      } else if (endpointHostname.includes('r2.cloudflarestorage.com')) {
        // R2 has no native public URL without a custom domain; use path-style on the endpoint
        url = `${base}/${bucket}/${cleanKey}`;
      } else if (endpointHostname.includes('amazonaws.com')) {
        // Custom AWS endpoint – build virtual-host URL from it
        if (endpointHostname.startsWith(`${bucket}.`)) {
          url = `${base}/${cleanKey}`;
        } else {
          url = `https://${bucket}.${endpointHostname}/${cleanKey}`;
        }
      } else {
        // Unknown provider – fall back to path-style on the custom endpoint
        url = `${base}/${bucket}/${cleanKey}`;
      }
    } else {
      // Standard AWS S3 – always use virtual-host style so public-read ACL is honoured
      url = `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
    }

    console.log('Successfully uploaded to S3. Final URL:', url);
    res.json({ url });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
