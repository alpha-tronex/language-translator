export function getErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message.toLowerCase() : '';

  if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
    return 'No internet connection — translation needs network.';
  }
  if (msg.includes('429') || msg.includes('rate limit')) {
    return 'Too many requests — try again in a moment.';
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
