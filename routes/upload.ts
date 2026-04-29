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
    await s3.send(new PutObjectCommand({
      Bucket: process.env.BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read', // Try to make it public if allowed
    }));
    
    // Construct URL based on endpoint and bucket
    const region = process.env.REGION || 'us-east-1';
    const bucket = process.env.BUCKET || '';
    let endpoint = process.env.ENDPOINT || `https://s3.${region}.amazonaws.com`;
    
    if (endpoint && !endpoint.startsWith('http')) {
      endpoint = `https://${endpoint}`;
    }
    
    let url = '';
    
    // Ensure no double slashes in endpoint
    const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    
    if (baseUrl.includes('digitaloceanspaces.com')) {
      // DigitalOcean Spaces: https://bucket.region.digitaloceanspaces.com/key
      const urlObj = new URL(baseUrl);
      if (urlObj.hostname.includes(bucket)) {
        url = `${baseUrl}/${cleanKey}`;
      } else {
        url = `https://${bucket}.${urlObj.hostname}/${cleanKey}`;
      }
    } else if (baseUrl.includes('amazonaws.com')) {
      // AWS S3: https://bucket.s3.region.amazonaws.com/key or https://s3.region.amazonaws.com/bucket/key
      // Note: For newer regions, the regional endpoint is preferred.
      if (baseUrl.includes(bucket)) {
        url = `${baseUrl}/${cleanKey}`;
      } else {
        const urlObj = new URL(baseUrl);
        if (urlObj.hostname.startsWith('s3.')) {
          url = `https://${bucket}.${urlObj.hostname}/${cleanKey}`;
        } else {
          url = `${baseUrl}/${bucket}/${cleanKey}`;
        }
      }
    } else if (baseUrl.includes('r2.cloudflarestorage.com')) {
       // Cloudflare R2: Public access usually requires a custom domain or pub-<hash>.r2.dev
       // If no PUBLIC_URL is provided, we fallback to the endpoint path (which might not work publicly)
       const publicUrl = process.env.PUBLIC_URL || baseUrl;
       const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
       url = `${cleanPublicUrl}/${bucket}/${cleanKey}`;
    } else {
      // Generic S3 / MinIO / Custom
      url = `${baseUrl}/${bucket}/${cleanKey}`;
    }
    
    console.log('Successfully uploaded to S3:', url);
    res.json({ url });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
