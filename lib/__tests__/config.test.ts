import { getApiUrl, PRODUCTION_API_URL } from '../config';

describe('getApiUrl', () => {
  test('uses EXPO_PUBLIC_API_URL when it is set, even in development', () => {
    expect(getApiUrl('https://staging.example.com', '192.168.1.20:8081')).toBe('https://staging.example.com');
  });

  test('points at the local api dev server on port 3000 when running from Metro', () => {
    expect(getApiUrl(undefined, '192.168.1.20:8081')).toBe('http://192.168.1.20:3000');
  });

  test('falls back to production in a store build (no Metro host)', () => {
    expect(getApiUrl(undefined, undefined)).toBe(PRODUCTION_API_URL);
  });

  test('treats an empty env var as unset', () => {
    expect(getApiUrl('', undefined)).toBe(PRODUCTION_API_URL);
  });
});
