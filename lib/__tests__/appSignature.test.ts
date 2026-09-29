import { createHmac } from 'crypto';
import { signingPayload, signRequest } from '../appSignature';

describe('signingPayload', () => {
  test('uses exactly the format the API verifies (api/lib/appAuth.ts)', () => {
    expect(signingPayload('1800000000', 'post', '/api/translate', 'dev-1')).toBe(
      '1800000000\nPOST\n/api/translate\ndev-1'
    );
  });
});

describe('signRequest', () => {
  test('returns a Unix-seconds timestamp and the HMAC the server expects', async () => {
    const headers = await signRequest({
      key: 'test-key',
      method: 'POST',
      path: '/api/translate',
      deviceId: 'device-1234-abcd',
      nowMs: 1_800_000_000_999,
    });

    expect(headers['X-App-Timestamp']).toBe('1800000000');
    expect(headers['X-App-Signature']).toBe(
      createHmac('sha256', 'test-key').update('1800000000\nPOST\n/api/translate\ndevice-1234-abcd').digest('hex')
    );
  });

  test('a different route gives a different signature, so signatures cannot be reused across endpoints', async () => {
    const base = { key: 'k', method: 'POST', deviceId: 'd-12345678', nowMs: 1_800_000_000_000 };
    const a = await signRequest({ ...base, path: '/api/translate' });
    const b = await signRequest({ ...base, path: '/api/transcribe' });

    expect(a['X-App-Signature']).not.toBe(b['X-App-Signature']);
  });
});
