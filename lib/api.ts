import Constants from 'expo-constants';

function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
}

export async function transcribeAudio(
  uri: string,
  fromLang: string
): Promise<{ transcript: string }> {
  const formData = new FormData();
  formData.append('audio', { uri, name: 'recording.m4a', type: 'audio/m4a' } as any);
  formData.append('fromLang', fromLang);

  const res = await fetch(`${getApiUrl()}/api/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Transcription failed');
  }

  return res.json();
}

export async function translateText(
  transcript: string,
  fromLang: string,
  toLang: string
): Promise<{ translation: string; audioBase64: string; mimeType: string }> {
  const res = await fetch(`${getApiUrl()}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, fromLang, toLang }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Translation failed');
  }

  return res.json();
}
