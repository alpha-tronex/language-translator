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
      'Too many requests — try again in a moment.'
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
