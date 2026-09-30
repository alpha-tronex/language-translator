import { AUTO_DETECT, Language, SUPPORTED_LANGUAGES } from '../languages';
import {
  canRecord,
  canSwap,
  detectedLanguageLabel,
  hasResults,
  initialTranslatorState,
  isBusy,
  isRecordingTooShort,
  MIN_RECORDING_MS,
  recordHint,
  sourceLanguageCode,
  TranslatorAction,
  translatorReducer,
  TranslatorState,
  transcriptIsRtl,
} from '../translatorMachine';

const lang = (code: string) => SUPPORTED_LANGUAGES.find((l) => l.code === code) as Language;
const en = lang('en');
const es = lang('es');
const ar = lang('ar');

function run(state: TranslatorState, ...actions: TranslatorAction[]): TranslatorState {
  return actions.reduce(translatorReducer, state);
}

const ready: TranslatorState = { ...initialTranslatorState, fromLang: en, toLang: es };
const inReview = run(ready, { type: 'startRequested' }, { type: 'recordingStarted', at: 1000 }, { type: 'transcribing' }, {
  type: 'transcribed',
  transcript: 'Where is the station?',
});
const inPlayback = run(inReview, { type: 'translateRequested' }, { type: 'translated', translation: '¿Dónde está la estación?' });

describe('happy path', () => {
  test('idle → starting → recording → transcribing → review → translating → playback', () => {
    let s = run(ready, { type: 'startRequested' });
    expect(s.phase).toBe('starting');
    s = run(s, { type: 'recordingStarted', at: 1000 });
    expect(s).toMatchObject({ phase: 'recording', recordingStartedAt: 1000 });
    s = run(s, { type: 'transcribing' });
    expect(s).toMatchObject({ phase: 'transcribing', recordingStartedAt: null });
    s = run(s, { type: 'transcribed', transcript: 'Hello' });
    expect(s).toMatchObject({ phase: 'review', transcript: 'Hello' });
    s = run(s, { type: 'translateRequested' });
    expect(s.phase).toBe('translating');
    s = run(s, { type: 'translated', translation: 'Hola' });
    expect(s).toMatchObject({ phase: 'playback', transcript: 'Hello', translation: 'Hola' });
  });

  test('reset from playback clears everything but keeps the chosen languages', () => {
    expect(run(inPlayback, { type: 'reset' })).toEqual(ready);
  });
});

describe('guards: actions that make no sense in the current phase are ignored', () => {
  test('cannot start recording before both languages are chosen', () => {
    const noTarget = { ...initialTranslatorState, fromLang: en };
    expect(run(noTarget, { type: 'startRequested' })).toBe(noTarget);
  });

  test('a late "transcribed" after a reset does not resurrect old results', () => {
    const afterReset = run(ready, { type: 'transcribed', transcript: 'stale' });
    expect(afterReset).toBe(ready);
  });

  test('cannot translate unless reviewing a transcript', () => {
    expect(run(ready, { type: 'translateRequested' })).toBe(ready);
  });

  test('language changes are ignored while busy', () => {
    const transcribing = run(ready, { type: 'startRequested' }, { type: 'recordingStarted', at: 0 }, { type: 'transcribing' });
    expect(run(transcribing, { type: 'setToLang', lang: ar })).toBe(transcribing);
  });
});

describe('failures', () => {
  test('microphone permission denied → idle with an Open Settings alert', () => {
    const s = run(ready, { type: 'startRequested' }, { type: 'micPermissionDenied' });
    expect(s.phase).toBe('idle');
    expect(s.alert).toMatchObject({ title: 'Microphone access denied', action: 'openSettings' });
  });

  test('microphone failed to start → idle with the error message', () => {
    const s = run(ready, { type: 'startRequested' }, { type: 'recordingFailed', message: 'Audio session busy' });
    expect(s).toMatchObject({ phase: 'idle', alert: { title: 'Microphone error', message: 'Audio session busy' } });
  });

  test('recording too short → idle with guidance', () => {
    const s = run(ready, { type: 'startRequested' }, { type: 'recordingStarted', at: 0 }, { type: 'recordingTooShort' });
    expect(s.phase).toBe('idle');
    expect(s.alert?.title).toBe('Recording too short');
  });

  test('transcription failed → idle with the error', () => {
    const s = run(ready, { type: 'startRequested' }, { type: 'recordingStarted', at: 0 }, { type: 'transcribing' }, {
      type: 'transcribeFailed',
      message: 'No internet connection',
    });
    expect(s).toMatchObject({ phase: 'idle', transcript: null, alert: { title: 'Transcription failed' } });
  });

  test('translation failed → back to review so the user can retry without re-recording', () => {
    const s = run(inReview, { type: 'translateRequested' }, { type: 'translateFailed', message: 'Try again' });
    expect(s).toMatchObject({ phase: 'review', transcript: 'Where is the station?', alert: { title: 'Translation failed' } });
  });

  test('dismissAlert clears the alert only', () => {
    const s = run(inReview, { type: 'showAlert', alert: { title: 'x', message: 'y' } }, { type: 'dismissAlert' });
    expect(s).toEqual(inReview);
  });
});

