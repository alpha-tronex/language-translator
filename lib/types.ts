import { LanguageCode } from './languages';

export type AppState =
  | 'idle'           // ready to record
  | 'recording'      // mic is live
  | 'transcribing'   // waiting for Whisper
  | 'review'         // showing transcript, awaiting user action
  | 'translating'    // waiting for GPT + TTS
  | 'playback';      // showing translation + play button

export type TranslateResponse = {
  translation:  string;
  audioBase64:  string;
  mimeType:     'audio/mpeg';
};

export type TranscribeResponse = {
  transcript: string;
};
