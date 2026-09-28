/**
 * Thrown by httpClient for every failed request, so callers can always do
 * `if (err instanceof ApiClientError) …` whether the server answered with an
 * error status or the request never reached it (status 0).
 *
 * The backend's error body is `{ error: string }` (see api/app/api/*).
 */
export class ApiClientError extends Error {
  readonly status: number;
  /** From the Retry-After header on a 429, in seconds. */
  readonly retryAfterSeconds?: number;

  constructor(status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  /** The request never got a response (offline, DNS, TLS, …). */
  static networkError(cause?: unknown): ApiClientError {
    const err = new ApiClientError(0, 'Network request failed');
    (err as { cause?: unknown }).cause = cause;
    return err;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isTooLarge(): boolean {
    return this.status === 413;
  }
}
