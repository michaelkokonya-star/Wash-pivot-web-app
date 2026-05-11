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
  'washpivot-photos-zrwie7u.s3.amazonaws.com', // WashPivot S3 bucket (public-read)
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

/** Returns true when the hostname belongs to the WashPivot S3 bucket. */
const isS3Url = (hostname: string): boolean =>
  hostname === 'washpivot-photos-zrwie7u.s3.amazonaws.com';

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
   * 4. S3 bucket URL  → returned as-is (bucket has public-read ACL)
   * 5. Other trusted  → apply CDN-specific optimisations (Unsplash, Picsum, Drive)
   * 6. External, untrusted → routed through /api/images/proxy to avoid CORS issues
   */
  const getOptimizedUrl = (url: string): string => {
    if (!url) return `https://picsum.photos/seed/${encodeURIComponent(alt)}/800/600`;

    // Base64 / data URIs (e.g. GenAI output) — use directly
    if (url.startsWith('data:')) return url;

    // Relative URLs — served from the same origin, no transformation needed
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) return url;

    try {
      const urlObj = new URL(url);
      const { hostname } = urlObj;

      // ── S3 bucket (public-read) ──────────────────────────────────────────
      // Load directly; no proxy or transformation required.
      if (isS3Url(hostname)) {
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
    if (src && src.includes('s3.amazonaws.com')) {
      console.error(
        `OptimizedImage: S3 image failed to load — check bucket ACL / CORS policy.\n` +
        `  Original URL : ${src}\n` +
        `  Resolved URL : ${optimizedSrc}`
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
