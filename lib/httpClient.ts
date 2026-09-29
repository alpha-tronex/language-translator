import { ApiClientError } from './apiError';
import { signRequest } from './appSignature';
import { getApiUrl, getAppSigningKey, getAppVersion } from './config';
import { getDeviceId } from './deviceId';

/**
 * The only module allowed to call fetch() (testability rule R1).
 * API functions in lib/api.ts are thin typed wrappers around this.
 */

export interface RequestOptions {
  /** Message used when the server returns an error without `{ error }`. */
  errorMessage?: string;
  signal?: AbortSignal;
}

function parseRetryAfter(value: string | null): number | undefined {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
}

async function request<T>(path: string, init: RequestInit, options: RequestOptions = {}): Promise<T> {
  const deviceId = await getDeviceId();
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    // Lets the backend rate-limit per device (see lib/deviceId.ts).
    'X-Device-Id': deviceId,
    'X-App-Version': getAppVersion(),
  };

  const key = getAppSigningKey();
  if (key) {
    Object.assign(headers, await signRequest({ key, method: init.method ?? 'GET', path, deviceId }));
  }

  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, { ...init, headers, signal: options.signal });
  } catch (err) {
    throw ApiClientError.networkError(err);
  }

  const rawText = await response.text();
  let payload: unknown = null;
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      if (response.ok) {
        throw new ApiClientError(response.status, 'Invalid response from server');
      }
      // Non-OK with an unparsable body: fall through to a status-based error.
    }
  }

  if (!response.ok) {
    const serverMessage = (payload as { error?: unknown } | null)?.error;
    throw new ApiClientError(
      response.status,
      typeof serverMessage === 'string'
        ? serverMessage
        : options.errorMessage ?? `Request failed with status ${response.status}`,
      response.status === 429 ? parseRetryAfter(response.headers?.get('Retry-After') ?? null) : undefined
    );
  }

  return payload as T;
}

export const httpClient = {
  /** POST a JSON body. */
  postJson: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(
      path,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      options
    ),

  /** POST multipart form data (e.g. an audio upload). */
  postForm: <T>(path: string, form: FormData, options?: RequestOptions) =>
    request<T>(path, { method: 'POST', body: form }, options),
};
