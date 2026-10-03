export type TranslateResponse = {
  translation:  string;
  /** Null when the voice service couldn't make audio; the translation is still good. */
  audioBase64:  string | null;
  audioUnavailable?: boolean;
  mimeType:     'audio/mpeg';
};

export type TranscribeResponse = {
  transcript: string;
  /** Language the speech model heard (e.g. "es"), when it reports one. */
  detectedLang?: string;
};
