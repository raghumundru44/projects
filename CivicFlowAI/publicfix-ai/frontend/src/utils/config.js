export const API_URL = (
  import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'https://publicfix-ai-backend.onrender.com' : '')
).replace(/\/$/, '');

export const getUploadUrl = (filename) => {
  if (!filename) return '';
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  return `${API_URL}/uploads/${filename}`;
};
