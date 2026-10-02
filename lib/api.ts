import { httpClient } from './httpClient';
import { TranscribeResponse, TranslateResponse } from './types';

export async function transcribeAudio(uri: string, fromLang: string): Promise<TranscribeResponse> {
  const form = new FormData();
  // React Native's FormData takes a { uri, name, type } file descriptor.
  form.append('audio', { uri, name: 'recording.m4a', type: 'audio/m4a' } as unknown as Blob);
  form.append('fromLang', fromLang);

  return httpClient.postForm<TranscribeResponse>('/api/transcribe', form, {
    errorMessage: 'Transcription failed',
  });
}

export async function translateText(
  transcript: string,
  fromLang: string,
  toLang: string
): Promise<TranslateResponse> {
  return httpClient.postJson<TranslateResponse>(
    '/api/translate',
    { transcript, fromLang, toLang },
    { errorMessage: 'Translation failed' }
  );
}

/** Learning mode: audio for one word of the translation ("tap a word to hear it"). */
export async function speakText(text: string, lang: string): Promise<{ audioBase64: string }> {
  return httpClient.postJson<{ audioBase64: string }>(
    '/api/speak',
    { text, lang },
    { errorMessage: "Couldn't load the audio" }
  );
}

/** Practice list: audio for a whole saved translation, which is stored as text only. */
export async function speakPhrase(text: string, lang: string): Promise<{ audioBase64: string }> {
  return httpClient.postJson<{ audioBase64: string }>(
    '/api/speak',
    { text, lang, phrase: true },
    { errorMessage: "Couldn't load the audio" }
  );
}

/**
 * Learning mode: transcribe a practice attempt in the target language.
 * Only the audio and language go up; the expected phrase stays on the device.
 */
export async function transcribePracticeAttempt(uri: string, lang: string): Promise<{ transcript: string }> {
  const form = new FormData();
  form.append('audio', { uri, name: 'attempt.m4a', type: 'audio/m4a' } as unknown as Blob);
  form.append('lang', lang);

  return httpClient.postForm<{ transcript: string }>('/api/practice', form, {
    errorMessage: 'Practice transcription failed',
  });
}
