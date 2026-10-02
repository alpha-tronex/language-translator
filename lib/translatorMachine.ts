import { AUTO_DETECT, findLanguage, Language, SourceLanguage } from './languages';
import { NewPhrase } from './practiceList';
import { PracticeScore, scoreAttempt } from './practiceScore';

/**
 * The home screen's state machine as a pure reducer (testability rule R4).
 * Side effects (microphone, API, audio) live in lib/useTranslator.ts, which
 * dispatches these actions; the screen only renders state.
 *
 *   idle → starting → recording → transcribing → review → translating → playback
 *     ↑       │ (mic error)   │ (too short)  │ (error)     ↑   (error) │
 *     └───────┴───────────────┴──────────────┘             └───────────┘
 *   idle ──(typed text)──→ review
 *   any quiet phase ──(saved phrase from the practice list)──→ translating (loading audio) → playback
 *
 * Practice (learning mode) reuses starting → recording → transcribing with
 * recordingFor = 'practice', starting from playback and ending in
 * practiceResult; any failure there returns to playback, keeping the
 * translation.
 */

export type Phase =
  | 'idle'
  | 'starting'
  | 'recording'
  | 'transcribing'
  | 'review'
  | 'translating'
  | 'playback'
  | 'practiceResult';

export type InputMode = 'voice' | 'text';

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
  /** Speak or type the phrase to translate. */
  inputMode: InputMode;
  /** How the current transcript got there. */
  inputSource: 'voice' | 'typed' | 'saved' | null;
  /** Whether the microphone is capturing the phrase or a practice attempt. */
  recordingFor: 'phrase' | 'practice';
  /** What the speech model heard when the student said the translation back. */
  practiceAttempt: string | null;
  /** Score of every attempt at the current translation, oldest first. */
  practiceScores: number[];
  /** The word whose audio is being fetched ("tap a word to hear it"). */
  speakingWord: string | null;
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
  | { type: 'setInputMode'; mode: InputMode }
  | { type: 'typedSubmitted'; text: string }
  | { type: 'practiceRequested' }
  | { type: 'practiceTranscribed'; transcript: string }
  | { type: 'practiceDone' }
  | { type: 'savedRequested'; phrase: NewPhrase }
  | { type: 'savedAudioFailed'; message: string }
  | { type: 'wordRequested'; word: string }
  | { type: 'wordFinished' }
  | { type: 'showAlert'; alert: AlertState }
  | { type: 'dismissAlert' }
  | { type: 'reset' };

export const MIN_RECORDING_MS = 500;
/** Same cap the API enforces on transcripts. */
export const MAX_TYPED_CHARS = 1000;

export const initialTranslatorState: TranslatorState = {
  phase: 'idle',
  fromLang: null,
  toLang: null,
  transcript: null,
  translation: null,
  detectedLang: null,
  recordingStartedAt: null,
  alert: null,
  inputMode: 'voice',
  inputSource: null,
  recordingFor: 'phrase',
  practiceAttempt: null,
  practiceScores: [],
  speakingWord: null,
};

const cleared = {
  phase: 'idle' as const,
  transcript: null,
  translation: null,
  detectedLang: null,
  recordingStartedAt: null,
  inputSource: null,
  recordingFor: 'phrase' as const,
  practiceAttempt: null,
  practiceScores: [],
  speakingWord: null,
};

/**
 * A recording that didn't work out. For the phrase, start over; for a
 * practice attempt, go back to the translation so it isn't lost.
 */
