import { ApiClientError } from './apiError';
import { getApiUrl } from './config';

/**
 * The only module allowed to call fetch() (testability rule R1).
 * API functions in lib/api.ts are thin typed wrappers around this.
 */

export interface RequestOptions {
  /** Message used when the server returns an error without `{ error }`. */
  errorMessage?: string;
  signal?: AbortSignal;
}

async function request<T>(path: string, init: RequestInit, options: RequestOptions = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${getApiUrl()}${path}`, { ...init, signal: options.signal });
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
        : options.errorMessage ?? `Request failed with status ${response.status}`
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
