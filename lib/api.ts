import Constants from 'expo-constants';

function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // In Expo Go, derive the host from the Metro bundler (same machine as the API server)
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
