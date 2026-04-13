/**
 * Uploads a file to the Railway S3 bucket via the backend upload endpoint.
 * Returns the proxied image URL (/api/image?key=...) for safe serving.
 */
export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error || 'Upload failed');
  }

  const data = await response.json();
  // The server returns { url: '/api/image?key=...', key } — use the proxy URL directly
  return data.url as string;
}
