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
    
    // Ensure no double slashes when joining
    const baseUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const bucket = process.env.BUCKET || '';
    
    // Most S3 compatible providers support: https://{bucket}.{endpoint}/{key}
    // and https://{endpoint}/{bucket}/{key}
    // We'll stick to a robust path-style but ensure it's a full URL
    const url = `${baseUrl}/${bucket}/${key}`;
    
    console.log('Successfully uploaded to S3:', url);
    res.json({ url });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
