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
  endpoint: process.env.ENDPOINT as string,
  forcePathStyle: true, // Use path-style for better compatibility
});

router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const key = `uploads/${Date.now()}-${req.file.originalname.replace(/\s+/g, '-')}`;
    const bucket = process.env.BUCKET || '';
    const region = process.env.REGION || 'us-east-1';
    let endpoint = process.env.ENDPOINT || `https://s3.${region}.amazonaws.com`;

    if (!bucket) {
      console.error('BUCKET environment variable is missing');
      return res.status(500).json({ error: 'S3 bucket configuration missing' });
    }

    console.log('Upload params:', {
      bucket,
      region,
      endpoint,
      publicUrl: process.env.PUBLIC_URL
    });

    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read', 
    }));
    
    // Construct URL based on endpoint and bucket
    if (endpoint && !endpoint.startsWith('http')) {
      endpoint = `https://${endpoint}`;
    }
    
    let url = '';
    
    // Ensure no double slashes in endpoint
    const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    
    // Check if hostname already includes the bucket (e.g. custom domain or pre-configured endpoint)
    const urlObj = new URL(baseUrl);
    const hostname = urlObj.hostname;
    
    // Use PUBLIC_URL if provided, else fallback to standard patterns
    if (process.env.PUBLIC_URL) {
      const publicUrl = process.env.PUBLIC_URL;
      const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
      console.log('Using PUBLIC_URL override:', cleanPublicUrl);
      url = `${cleanPublicUrl}/${cleanKey}`;
    } else if (hostname.includes('digitaloceanspaces.com')) {
      // DigitalOcean Spaces: Preferred style is https://bucket.region.digitaloceanspaces.com/key
      if (hostname.startsWith(`${bucket}.`)) {
        url = `${baseUrl}/${cleanKey}`;
      } else {
        url = `https://${bucket}.${hostname}/${cleanKey}`;
      }
    } else if (hostname.includes('amazonaws.com')) {
      // AWS S3: Always use virtual-host style for direct public access.
      // The bucket has a public read policy, so direct S3 URLs are served without proxying.
      // Virtual-host format: https://<bucket>.s3.<region>.amazonaws.com/<key>
      if (hostname.startsWith(`${bucket}.`)) {
        // Endpoint already includes the bucket name (e.g. bucket.s3.region.amazonaws.com)
        url = `${baseUrl}/${cleanKey}`;
      } else if (hostname === 's3.amazonaws.com') {
        url = `https://${bucket}.s3.amazonaws.com/${cleanKey}`;
      } else {
        // e.g. s3.us-east-1.amazonaws.com → bucket.s3.us-east-1.amazonaws.com
        url = `https://${bucket}.${hostname}/${cleanKey}`;
      }
    } else if (hostname.includes('r2.cloudflarestorage.com')) {
       // Cloudflare R2: Usually requires path-style for the API endpoint, 
       // but public access is usually via a custom domain. 
       // If no PUBLIC_URL, we default to path-style on the R2 endpoint.
       url = `${baseUrl}/${bucket}/${cleanKey}`;
    } else {
      // Generic S3: Default to path-style for widest compatibility
      url = `${baseUrl}/${bucket}/${cleanKey}`;
    }
    
    // Fallback: if we still don't have a URL or it looks invalid
    if (!url) {
      url = `${baseUrl}/${bucket}/${cleanKey}`;
    }
    
    console.log('Successfully uploaded to S3. Direct S3 URL:', url);
    res.json({ url });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
