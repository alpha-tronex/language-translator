import { ApiClientError } from '../apiError';

describe('ApiClientError', () => {
  test('carries the HTTP status and message and is a real Error', () => {
    const err = new ApiClientError(500, 'Translation failed');

    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ApiClientError');
    expect(err.status).toBe(500);
    expect(err.message).toBe('Translation failed');
    expect(err.isNetworkError).toBe(false);
  });

  test('networkError() uses status 0 so callers can tell "offline" from a server error', () => {
    const cause = new TypeError('Network request failed');
    const err = ApiClientError.networkError(cause);

    expect(err.status).toBe(0);
    expect(err.isNetworkError).toBe(true);
    expect((err as { cause?: unknown }).cause).toBe(cause);
  });

  test('isUnauthorized is true only for 401', () => {
    expect(new ApiClientError(401, 'App update required').isUnauthorized).toBe(true);
    expect(new ApiClientError(403, 'nope').isUnauthorized).toBe(false);
  });

  test('isTooLarge is true only for 413', () => {
    expect(new ApiClientError(413, 'Recording too long').isTooLarge).toBe(true);
    expect(new ApiClientError(400, 'bad').isTooLarge).toBe(false);
  });

  test('keeps retryAfterSeconds when given', () => {
    expect(new ApiClientError(429, 'slow down', 30).retryAfterSeconds).toBe(30);
  });

  test('isRateLimited is true only for 429', () => {
    expect(new ApiClientError(429, 'slow down').isRateLimited).toBe(true);
    expect(new ApiClientError(500, 'boom').isRateLimited).toBe(false);
  });
});
