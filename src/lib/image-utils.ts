import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
  // If file is already small (under 400KB), skip compression to save time
  if (file.size < 400 * 1024) {
    return file;
  }

  const options = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    initialQuality: 0.6, // Lowered initial quality for faster processing
    maxIteration: 3, // Limit iterations to prevent hanging on compression
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
