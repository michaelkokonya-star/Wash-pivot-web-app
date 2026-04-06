import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 1, // Max size in MB
    maxWidthOrHeight: 1200, // Max width or height in pixels
    useWebWorker: true,
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
