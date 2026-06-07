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

  // Function to get a beautiful, contextual Unsplash fallback based on product names
  const getCategoryFallback = (altText: string) => {
    const text = altText ? altText.toLowerCase() : '';
    if (text.includes('solar') || text.includes('panel') || text.includes('battery') || text.includes('inverter') || text.includes('charge')) {
      return 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=800';
    }
    if (text.includes('water') || text.includes('filter') || text.includes('treatment') || text.includes('chlorin') || text.includes('fluoride')) {
      return 'https://images.unsplash.com/photo-1617155093730-a8bf47be792d?auto=format&fit=crop&q=80&w=800';
    }
    if (text.includes('sanitation') || text.includes('exhaust') || text.includes('toilet') || text.includes('vacuum') || text.includes('waste')) {
      return 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800';
    }
    if (text.includes('expert') || text.includes('consultant') || text.includes('install') || text.includes('service') || text.includes('engineer')) {
      return 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=800';
    }
    // Standard generic clean fallback
    return 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800';
  };

  // Function to optimize Unsplash/Picsum/Google Drive/S3 URLs
  const getOptimizedUrl = (url: string) => {
    if (!url) return getCategoryFallback(alt);
    if (url.startsWith('data:')) return url; // Base64 images
    if (url.startsWith('/') || url.startsWith('http://localhost') || url.startsWith('https://localhost')) return url;

    try {
      const urlObj = new URL(url);

      // S3 / storageapi.dev — proxy through backend to avoid CORS/auth issues
      if (urlObj.hostname.includes('storageapi.dev')) {
        // Path format: /<bucket>/uploads/filename  →  key = uploads/filename
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        // pathParts[0] is the bucket name; the rest is the object key
        const key = pathParts.slice(1).join('/');
        console.log(`[OptimizedImage] S3 URL detected (${urlObj.hostname}), proxying key="${key}" via /api/images/proxy`);
        return `/api/images/proxy?key=${encodeURIComponent(key)}`;
      }

      // Unsplash optimization
      if (urlObj.hostname.includes('unsplash.com')) {
        urlObj.searchParams.set('auto', 'format');
        urlObj.searchParams.set('fit', 'crop');
        urlObj.searchParams.set('q', quality.toString());
        if (width) urlObj.searchParams.set('w', width.toString());
        if (height) urlObj.searchParams.set('h', height.toString());
        return urlObj.toString();
      }

      // Picsum optimization
      if (urlObj.hostname.includes('picsum.photos')) {
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

      // Google Drive optimization - proxy through backend server to bypass iframe block
      if (urlObj.hostname.includes('drive.google.com') || urlObj.hostname.includes('docs.google.com')) {
        let fileId = '';
        if (urlObj.pathname.includes('/file/d/')) {
          fileId = urlObj.pathname.split('/file/d/')[1].split('/')[0];
        } else if (urlObj.searchParams.has('id')) {
          fileId = urlObj.searchParams.get('id') || '';
        }
        
        if (fileId) {
          const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
          return `/api/proxy-image?url=${encodeURIComponent(directUrl)}`;
        }
      }
    } catch (e) {
      return url;
    }
    
    return url;
  };

  const optimizedSrc = getOptimizedUrl(src);
  const fallbackImage = getCategoryFallback(alt);

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
                <ImageIcon className="text-black/15 font-bold" size={24} />
              </div>
              <span className="text-[10px] text-black/40 font-bold uppercase tracking-widest leading-tight">Image<br/>Unavailable</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.img
        src={hasError ? fallbackImage : optimizedSrc}
        alt={alt}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          const isS3Proxy = optimizedSrc.startsWith('/api/images/proxy');
          console.warn(
            `[OptimizedImage] Failed to load${isS3Proxy ? ' (via S3 proxy)' : ''}: ${optimizedSrc}` +
            ` — original src: ${src}. Falling back to category image.`
          );
          setHasError(true);
          setIsLoaded(true); // Stop loading state
        }}
        loading={priority ? "eager" : "lazy"}
        className={`w-full h-full object-cover ${className}`}
        {...(props as any)}
      />
    </div>
  );
};

export default OptimizedImage;
