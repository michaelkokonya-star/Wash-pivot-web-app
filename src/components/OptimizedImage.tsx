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

  // Function to optimize Unsplash/Picsum URLs
  const getOptimizedUrl = (url: string) => {
    if (!url) return `https://picsum.photos/seed/${encodeURIComponent(alt)}/800/600`;
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

      // Google Drive optimization
      if (urlObj.hostname.includes('drive.google.com')) {
        // Convert share link to direct view link
        // View URL: https://drive.google.com/file/d/[ID]/view?usp=sharing
        // Direct URL: https://drive.google.com/uc?export=view&id=[ID]
        if (urlObj.pathname.includes('/file/d/')) {
          const fileId = urlObj.pathname.split('/file/d/')[1].split('/')[0];
          return `https://drive.google.com/uc?export=view&id=${fileId}`;
        }
      }
    } catch (e) {
      return url;
    }
    
    return url;
  };

  const optimizedSrc = getOptimizedUrl(src);
  const fallbackImage = 'https://drive.google.com/uc?export=view&id=1P8CXvuVVGpLjQpS2wB7HPu3CHZiZEK2Q';

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
        src={hasError ? fallbackImage : optimizedSrc}
        alt={alt}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded || hasError ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          console.warn(`OptimizedImage failed to load: ${optimizedSrc}. Status: Access Denied or Network Error.`);
          const target = e.target as HTMLImageElement;
          target.src = 'https://via.placeholder.com/800x600?text=Access+Denied';
          setHasError(true);
        }}
        loading={priority ? "eager" : "lazy"}
        className={`w-full h-full object-cover ${className}`}
        {...(props as any)}
      />
    </div>
  );
};

export default OptimizedImage;
