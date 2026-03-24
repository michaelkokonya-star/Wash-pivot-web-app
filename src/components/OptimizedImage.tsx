import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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

  // Function to optimize Unsplash/Picsum URLs
  const getOptimizedUrl = (url: string) => {
    if (!url) return url;
    if (url.startsWith('data:')) return url; // Base64 images (like GenAI output)

    try {
      const urlObj = new URL(url);
      
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
        // Picsum format is usually /seed/id/width/height
        // If it's a seed URL, we can try to adjust the dimensions if they are at the end
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
    } catch (e) {
      return url;
    }
    
    return url;
  };

  const optimizedSrc = getOptimizedUrl(src);

  return (
    <div className={`relative overflow-hidden ${className}`}>
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
            className="absolute inset-0 bg-stone-200 flex items-center justify-center z-10"
          >
            <span className="text-xs text-black/30 font-mono uppercase tracking-widest">Image Unavailable</span>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.img
        src={optimizedSrc}
        alt={alt}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setHasError(true);
          setIsLoaded(false);
        }}
        loading={priority ? "eager" : "lazy"}
        // @ts-ignore - fetchPriority is supported in React 18.2+ but might be missing from some type definitions
        fetchPriority={priority ? "high" : "auto"}
        className={`w-full h-full object-cover ${className}`}
        referrerPolicy="no-referrer"
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;
