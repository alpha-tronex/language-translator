export type TranslateResponse = {
  translation:  string;
  audioBase64:  string;
  mimeType:     'audio/mpeg';
};

export type TranscribeResponse = {
  transcript: string;
  /** Language the speech model heard (e.g. "es"), when it reports one. */
  detectedLang?: string;
};
