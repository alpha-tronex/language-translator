import { ApiClientError } from '../apiError';
import { getErrorMessage } from '../errors';

describe('getErrorMessage', () => {
  test('explains a network error (status 0) as being offline', () => {
    expect(getErrorMessage(ApiClientError.networkError())).toBe(
      'No internet connection — translation needs network.'
    );
  });

  test('explains a 429 as rate limiting, whatever the server message says', () => {
    expect(getErrorMessage(new ApiClientError(429, 'Translation failed'))).toBe(
      "You're going fast — try again in a minute."
    );
  });

  test.each([
    [1, "You're going fast — try again in a second."],
    [42, "You're going fast — try again in 42 seconds."],
    [90, "You're going fast — try again in 90 seconds."],
    [91, "You're going fast — try again in 2 minutes."],
    [540, "You're going fast — try again in 9 minutes."],
  ])('uses Retry-After (%i s) to say how long to wait', (seconds, expected) => {
    expect(getErrorMessage(new ApiClientError(429, 'Too many requests', seconds))).toBe(expected);
  });

  test('explains a 401 (unsigned or outdated app) as needing an update', () => {
    expect(getErrorMessage(new ApiClientError(401, 'App update required'))).toBe(
      'This version of the app is out of date. Please update it from the App Store.'
    );
  });

  test('explains a 413 for audio as a recording that is too long', () => {
    expect(getErrorMessage(new ApiClientError(413, 'Recording too long'))).toBe(
      'Recording too long — keep it under a minute.'
    );
  });

  test('explains a 413 for text as text that is too long', () => {
    expect(getErrorMessage(new ApiClientError(413, 'Text too long'))).toBe(
      'That text is too long — try a shorter phrase.'
    );
  });

  test.each([
    ['Network request failed', 'No internet connection — translation needs network.'],
    ['Failed to fetch', 'No internet connection — translation needs network.'],
    ['Recording too short', 'Recording too short — hold the button for at least half a second.'],
    ['Audio session could not start', "Couldn't play audio. Try recording again."],
    ['Transcription failed', 'Transcription failed. Please try again.'],
    ['Translation failed', 'Translation failed. Please try again.'],
  ])('maps a plain Error "%s" to a friendly message', (message, expected) => {
    expect(getErrorMessage(new Error(message))).toBe(expected);
  });

  test('uses a generic message for unknown errors and non-Error values', () => {
    expect(getErrorMessage(new Error('something odd'))).toBe('Something went wrong. Please try again.');
    expect(getErrorMessage('a string')).toBe('Something went wrong. Please try again.');
    expect(getErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });
});
