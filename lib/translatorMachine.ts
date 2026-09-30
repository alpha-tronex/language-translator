import { findLanguage, Language, SourceLanguage } from './languages';

/**
 * The home screen's state machine as a pure reducer (testability rule R4).
 * Side effects (microphone, API, audio) live in lib/useTranslator.ts, which
 * dispatches these actions; the screen only renders state.
 *
 *   idle → starting → recording → transcribing → review → translating → playback
 *     ↑       │ (mic error)   │ (too short)  │ (error)     ↑   (error) │
 *     └───────┴───────────────┴──────────────┘             └───────────┘
 */

export type Phase = 'idle' | 'starting' | 'recording' | 'transcribing' | 'review' | 'translating' | 'playback';

export type AlertState = {
  title: string;
  message: string;
  /** Offer a button that opens the system settings (microphone denied). */
  action?: 'openSettings';
};

export type TranslatorState = {
  phase: Phase;
  fromLang: SourceLanguage | null;
  toLang: Language | null;
  transcript: string | null;
  translation: string | null;
  /** What the speech model heard, when "From" is auto-detect. */
  detectedLang: string | null;
  recordingStartedAt: number | null;
  alert: AlertState | null;
};

export type TranslatorAction =
  | { type: 'setFromLang'; lang: SourceLanguage }
  | { type: 'setToLang'; lang: Language }
  | { type: 'swapLanguages' }
  | { type: 'startRequested' }
  | { type: 'recordingStarted'; at: number }
  | { type: 'micPermissionDenied' }
  | { type: 'recordingFailed'; message: string }
  | { type: 'recordingTooShort' }
  | { type: 'transcribing' }
  | { type: 'transcribed'; transcript: string; detectedLang?: string | null }
  | { type: 'transcribeFailed'; message: string }
  | { type: 'translateRequested' }
  | { type: 'translated'; translation: string }
  | { type: 'translateFailed'; message: string }
  | { type: 'showAlert'; alert: AlertState }
  | { type: 'dismissAlert' }
  | { type: 'reset' };

export const MIN_RECORDING_MS = 500;

export const initialTranslatorState: TranslatorState = {
  phase: 'idle',
  fromLang: null,
  toLang: null,
  transcript: null,
  translation: null,
  detectedLang: null,
  recordingStartedAt: null,
  alert: null,
};

const cleared = {
  phase: 'idle' as const,
  transcript: null,
  translation: null,
  detectedLang: null,
  recordingStartedAt: null,
};

export function translatorReducer(state: TranslatorState, action: TranslatorAction): TranslatorState {
  switch (action.type) {
    case 'setFromLang':
      return isBusy(state) ? state : { ...state, ...cleared, fromLang: action.lang };
    case 'setToLang':
      return isBusy(state) ? state : { ...state, ...cleared, toLang: action.lang };
    case 'swapLanguages':
      return canSwap(state) ? { ...state, ...cleared, fromLang: state.toLang, toLang: state.fromLang as Language } : state;

    case 'startRequested':
      return canRecord(state) ? { ...state, ...cleared, phase: 'starting' } : state;
    case 'recordingStarted':
      return state.phase === 'starting' ? { ...state, phase: 'recording', recordingStartedAt: action.at } : state;
    case 'micPermissionDenied':
      return state.phase === 'starting'
        ? {
            ...state,
            phase: 'idle',
            alert: {
              title: 'Microphone access denied',
              message: 'Please enable microphone access in your device settings.',
              action: 'openSettings',
            },
          }
        : state;
    case 'recordingFailed':
      return state.phase === 'starting'
        ? { ...state, phase: 'idle', alert: { title: 'Microphone error', message: action.message } }
        : state;

    case 'recordingTooShort':
      return state.phase === 'recording'
        ? {
            ...state,
            ...cleared,
            alert: {
              title: 'Recording too short',
              message: 'Hold the record button for at least half a second before releasing.',
            },
          }
        : state;
    case 'transcribing':
      return state.phase === 'recording' ? { ...state, phase: 'transcribing', recordingStartedAt: null } : state;
    case 'transcribed':
      return state.phase === 'transcribing'
        ? { ...state, phase: 'review', transcript: action.transcript, detectedLang: action.detectedLang ?? null }
        : state;
    case 'transcribeFailed':
      return state.phase === 'transcribing'
        ? { ...state, ...cleared, alert: { title: 'Transcription failed', message: action.message } }
        : state;

    case 'translateRequested':
      return state.phase === 'review' && state.transcript && state.toLang ? { ...state, phase: 'translating' } : state;
    case 'translated':
      return state.phase === 'translating' ? { ...state, phase: 'playback', translation: action.translation } : state;
    case 'translateFailed':
      return state.phase === 'translating'
        ? { ...state, phase: 'review', alert: { title: 'Translation failed', message: action.message } }
        : state;

    case 'showAlert':
      return { ...state, alert: action.alert };
    case 'dismissAlert':
      return { ...state, alert: null };
    case 'reset':
      return isBusy(state) ? state : { ...state, ...cleared };
  }
}

// ---- Selectors ----

/** Waiting on the microphone or the network; controls are locked. */
export function isBusy(state: TranslatorState): boolean {
  return state.phase === 'starting' || state.phase === 'transcribing' || state.phase === 'translating';
}

export function languagesChosen(state: TranslatorState): boolean {
  return state.fromLang !== null && state.toLang !== null;
}

export function canRecord(state: TranslatorState): boolean {
  return languagesChosen(state) && state.phase === 'idle';
}

/** Swapping needs a real source language: "Auto-detect" can't become the target. */
export function canSwap(state: TranslatorState): boolean {
  return !isBusy(state) && state.phase !== 'recording' && languagesChosen(state) && state.fromLang?.code !== 'auto';
}

/** A language change would throw away a transcript or translation, so ask first. */
export function hasResults(state: TranslatorState): boolean {
  return state.transcript !== null || state.translation !== null;
}

export function isRecordingTooShort(startedAt: number | null, now: number): boolean {
  return startedAt !== null && now - startedAt < MIN_RECORDING_MS;
}

/** The language code to translate from: the detected one when "From" is auto-detect. */
export function sourceLanguageCode(state: TranslatorState): string {
  if (state.fromLang?.code !== 'auto') return state.fromLang?.code ?? 'auto';
  return findLanguage(state.detectedLang)?.code ?? 'auto';
}

/** Label for the "Detected: …" chip, or null when nothing was auto-detected. */
export function detectedLanguageLabel(state: TranslatorState): string | null {
  if (state.fromLang?.code !== 'auto' || !state.detectedLang) return null;
  return findLanguage(state.detectedLang)?.label ?? state.detectedLang.toUpperCase();
}

/** Right-to-left rendering for the transcript, following the detected language when auto. */
export function transcriptIsRtl(state: TranslatorState): boolean {
  if (state.fromLang?.code === 'auto') return !!findLanguage(state.detectedLang)?.rtl;
  return !!state.fromLang?.rtl;
}

export function recordHint(state: TranslatorState): string {
  switch (state.phase) {
    case 'recording':
      return 'Tap to stop';
    case 'starting':
      return 'Starting microphone…';
    case 'transcribing':
    case 'translating':
      return 'Processing…';
    default:
      return languagesChosen(state) ? 'Tap to record' : 'Select languages above to get started';
  }
}