function abortRecording(state: TranslatorState, alert: AlertState): TranslatorState {
  return state.recordingFor === 'practice'
    ? { ...state, phase: 'playback', recordingFor: 'phrase', recordingStartedAt: null, alert }
    : { ...state, ...cleared, alert };
}

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
    case 'practiceRequested':
      return canPractice(state)
        ? { ...state, phase: 'starting', recordingFor: 'practice', practiceAttempt: null }
        : state;
    case 'recordingStarted':
      return state.phase === 'starting' ? { ...state, phase: 'recording', recordingStartedAt: action.at } : state;
    case 'micPermissionDenied':
      return state.phase === 'starting'
        ? abortRecording(state, {
            title: 'Microphone access denied',
            message: 'Please enable microphone access in your device settings.',
            action: 'openSettings',
          })
        : state;
    case 'recordingFailed':
      return state.phase === 'starting'
        ? abortRecording(state, { title: 'Microphone error', message: action.message })
        : state;

    case 'recordingTooShort':
      return state.phase === 'recording'
        ? abortRecording(state, {
            title: 'Recording too short',
            message: 'Hold the record button for at least half a second before releasing.',
          })
        : state;
    case 'transcribing':
      return state.phase === 'recording' ? { ...state, phase: 'transcribing', recordingStartedAt: null } : state;
    case 'transcribed':
      return state.phase === 'transcribing' && state.recordingFor === 'phrase'
        ? {
            ...state,
            phase: 'review',
            transcript: action.transcript,
            detectedLang: action.detectedLang ?? null,
            inputSource: 'voice',
          }
        : state;
    case 'practiceTranscribed':
      return state.phase === 'transcribing' && state.recordingFor === 'practice'
        ? {
            ...state,
            phase: 'practiceResult',
            recordingFor: 'phrase',
            practiceAttempt: action.transcript,
            practiceScores: [
              ...state.practiceScores,
              scoreAttempt(state.translation ?? '', action.transcript, state.toLang?.code).score,
            ],
          }
        : state;
    case 'transcribeFailed':
      return state.phase === 'transcribing'
        ? abortRecording(state, {
            title: state.recordingFor === 'practice' ? "Couldn't hear that" : 'Transcription failed',
            message: action.message,
          })
        : state;
    case 'practiceDone':
      return state.phase === 'practiceResult' ? { ...state, phase: 'playback', practiceAttempt: null } : state;

    case 'wordRequested':
      return canPractice(state) && state.speakingWord === null ? { ...state, speakingWord: action.word } : state;
    case 'wordFinished':
      return { ...state, speakingWord: null };

    case 'setInputMode':
      return state.phase === 'idle' ? { ...state, inputMode: action.mode } : state;
    case 'typedSubmitted': {
      const text = action.text.trim();
      return canRecord(state) && typedTextError(text) === null
        ? { ...state, ...cleared, phase: 'review', transcript: text, inputSource: 'typed' }
        : state;
    }

    case 'translateRequested':
      return state.phase === 'review' && state.transcript && state.toLang ? { ...state, phase: 'translating' } : state;
    case 'translated':
      return state.phase === 'translating' ? { ...state, phase: 'playback', translation: action.translation } : state;
    case 'translateFailed':
      return state.phase === 'translating'
        ? { ...state, phase: 'review', alert: { title: 'Translation failed', message: action.message } }
        : state;

    case 'savedRequested': {
      const toLang = findLanguage(action.phrase.targetLang);
      return canOpenSaved(state) && toLang
        ? {
            ...state,
            ...cleared,
            phase: 'translating',
            fromLang: findLanguage(action.phrase.sourceLang) ?? AUTO_DETECT,
            toLang,
            transcript: action.phrase.sourceText,
            translation: action.phrase.translation,
            inputSource: 'saved',
          }
        : state;
    }
    // The text is already on screen, so a saved phrase can still be practiced without its audio.
    case 'savedAudioFailed':
      return state.phase === 'translating' && state.inputSource === 'saved'
        ? { ...state, phase: 'playback', alert: { title: 'Audio unavailable', message: action.message } }
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

/** A saved phrase can replace what's on screen unless the app is mid-recording or waiting on the network. */
export function canOpenSaved(state: TranslatorState): boolean {
  return !isBusy(state) && state.phase !== 'recording';
}

/** The translation on screen as a practice-list entry, or null when there is none. */
export function currentPhrase(state: TranslatorState): NewPhrase | null {
  if (state.translation === null || state.toLang === null) return null;
  return {
    sourceText: state.transcript ?? '',
    sourceLang: sourceLanguageCode(state),
    translation: state.translation,
    targetLang: state.toLang.code,
    scores: state.practiceScores,
  };
}

/** Learning mode: say the translation back once it has been heard. */
export function canPractice(state: TranslatorState): boolean {
  return (state.phase === 'playback' || state.phase === 'practiceResult') && state.translation !== null && state.toLang !== null;
}

/** The scored, highlighted comparison for the attempt on screen, or null outside practiceResult. */
export function practiceResult(state: TranslatorState): PracticeScore | null {
  if (state.phase !== 'practiceResult' || state.translation === null) return null;
  return scoreAttempt(state.translation, state.practiceAttempt ?? '', state.toLang?.code);
}

/** Why typed text can't be submitted yet, or null when it can. */
export function typedTextError(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return 'Type a phrase first.';
  if (trimmed.length > MAX_TYPED_CHARS) return `Keep it under ${MAX_TYPED_CHARS.toLocaleString('en-US')} characters.`;
  return null;
}

export function transcriptLabel(state: TranslatorState): string {
  if (state.inputSource === 'saved') return 'Phrase:';
  return state.inputSource === 'typed' ? 'You typed:' : 'You said:';
}

/** Spinner text for the network waits. */
export function loadingLabel(state: TranslatorState): string | null {
  if (state.phase === 'translating') return state.inputSource === 'saved' ? 'Loading audio…' : 'Translating…';
  if (state.phase !== 'transcribing') return null;
  return state.recordingFor === 'practice' ? 'Listening…' : 'Transcribing…';
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
      return state.recordingFor === 'practice' ? 'Say the translation, then tap to stop' : 'Tap to stop';
    case 'starting':
      return 'Starting microphone…';
    case 'transcribing':
    case 'translating':
      return 'Processing…';
    default:
      return languagesChosen(state) ? 'Tap to record' : 'Select languages above to get started';
  }
}
