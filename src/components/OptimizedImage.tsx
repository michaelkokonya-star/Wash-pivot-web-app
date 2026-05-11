import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon } from 'lucide-react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  quality?: number;
}

/**
 * Domains that can be loaded directly without proxying.
 * - S3 bucket has public-read ACL, so no proxy needed.
 * - Well-known CDNs are safe to load directly.
 */
const TRUSTED_DOMAINS = [
  // WashPivot S3 bucket – virtual-host style (preferred, public-read ACL)
  'washpivot-photos-zrwie7u.s3.amazonaws.com',
  // Catch any region-specific virtual-host variant, e.g. .s3.us-east-1.amazonaws.com
  's3.amazonaws.com',
  'amazonaws.com',
  // Custom S3-compatible storage endpoint used by WashPivot (t3.storage)
  't3.storageapi.dev',
  'unsplash.com',
  'images.unsplash.com',
  'picsum.photos',
  'drive.google.com',
  'ui-avatars.com',
];

/** Returns true when the hostname matches a trusted domain (exact or subdomain). */
const isTrustedDomain = (hostname: string): boolean =>
  TRUSTED_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

/**
 * Returns true for any AWS S3 URL – both virtual-host style
 * (bucket.s3.region.amazonaws.com) and legacy path-style
 * (s3.region.amazonaws.com/bucket/...).
 */
const isS3Url = (hostname: string): boolean =>
  hostname.endsWith('.amazonaws.com') && hostname.includes('s3');

/**
 * Returns true for custom S3-compatible storage endpoints that use path-style
 * URLs (https://endpoint/bucket/key), such as t3.storageapi.dev.
 * These endpoints serve objects directly and do not need proxying.
 */
