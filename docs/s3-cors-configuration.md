# S3 CORS Configuration — washpivot-photos-zrwie7u

The WashPivot S3 bucket serves uploaded images directly to browsers. To allow
the frontend to load images without CORS errors, apply the following CORS policy
to the bucket via the AWS Console or CLI.

## Bucket Policy (Public Read)

The bucket already has a public read policy (`s3:GetObject` for all principals).
This allows browsers to fetch images directly without authentication.

## CORS Configuration

Apply this JSON configuration under **S3 → Bucket → Permissions → Cross-origin
resource sharing (CORS)**:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": [
      "https://washpivot-hub.up.railway.app",
      "https://*.washpivot.com",
      "http://localhost:3000",
      "http://localhost:5173"
    ],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 86400
  }
]
```

### Apply via AWS CLI

```bash
aws s3api put-bucket-cors \
  --bucket washpivot-photos-zrwie7u \
  --cors-configuration file://s3-cors.json
```

Where `s3-cors.json` contains the JSON array above.

## How Image Serving Works

| Image source          | Serving method                          |
|-----------------------|-----------------------------------------|
| S3 uploads            | Direct S3 URL (no server proxy)         |
| Unsplash              | Direct URL with CDN optimisation params |
| Picsum                | Direct URL with dimension params        |
| Other external URLs   | Proxied via `/api/image-proxy`          |
| Base64 / data URIs    | Inline (no network request)             |

Direct S3 URLs follow the virtual-host format:

```
https://washpivot-photos-zrwie7u.s3.amazonaws.com/uploads/<timestamp>-<filename>
```

## Benefits

- **Reduced server load** — uploaded images are fetched directly from S3, not
  streamed through the Express server.
- **Lower latency** — S3 is geographically distributed; the proxy adds an
  unnecessary round-trip.
- **Scalability** — S3 handles bandwidth independently of the Railway instance.
- **CORS safety** — untrusted external image URLs are still proxied through
  `/api/image-proxy` to avoid browser CORS restrictions.