describe('languages', () => {
  test('changing a language clears previous results (the screen confirms first)', () => {
    const s = run(inPlayback, { type: 'setToLang', lang: ar });
    expect(s).toMatchObject({ phase: 'idle', toLang: ar, transcript: null, translation: null });
  });

  test('swap exchanges From and To', () => {
    expect(run(ready, { type: 'swapLanguages' })).toMatchObject({ fromLang: es, toLang: en });
  });

  test('swap is disabled when From is auto-detect (auto cannot be a target)', () => {
    const auto = { ...ready, fromLang: AUTO_DETECT };
    expect(canSwap(auto)).toBe(false);
    expect(run(auto, { type: 'swapLanguages' })).toBe(auto);
  });
});

describe('auto-detect', () => {
  const auto = { ...ready, fromLang: AUTO_DETECT };
  const heardArabic = run(auto, { type: 'startRequested' }, { type: 'recordingStarted', at: 0 }, { type: 'transcribing' }, {
    type: 'transcribed',
    transcript: 'أين المحطة؟',
    detectedLang: 'ar',
  });

  test('translates from the detected language', () => {
    expect(sourceLanguageCode(heardArabic)).toBe('ar');
  });

  test('falls back to "auto" when nothing was detected, so the API can infer it', () => {
    const undetected = run(auto, { type: 'startRequested' }, { type: 'recordingStarted', at: 0 }, { type: 'transcribing' }, {
      type: 'transcribed',
      transcript: 'Hello',
    });
    expect(sourceLanguageCode(undetected)).toBe('auto');
  });

  test('shows a "Detected" label, including for languages the app does not list', () => {
    expect(detectedLanguageLabel(heardArabic)).toBe('Arabic');
    expect(detectedLanguageLabel({ ...heardArabic, detectedLang: 'pt' })).toBe('PT');
    expect(detectedLanguageLabel(inReview)).toBeNull();
  });

  test('renders the transcript right-to-left when Arabic was detected', () => {
    expect(transcriptIsRtl(heardArabic)).toBe(true);
    expect(transcriptIsRtl(inReview)).toBe(false);
  });

  test('uses the chosen language directly when From is not auto', () => {
    expect(sourceLanguageCode(inReview)).toBe('en');
  });
});

describe('selectors', () => {
  test('isRecordingTooShort uses the 500 ms minimum', () => {
    expect(isRecordingTooShort(1000, 1000 + MIN_RECORDING_MS - 1)).toBe(true);
    expect(isRecordingTooShort(1000, 1000 + MIN_RECORDING_MS)).toBe(false);
    expect(isRecordingTooShort(null, 5000)).toBe(false);
  });

  test('canRecord, isBusy and hasResults', () => {
    expect(canRecord(ready)).toBe(true);
    expect(canRecord(initialTranslatorState)).toBe(false);
    expect(isBusy(run(ready, { type: 'startRequested' }))).toBe(true);
    expect(hasResults(ready)).toBe(false);
    expect(hasResults(inReview)).toBe(true);
  });

  test.each([
    [initialTranslatorState, 'Select languages above to get started'],
    [ready, 'Tap to record'],
    [run(ready, { type: 'startRequested' }), 'Starting microphone…'],
    [run(ready, { type: 'startRequested' }, { type: 'recordingStarted', at: 0 }), 'Tap to stop'],
  ])('recordHint(%#)', (state, hint) => {
    expect(recordHint(state)).toBe(hint);
  });
});
