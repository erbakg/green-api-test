const defaultApiUrl = 'https://api.green-api.com';

export const env = {
  greenApiUrl: (import.meta.env.VITE_GREEN_API_URL as string | undefined)?.replace(/\/$/, '') || defaultApiUrl,
};
