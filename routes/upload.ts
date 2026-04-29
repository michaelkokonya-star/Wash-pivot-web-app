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
    let endpoint = process.env.ENDPOINT || '';
    if (endpoint && !endpoint.startsWith('http')) {
      endpoint = `https://${endpoint}`;
    }
    
    const bucket = process.env.BUCKET || '';
    const region = process.env.REGION || 'auto';
    let url = '';
    
    // Ensure no double slashes in endpoint
    const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const cleanKey = key.startsWith('/') ? key.slice(1) : key;
    
    if (baseUrl.includes('digitaloceanspaces.com')) {
      // DigitalOcean Spaces: Defaulting to virtual-host style if bucket has no dots, else path-style
      if (bucket.includes('.')) {
        url = `${baseUrl}/${bucket}/${cleanKey}`;
      } else {
        // Construct standard DO virtual host: https://bucket.region.digitaloceanspaces.com/key
        // Extract region from baseUrl if possible
        const urlObj = new URL(baseUrl);
        url = `https://${bucket}.${urlObj.hostname}/${cleanKey}`;
      }
    } else if (baseUrl.includes('amazonaws.com')) {
      // AWS S3: Often bucket.s3.region.amazonaws.com or s3.region.amazonaws.com/bucket
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
    } else {
      // Generic S3 / MinIO / Cloudflare R2
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
