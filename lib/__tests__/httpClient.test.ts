import { createHmac } from 'crypto';
import { ApiClientError } from '../apiError';
import { getAppSigningKey } from '../config';
import { httpClient } from '../httpClient';

jest.mock('../config', () => ({
  getApiUrl: () => 'https://api.test',
  getAppVersion: () => '1.1.0',
  getAppSigningKey: jest.fn(() => undefined),
}));
jest.mock('../deviceId', () => ({ getDeviceId: jest.fn(async () => 'device-1234-abcd') }));

const fetchMock = jest.fn();

function response(status: number, body: string, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: async () => body,
  } as unknown as Response;
}

async function rejectionOf(promise: Promise<unknown>): Promise<ApiClientError> {
  try {
    await promise;
  } catch (e) {
    return e as ApiClientError;
  }
  throw new Error('Expected the request to fail');
}

beforeEach(() => {
  global.fetch = fetchMock as unknown as typeof fetch;
});
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe('httpClient.postJson', () => {
  test('POSTs a JSON body to the api base URL and returns the parsed response', async () => {
    fetchMock.mockResolvedValue(response(200, JSON.stringify({ translation: 'Hola' })));

    const result = await httpClient.postJson<{ translation: string }>('/api/translate', { transcript: 'Hello' });

    expect(result).toEqual({ translation: 'Hola' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Id': 'device-1234-abcd', 'X-App-Version': '1.1.0' },
      body: JSON.stringify({ transcript: 'Hello' }),
      signal: undefined,
    });
  });

  test("uses the server's { error } message when the request fails", async () => {
    fetchMock.mockResolvedValue(response(500, JSON.stringify({ error: 'Missing transcript' })));

    await expect(httpClient.postJson('/api/translate', {})).rejects.toEqual(
      new ApiClientError(500, 'Missing transcript')
    );
  });

  test('falls back to the caller-supplied message when the error body has no { error }', async () => {
    fetchMock.mockResolvedValue(response(502, '<html>Bad gateway</html>'));

    const err = await rejectionOf(httpClient.postJson('/api/translate', {}, { errorMessage: 'Translation failed' }));

    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.status).toBe(502);
    expect(err.message).toBe('Translation failed');
  });

  test('falls back to a status-based message when there is no body and no caller message', async () => {
    fetchMock.mockResolvedValue(response(429, ''));

    const err = await rejectionOf(httpClient.postJson('/api/translate', {}));

    expect(err.isRateLimited).toBe(true);
    expect(err.message).toBe('Request failed with status 429');
  });

  test('reads Retry-After on a 429 so the app can say how long to wait', async () => {
    fetchMock.mockResolvedValue(response(429, JSON.stringify({ error: 'Too many requests' }), { 'Retry-After': '42' }));

    const err = await rejectionOf(httpClient.postJson('/api/translate', {}));

    expect(err.isRateLimited).toBe(true);
    expect(err.retryAfterSeconds).toBe(42);
  });

  test('ignores a missing or invalid Retry-After', async () => {
    fetchMock.mockResolvedValue(response(429, '', { 'Retry-After': 'soon' }));

    const err = await rejectionOf(httpClient.postJson('/api/translate', {}));

    expect(err.retryAfterSeconds).toBeUndefined();
  });

  test('turns a thrown fetch (offline) into a status-0 network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    const err = await rejectionOf(httpClient.postJson('/api/translate', {}));

    expect(err).toBeInstanceOf(ApiClientError);
    expect(err.isNetworkError).toBe(true);
  });

  test('rejects a 200 whose body is not JSON instead of returning garbage', async () => {
    fetchMock.mockResolvedValue(response(200, 'not json'));

    await expect(httpClient.postJson('/api/translate', {})).rejects.toThrow('Invalid response from server');
  });
});

describe('httpClient.postForm', () => {
  test('POSTs FormData with the device ID but no JSON content type (fetch sets the multipart boundary)', async () => {
    fetchMock.mockResolvedValue(response(200, JSON.stringify({ transcript: 'hi' })));
    const form = new FormData();

    await httpClient.postForm('/api/transcribe', form);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/transcribe');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(form);
    expect(init.headers).toEqual({ 'X-Device-Id': 'device-1234-abcd', 'X-App-Version': '1.1.0' });
  });
});

describe('request signing', () => {
  test('signs every request when a signing key is configured, in the format the API verifies', async () => {
    (getAppSigningKey as jest.Mock).mockReturnValue('test-key');
    jest.spyOn(Date, 'now').mockReturnValue(1_800_000_000_500);
    fetchMock.mockResolvedValue(response(200, '{}'));

    await httpClient.postJson('/api/translate', {});

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers['X-App-Timestamp']).toBe('1800000000');
    expect(headers['X-App-Signature']).toBe(
      createHmac('sha256', 'test-key').update('1800000000\nPOST\n/api/translate\ndevice-1234-abcd').digest('hex')
    );
  });

  test('sends no signature headers when no key is configured (local dev)', async () => {
    (getAppSigningKey as jest.Mock).mockReturnValue(undefined);
    fetchMock.mockResolvedValue(response(200, '{}'));

    await httpClient.postForm('/api/transcribe', new FormData());

    const headers = fetchMock.mock.calls[0][1].headers;
    expect(headers).not.toHaveProperty('X-App-Signature');
    expect(headers).not.toHaveProperty('X-App-Timestamp');
  });
});
