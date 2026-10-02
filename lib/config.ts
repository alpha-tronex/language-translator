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

/**
 * Key for signing API requests (lib/appSignature.ts). Set per build with an
 * EAS environment variable; unset in local dev, in which case requests go
 * out unsigned (the API only logs that unless APP_AUTH_MODE=enforce).
 * It ships inside the app, so it deters casual abuse but is not a secret
 * in the strong sense.
 */
export function getAppSigningKey(
  key: string | undefined = process.env.EXPO_PUBLIC_APP_SIGNING_KEY
): string | undefined {
  return key?.trim() || undefined;
}

/** Sent as X-App-Version so the API logs show how much v1.0 traffic remains. */
export function getAppVersion(version: string | undefined = Constants.expoConfig?.version): string {
  return version ?? 'unknown';
}

/**
 * Feature flag for the daily-practice streak on the home screen. On unless
 * EXPO_PUBLIC_PRACTICE_STREAK is "off", so it can be cut without a code change.
 */
export function isStreakEnabled(flag: string | undefined = process.env.EXPO_PUBLIC_PRACTICE_STREAK): boolean {
  return flag?.trim().toLowerCase() !== 'off';
}
