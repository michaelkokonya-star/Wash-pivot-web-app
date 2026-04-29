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
    console.log('Upload params:', {
      bucket: process.env.BUCKET,
      region: process.env.REGION,
      endpoint: process.env.ENDPOINT,
      publicUrl: process.env.PUBLIC_URL
    });

    await s3.send(new PutObjectCommand({
      Bucket: process.env.BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      ACL: 'public-read', 
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
    
    // Use PUBLIC_URL if provided, else fallback to standard patterns
    if (process.env.PUBLIC_URL) {
      const publicUrl = process.env.PUBLIC_URL;
      const cleanPublicUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
      console.log('Using PUBLIC_URL override:', cleanPublicUrl);
      url = `${cleanPublicUrl}/${cleanKey}`;
    } else if (baseUrl.includes('digitaloceanspaces.com')) {
      // DigitalOcean Spaces: https://bucket.region.digitaloceanspaces.com/key
      const urlObj = new URL(baseUrl);
      if (urlObj.hostname.includes(bucket)) {
        console.log('DO: Horizontal style already in baseUrl');
        url = `${baseUrl}/${cleanKey}`;
      } else {
        console.log('DO: Constructing virtual-host URL');
        url = `https://${bucket}.${urlObj.hostname}/${cleanKey}`;
      }
    } else if (baseUrl.includes('amazonaws.com')) {
      // AWS S3: https://bucket.s3.region.amazonaws.com/key or https://s3.region.amazonaws.com/bucket/key
      if (baseUrl.includes(bucket)) {
        console.log('AWS: Bucket already in baseUrl');
        url = `${baseUrl}/${cleanKey}`;
      } else {
        const urlObj = new URL(baseUrl);
        if (urlObj.hostname.startsWith('s3.')) {
          console.log('AWS: Constructing virtual-host URL');
          url = `https://${bucket}.${urlObj.hostname}/${cleanKey}`;
        } else {
          console.log('AWS: Falling back to path-style');
          url = `${baseUrl}/${bucket}/${cleanKey}`;
        }
      }
    } else if (baseUrl.includes('r2.cloudflarestorage.com')) {
       console.log('Cloudflare R2 detected');
       url = `${baseUrl}/${bucket}/${cleanKey}`;
    } else {
      console.log('Generic/Custom S3 provider');
      url = `${baseUrl}/${bucket}/${cleanKey}`;
    }
    
    console.log('Successfully uploaded to S3. Final URL:', url);
    res.json({ url });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
