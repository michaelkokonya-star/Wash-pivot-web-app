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
    let url = '';
    
    // Ensure no double slashes in endpoint
    const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    
    if (baseUrl.includes('digitaloceanspaces.com')) {
      // For DigitalOcean, path-style is safer for buckets with dots: https://region.digitaloceanspaces.com/bucket/key
      url = `${baseUrl}/${bucket}/${key}`;
    } else if (baseUrl.includes('amazonaws.com') && !baseUrl.includes(bucket)) {
      // For AWS, virtual-host style is often preferred but depends on configuration
      const parts = baseUrl.split('://');
      url = `${parts[0]}://${bucket}.${parts[1]}/${key}`;
    } else {
      // Fallback to path-style: https://endpoint/bucket/key
      url = `${baseUrl}/${bucket}/${key}`;
    }
    
    console.log('Successfully uploaded to S3:', url);
    res.json({ url });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
