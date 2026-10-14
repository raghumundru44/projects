const rawApiUrl = (
  import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? 'https://publicfix-ai-backend.onrender.com' : '')
);

export const API_URL = rawApiUrl
  .replace(/\/api\/health\/?$/, '')
  .replace(/\/api\/?$/, '')
  .replace(/\/+$/, '');

export const getUploadUrl = (filename) => {
  if (!filename) return '';
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  return `${API_URL}/uploads/${filename}`;
};
