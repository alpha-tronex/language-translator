import { getApiUrl, getAppSigningKey, getAppVersion, PRODUCTION_API_URL } from '../config';

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

describe('getAppSigningKey', () => {
  test('returns the build-time key, trimmed', () => {
    expect(getAppSigningKey('  abc123  ')).toBe('abc123');
  });

  test('returns undefined when unset or blank, so dev builds send unsigned requests', () => {
    expect(getAppSigningKey(undefined)).toBeUndefined();
    expect(getAppSigningKey('   ')).toBeUndefined();
  });
});

describe('getAppVersion', () => {
  test('returns the app.json version', () => {
    expect(getAppVersion('1.1.0')).toBe('1.1.0');
  });

  test('falls back to "unknown"', () => {
    expect(getAppVersion(undefined)).toBe('unknown');
  });
});
