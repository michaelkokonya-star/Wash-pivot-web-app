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
    console.log(`Compressing image: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    const compressedFile = await imageCompression(file, options);
    console.log(`Compression complete: ${(compressedFile.size / 1024).toFixed(2)} KB`);
    return compressedFile;
  } catch (error) {
    console.error('Error compressing image:', error);
    return file; // Return original file if compression fails
  }
};

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
};

export const fileToDataUrl = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
