import { ApiClientError } from './apiError';

function rateLimitMessage(retryAfterSeconds?: number): string {
  if (!retryAfterSeconds) return "You're going fast — try again in a minute.";
  if (retryAfterSeconds <= 1) return "You're going fast — try again in a second.";
  if (retryAfterSeconds <= 90) return `You're going fast — try again in ${retryAfterSeconds} seconds.`;
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return `You're going fast — try again in ${minutes} minutes.`;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.isNetworkError) return 'No internet connection — translation needs network.';
    if (error.isRateLimited) return rateLimitMessage(error.retryAfterSeconds);
    if (error.isUnauthorized) {
      return 'This version of the app is out of date. Please update it from the App Store.';
    }
    if (error.isTooLarge) {
      return error.message === 'Text too long'
        ? 'That text is too long — try a shorter phrase.'
        : 'Recording too long — keep it under a minute.';
    }
  }

  const msg = error instanceof Error ? error.message.toLowerCase() : '';

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'No internet connection — translation needs network.';
  }
  if (msg.includes('429') || msg.includes('rate limit')) {
    return rateLimitMessage();
  }
  if (msg.includes('too short')) {
    return 'Recording too short — hold the button for at least half a second.';
  }
  if (msg.includes('audio') || msg.includes('sound')) {
    return "Couldn't play audio. Try recording again.";
  }
  if (msg.includes('transcription failed')) {
    return 'Transcription failed. Please try again.';
  }
  if (msg.includes('translation failed')) {
    return 'Translation failed. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}
