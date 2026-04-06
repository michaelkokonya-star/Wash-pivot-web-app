import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 0.2, // Reduced from 1MB to 200KB for much faster uploads
    maxWidthOrHeight: 1024, // Reduced from 1200 to 1024
    useWebWorker: true,
    initialQuality: 0.7, // Added initial quality to speed up compression
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // Return original file if compression fails
  }
};

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
};
