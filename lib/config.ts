import Constants from 'expo-constants';

export const PRODUCTION_API_URL = 'https://language-translator-apivercelapp.vercel.app';

/**
 * Base URL of the Next.js backend.
 * 1. EXPO_PUBLIC_API_URL when set (e.g. in .env.local)
 * 2. In development, the Metro host on port 3000 (the local `api` dev server)
 * 3. Otherwise the production Vercel deployment
 */
export function getApiUrl(
  env: string | undefined = process.env.EXPO_PUBLIC_API_URL,
  hostUri: string | undefined = Constants.expoConfig?.hostUri
): string {
  if (env) return env;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:3000` : PRODUCTION_API_URL;
}