const isCustomS3Endpoint = (hostname: string): boolean =>
  hostname === 't3.storageapi.dev' || hostname.endsWith('.t3.storageapi.dev');

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = "",
  width,
  height,
  priority = false,
  quality = 80,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  /**
   * Resolves the best URL to use for a given image source:
   *
   * 1. Empty / falsy  → Picsum placeholder
   * 2. data: URI      → returned as-is (GenAI / base64 output)
   * 3. Relative URL   → returned as-is (served from same origin)
   * 4. S3 bucket URL  → normalised to virtual-host style (bucket has public-read ACL)
   * 5. Other trusted  → apply CDN-specific optimisations (Unsplash, Picsum, Drive)
   * 6. External, untrusted → routed through /api/images/proxy to avoid CORS issues
   */
  const getOptimizedUrl = (url: string): string => {
    if (!url) return `https://picsum.photos/seed/${encodeURIComponent(alt)}/800/600`;

    // Base64 / data URIs (e.g. GenAI output) — use directly
    if (url.startsWith('data:')) return url;

    // Relative URLs — served from the same origin, no transformation needed
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return url;

    console.debug(`OptimizedImage: resolving URL for "${alt}"`, { src: url });

    try {
      const urlObj = new URL(url);
      const { hostname } = urlObj;

      // ── S3 bucket (public-read) ──────────────────────────────────────────
      // Normalise to virtual-host style so the public-read ACL is honoured.
      // Path-style URLs (s3.region.amazonaws.com/bucket/key) are deprecated
      // for new AWS buckets and may return "Access Denied" even with a
      // public-read ACL.  Virtual-host style (bucket.s3.region.amazonaws.com/key)
      // is the AWS-recommended format.
      if (isS3Url(hostname)) {
        // Detect legacy path-style: hostname is exactly s3.amazonaws.com or
        // s3.<region>.amazonaws.com (no bucket prefix in the hostname).
        const isPathStyle =
          hostname === 's3.amazonaws.com' ||
          /^s3\.[a-z0-9-]+\.amazonaws\.com$/.test(hostname);

        if (isPathStyle) {
          // Path-style: /<bucket>/<key...>  →  virtual-host: <bucket>.s3.<region>.amazonaws.com/<key>
          const pathParts = urlObj.pathname.replace(/^\//, '').split('/');
          const bucket = pathParts[0];
          const objectKey = pathParts.slice(1).join('/');
          // Preserve the region from the hostname when present, else default to us-east-1
          const regionMatch = hostname.match(/^s3\.([a-z0-9-]+)\.amazonaws\.com$/);
          const region = regionMatch ? regionMatch[1] : 'us-east-1';
          const virtualHostUrl = `https://${bucket}.s3.${region}.amazonaws.com/${objectKey}`;
          console.info(
            `OptimizedImage: rewrote path-style S3 URL to virtual-host style.\n` +
            `  Path-style    : ${url}\n` +
            `  Virtual-host  : ${virtualHostUrl}`
          );
          return virtualHostUrl;
        }

        // Already virtual-host style — use directly
        console.debug(`OptimizedImage: S3 virtual-host URL accepted as-is: ${url}`);
        return urlObj.toString();
      }

      // ── Custom S3-compatible endpoint (t3.storageapi.dev) ────────────────
      // These endpoints use path-style URLs: https://endpoint/bucket/key.
      // The bucket has public-read ACL so objects are served directly —
      // no proxy or URL rewriting needed.
      if (isCustomS3Endpoint(hostname)) {
        console.info(
          `OptimizedImage: custom S3-compatible endpoint detected.\n` +
          `  Endpoint : ${hostname}\n` +
          `  URL      : ${url}`
        );
        return urlObj.toString();
      }

      // ── Unsplash ─────────────────────────────────────────────────────────
      if (hostname.includes('unsplash.com')) {
        urlObj.searchParams.set('auto', 'format');
        urlObj.searchParams.set('fit', 'crop');
        urlObj.searchParams.set('q', quality.toString());
        if (width) urlObj.searchParams.set('w', width.toString());
        if (height) urlObj.searchParams.set('h', height.toString());
        return urlObj.toString();
      }

      // ── Picsum ───────────────────────────────────────────────────────────
      if (hostname.includes('picsum.photos')) {
        const parts = urlObj.pathname.split('/');
        if (parts.length >= 4 && !isNaN(Number(parts[parts.length - 1]))) {
          if (width && height) {
            parts[parts.length - 2] = width.toString();
            parts[parts.length - 1] = height.toString();
          } else if (width) {
            parts[parts.length - 2] = width.toString();
            parts[parts.length - 1] = width.toString();
          }
          urlObj.pathname = parts.join('/');
        }
        return urlObj.toString();
      }

      // ── Google Drive ─────────────────────────────────────────────────────
      // Convert share links to direct-view links.
      if (hostname.includes('drive.google.com')) {
        if (urlObj.pathname.includes('/file/d/')) {
          const fileId = urlObj.pathname.split('/file/d/')[1].split('/')[0];
          return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
        return urlObj.toString();
      }

      // ── ui-avatars.com ───────────────────────────────────────────────────
      if (hostname === 'ui-avatars.com') {
        return urlObj.toString();
      }

      // ── External, untrusted domain ───────────────────────────────────────
      // Route through the server-side proxy to avoid CORS / mixed-content errors.
      if (!isTrustedDomain(hostname)) {
        console.info(`OptimizedImage: routing untrusted domain "${hostname}" through image proxy`);
        return `/api/images/proxy?url=${encodeURIComponent(url)}`;
      }

      return urlObj.toString();
    } catch {
      // Malformed URL — return as-is and let the browser handle it
      return url;
    }
  };

  const optimizedSrc = getOptimizedUrl(src);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;

    // Distinguish error type for better diagnostics
    if (src && src.includes('t3.storageapi.dev')) {
      console.error(
        `OptimizedImage: custom S3-compatible endpoint image failed to load.\n` +
        `  Original URL : ${src}\n` +
        `  Resolved URL : ${optimizedSrc}\n` +
        `  Checklist:\n` +
        `    1. Bucket ACL  – object must have public-read ACL (set on upload via PutObjectCommand ACL: 'public-read')\n` +
        `    2. CORS        – bucket needs a CORS rule: AllowedOrigins ["*"], AllowedMethods ["GET","HEAD"]\n` +
        `    3. Endpoint    – verify ENDPOINT env var is set to https://t3.storageapi.dev\n` +
        `    4. Bucket name – verify BUCKET env var matches the bucket in the URL path`
      );
    } else if (src && src.includes('amazonaws.com')) {
      console.error(
        `OptimizedImage: S3 image failed to load.\n` +
        `  Original URL : ${src}\n` +
        `  Resolved URL : ${optimizedSrc}\n` +
        `  Checklist:\n` +
        `    1. Bucket ACL  – object must have public-read ACL (set on upload via PutObjectCommand ACL: 'public-read')\n` +
        `    2. Block Public Access – all four "Block Public Access" settings must be OFF in the S3 console\n` +
        `    3. Bucket policy – add a policy granting s3:GetObject to Principal "*" for arn:aws:s3:::${src.split('.s3.')[0].replace('https://', '')}/*\n` +
        `    4. CORS – bucket needs a CORS rule: AllowedOrigins ["*"], AllowedMethods ["GET","HEAD"]\n` +
        `    5. URL style – virtual-host (bucket.s3.region.amazonaws.com) is required; path-style is deprecated`
      );
    } else if (optimizedSrc.startsWith('/api/images/proxy')) {
      console.error(
        `OptimizedImage: proxy request failed.\n` +
        `  Proxy URL    : ${optimizedSrc}\n` +
        `  Original URL : ${src}`
      );
    } else {
      console.warn(
        `OptimizedImage: failed to load image.\n` +
        `  Resolved URL : ${optimizedSrc}\n` +
        `  Original URL : ${src}`
      );
    }

    // Prevent infinite error loop if the placeholder itself fails
    if (!target.src.includes('picsum.photos/seed/error')) {
      target.src = `https://picsum.photos/seed/error-${encodeURIComponent(alt)}/800/600`;
    }
    setHasError(true);
  };

  return (
    <div 
      className={`relative overflow-hidden bg-stone-100 ${className}`}
      style={{ minHeight: height ? `${height}px` : '200px' }}
    >
      <AnimatePresence>
        {!isLoaded && !hasError && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-100 animate-pulse z-10"
          />
        )}
        {hasError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-stone-100 flex items-center justify-center z-10 p-4 text-center border-2 border-stone-200 rounded-3xl"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-black/5">
                <ImageIcon className="text-black/10" size={24} />
              </div>
              <span className="text-[10px] text-black/30 font-bold uppercase tracking-widest leading-tight">Image<br/>Unavailable</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.img
        src={optimizedSrc}
        alt={alt}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded || hasError ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
        loading={priority ? "eager" : "lazy"}
        className={`w-full h-full object-cover ${className}`}
        {...(props as any)}
      />
    </div>
  );
};

export default OptimizedImage;
