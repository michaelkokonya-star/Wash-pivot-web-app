/**
 * Uploads a file to the Railway S3-compatible bucket via the backend API.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Upload failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.url as string;
}
