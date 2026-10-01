import { transcribeAudio, transcribePracticeAttempt, translateText } from '../api';
import { httpClient } from '../httpClient';

jest.mock('../httpClient', () => ({
  httpClient: { postJson: jest.fn(), postForm: jest.fn() },
}));

// Jest runs on Node, whose FormData stringifies React Native's
// { uri, name, type } file descriptor. Record the appended parts instead.
class RecordingFormData {
  parts: [string, unknown][] = [];
  append(name: string, value: unknown) {
    this.parts.push([name, value]);
  }
}
const RealFormData = global.FormData;
beforeAll(() => {
  global.FormData = RecordingFormData as unknown as typeof FormData;
});
afterAll(() => {
  global.FormData = RealFormData;
});

const postJson = httpClient.postJson as jest.Mock;
const postForm = httpClient.postForm as jest.Mock;

afterEach(() => jest.clearAllMocks());

describe('transcribeAudio', () => {
  test('uploads the recording and source language as multipart form data', async () => {
    postForm.mockResolvedValue({ transcript: 'Where is the station?' });

    const result = await transcribeAudio('file:///cache/rec.m4a', 'en');

    expect(result).toEqual({ transcript: 'Where is the station?' });
    const [path, form, options] = postForm.mock.calls[0];
    expect(path).toBe('/api/transcribe');
    expect(options).toEqual({ errorMessage: 'Transcription failed' });
    expect((form as unknown as RecordingFormData).parts).toEqual([
      ['audio', { uri: 'file:///cache/rec.m4a', name: 'recording.m4a', type: 'audio/m4a' }],
      ['fromLang', 'en'],
    ]);
  });

  test('passes errors from httpClient straight through', async () => {
    postForm.mockRejectedValue(new Error('Transcription failed'));

    await expect(transcribeAudio('file:///x.m4a', 'en')).rejects.toThrow('Transcription failed');
  });
});

describe('translateText', () => {
  test('sends transcript and both language codes as JSON', async () => {
    const res = { translation: 'Hola', audioBase64: 'AAAA', mimeType: 'audio/mpeg' as const };
    postJson.mockResolvedValue(res);

    await expect(translateText('Hello', 'en', 'es')).resolves.toEqual(res);
    expect(postJson).toHaveBeenCalledWith(
      '/api/translate',
      { transcript: 'Hello', fromLang: 'en', toLang: 'es' },
      { errorMessage: 'Translation failed' }
    );
  });
});

describe('transcribePracticeAttempt', () => {
  test('uploads only the audio and the target language to /api/practice', async () => {
    postForm.mockResolvedValue({ transcript: 'Donde esta' });

    await expect(transcribePracticeAttempt('file:///cache/att.m4a', 'es')).resolves.toEqual({ transcript: 'Donde esta' });

    const [path, form, options] = postForm.mock.calls[0];
    expect(path).toBe('/api/practice');
    expect(options).toEqual({ errorMessage: 'Practice transcription failed' });
    expect((form as unknown as RecordingFormData).parts).toEqual([
      ['audio', { uri: 'file:///cache/att.m4a', name: 'attempt.m4a', type: 'audio/m4a' }],
      ['lang', 'es'],
    ]);
  });
});
