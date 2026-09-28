import { ApiClientError } from '../apiError';
import { httpClient } from '../httpClient';

jest.mock('../config', () => ({ getApiUrl: () => 'https://api.test' }));

const fetchMock = jest.fn();

function response(status: number, body: string) {
  return { ok: status >= 200 && status < 300, status, text: async () => body } as Response;
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
afterEach(() => jest.clearAllMocks());

describe('httpClient.postJson', () => {
  test('POSTs a JSON body to the api base URL and returns the parsed response', async () => {
    fetchMock.mockResolvedValue(response(200, JSON.stringify({ translation: 'Hola' })));

    const result = await httpClient.postJson<{ translation: string }>('/api/translate', { transcript: 'Hello' });

    expect(result).toEqual({ translation: 'Hola' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.test/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  test('POSTs FormData without a JSON content type (fetch sets the multipart boundary)', async () => {
    fetchMock.mockResolvedValue(response(200, JSON.stringify({ transcript: 'hi' })));
    const form = new FormData();

    await httpClient.postForm('/api/transcribe', form);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/api/transcribe');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(form);
    expect(init.headers).toBeUndefined();
  });
});
