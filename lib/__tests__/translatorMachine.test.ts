import { AUTO_DETECT, Language, SUPPORTED_LANGUAGES } from '../languages';
import {
  canOpenSaved,
  canPractice,
  currentPhrase,
  canRecord,
  loadingLabel,
  practiceResult,
  MAX_TYPED_CHARS,
  transcriptLabel,
  typedTextError,
  voiceUnavailableFor,
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

describe('typed input', () => {
  test('a typed phrase goes straight to review, marked as typed', () => {
    const s = run(ready, { type: 'typedSubmitted', text: '  Where is the library?  ' });
    expect(s).toMatchObject({ phase: 'review', transcript: 'Where is the library?', inputSource: 'typed' });
    expect(transcriptLabel(s)).toBe('You typed:');
  });

  test('empty or over-long text is not submitted', () => {
    expect(run(ready, { type: 'typedSubmitted', text: '   ' })).toBe(ready);
    expect(run(ready, { type: 'typedSubmitted', text: 'a'.repeat(MAX_TYPED_CHARS + 1) })).toBe(ready);
  });

  test('typedTextError explains what is wrong', () => {
    expect(typedTextError(' ')).toBe('Type a phrase first.');
    expect(typedTextError('a'.repeat(MAX_TYPED_CHARS + 1))).toBe('Keep it under 1,000 characters.');
    expect(typedTextError('Hello')).toBeNull();
  });

  test('needs both languages first, like recording', () => {
    const noLangs = initialTranslatorState;
    expect(run(noLangs, { type: 'typedSubmitted', text: 'Hello' })).toBe(noLangs);
  });

  test('switching between Speak and Type only happens when idle, and survives language changes', () => {
    const typing = run(ready, { type: 'setInputMode', mode: 'text' });
    expect(typing.inputMode).toBe('text');
    expect(run(typing, { type: 'setToLang', lang: ar }).inputMode).toBe('text');
    expect(run(inReview, { type: 'setInputMode', mode: 'text' })).toBe(inReview);
  });

  test('spoken transcripts are labelled "You said:"', () => {
    expect(transcriptLabel(inReview)).toBe('You said:');
  });
});

describe('practice (learning mode)', () => {
  const practising = run(inPlayback, { type: 'practiceRequested' }, { type: 'recordingStarted', at: 5000 });

  test('playback → practice recording → listening → result, keeping the translation', () => {
    expect(practising).toMatchObject({ phase: 'recording', recordingFor: 'practice' });
    expect(recordHint(practising)).toBe('Say the translation, then tap to stop');

    const listening = run(practising, { type: 'transcribing' });
    expect(loadingLabel(listening)).toBe('Listening…');

    const result = run(listening, { type: 'practiceTranscribed', transcript: 'Donde esta la estacion' });
    expect(result).toMatchObject({
      phase: 'practiceResult',
      practiceAttempt: 'Donde esta la estacion',
      translation: '¿Dónde está la estación?',
      recordingFor: 'phrase',
    });
  });

  test('"Try again" from the result starts a fresh attempt', () => {
    const result = run(practising, { type: 'transcribing' }, { type: 'practiceTranscribed', transcript: 'x' });
    const again = run(result, { type: 'practiceRequested' });
    expect(again).toMatchObject({ phase: 'starting', recordingFor: 'practice', practiceAttempt: null });
  });

  test('"Done" returns to the translation', () => {
    const result = run(practising, { type: 'transcribing' }, { type: 'practiceTranscribed', transcript: 'x' });
    expect(run(result, { type: 'practiceDone' })).toMatchObject({ phase: 'playback', practiceAttempt: null });
  });

  test('cannot practice before there is a translation', () => {
    expect(canPractice(inReview)).toBe(false);
    expect(run(inReview, { type: 'practiceRequested' })).toBe(inReview);
  });

  test.each([
    ['mic denied', [{ type: 'micPermissionDenied' }]],
    ['mic failed', [{ type: 'recordingFailed', message: 'busy' }]],
  ] as const)('%s during practice returns to the translation instead of wiping it', (_, actions) => {
    const s = run(inPlayback, { type: 'practiceRequested' }, ...(actions as unknown as TranslatorAction[]));
    expect(s).toMatchObject({ phase: 'playback', translation: '¿Dónde está la estación?', recordingFor: 'phrase' });
    expect(s.alert).not.toBeNull();
  });

  test('a too-short attempt or a failed transcription also returns to the translation', () => {
    expect(run(practising, { type: 'recordingTooShort' })).toMatchObject({ phase: 'playback', translation: '¿Dónde está la estación?' });
    const failed = run(practising, { type: 'transcribing' }, { type: 'transcribeFailed', message: 'offline' });
    expect(failed).toMatchObject({ phase: 'playback', alert: { title: "Couldn't hear that" } });
  });

  test('a phrase transcript cannot land while a practice attempt is being transcribed (and vice versa)', () => {
    const listening = run(practising, { type: 'transcribing' });
    expect(run(listening, { type: 'transcribed', transcript: 'stale' })).toBe(listening);
    const phraseTranscribing = run(ready, { type: 'startRequested' }, { type: 'recordingStarted', at: 0 }, { type: 'transcribing' });
    expect(run(phraseTranscribing, { type: 'practiceTranscribed', transcript: 'x' })).toBe(phraseTranscribing);
  });

  test('reset from a practice result starts over', () => {
    const result = run(practising, { type: 'transcribing' }, { type: 'practiceTranscribed', transcript: 'x' });
    expect(run(result, { type: 'reset' })).toMatchObject({ phase: 'idle', translation: null, practiceAttempt: null });
  });
});

describe('practice scoring (week 6)', () => {
  const attempt = (state: TranslatorState, transcript: string) =>
    run(
      state,
      { type: 'practiceRequested' },
      { type: 'recordingStarted', at: 5000 },
      { type: 'transcribing' },
      { type: 'practiceTranscribed', transcript }
    );

  test('scores each attempt against the translation and remembers the scores in order', () => {
    const first = attempt(inPlayback, 'donde esta');
    const second = attempt(first, 'donde esta la estacion');

    expect(first.practiceScores).toEqual([50]);
    expect(second.practiceScores).toEqual([50, 100]);
  });

  test('practiceResult gives the highlighted comparison for the attempt on screen', () => {
    const result = practiceResult(attempt(inPlayback, 'donde esta'));

    expect(result).toMatchObject({ score: 50, verdict: 'tryAgain' });
    expect(result?.expected.map((t) => t.status)).toEqual(['matched', 'matched', 'missed', 'missed']);
  });

  test('practiceResult is null outside the practice result', () => {
    expect(practiceResult(inPlayback)).toBeNull();
    expect(practiceResult(ready)).toBeNull();
  });

  test('Done keeps the scores, so coming back to practice continues the same run', () => {
    const done = run(attempt(inPlayback, 'donde esta'), { type: 'practiceDone' });

    expect(done).toMatchObject({ phase: 'playback', practiceScores: [50] });
  });

  test('a new phrase or a language change starts the scores over', () => {
    const practised = run(attempt(inPlayback, 'donde esta'), { type: 'practiceDone' });

    expect(run(practised, { type: 'reset' }).practiceScores).toEqual([]);
    expect(run(practised, { type: 'setToLang', lang: ar }).practiceScores).toEqual([]);
  });

  test('a failed attempt adds no score', () => {
    const failed = run(
      inPlayback,
      { type: 'practiceRequested' },
      { type: 'recordingStarted', at: 5000 },
      { type: 'transcribing' },
      { type: 'transcribeFailed', message: 'offline' }
    );

    expect(failed.practiceScores).toEqual([]);
  });
});

describe('tap a word to hear it', () => {
  test('marks the word as loading, then clears it', () => {
    const loading = run(inPlayback, { type: 'wordRequested', word: 'estación?' });

    expect(loading.speakingWord).toBe('estación?');
    expect(run(loading, { type: 'wordFinished' }).speakingWord).toBeNull();
  });

  test('ignores a second tap while a word is still loading', () => {
    const loading = run(inPlayback, { type: 'wordRequested', word: 'la' });

    expect(run(loading, { type: 'wordRequested', word: 'estación' })).toBe(loading);
  });

  test('does nothing before there is a translation', () => {
    expect(run(inReview, { type: 'wordRequested', word: 'x' })).toBe(inReview);
  });
});

describe('practice list: opening a saved phrase (week 7)', () => {
  const saved = { sourceText: 'Thank you', sourceLang: 'en', translation: 'شكرا', targetLang: 'ar' };
  const opening = run(inPlayback, { type: 'savedRequested', phrase: saved });

  test('puts the saved text on screen with its languages and waits for the audio', () => {
    expect(opening).toMatchObject({
      phase: 'translating',
      fromLang: en,
      toLang: ar,
      transcript: 'Thank you',
      translation: 'شكرا',
      inputSource: 'saved',
      practiceScores: [],
    });
    expect(loadingLabel(opening)).toBe('Loading audio…');
    expect(transcriptLabel(opening)).toBe('Phrase:');
  });

  test('lands in playback when the audio arrives', () => {
    expect(run(opening, { type: 'translated', translation: 'شكرا' })).toMatchObject({ phase: 'playback', translation: 'شكرا' });
  });

  test('without audio it still lands in playback with a message, so the phrase can be practiced', () => {
    const failed = run(opening, { type: 'savedAudioFailed', message: 'No connection.' });

    expect(failed).toMatchObject({ phase: 'playback', translation: 'شكرا', alert: { title: 'Audio unavailable' } });
    expect(canPractice(failed)).toBe(true);
  });

  test('a phrase saved from auto-detect with an unknown source opens with "Auto-detect"', () => {
    const s = run(ready, { type: 'savedRequested', phrase: { ...saved, sourceLang: 'auto' } });

    expect(s.fromLang).toBe(AUTO_DETECT);
  });

  test('is ignored while recording or waiting on the network, and for a language the app no longer has', () => {
    const recording = run(ready, { type: 'startRequested' }, { type: 'recordingStarted', at: 1 });
    const translating = run(inReview, { type: 'translateRequested' });

    expect(canOpenSaved(recording)).toBe(false);
    expect(run(recording, { type: 'savedRequested', phrase: saved })).toBe(recording);
    expect(run(translating, { type: 'savedRequested', phrase: saved })).toBe(translating);
    expect(run(ready, { type: 'savedRequested', phrase: { ...saved, targetLang: 'xx' } })).toBe(ready);
  });

  test('savedAudioFailed does nothing during a normal translation', () => {
    const translating = run(inReview, { type: 'translateRequested' });

    expect(run(translating, { type: 'savedAudioFailed', message: 'x' })).toBe(translating);
  });

  test('works on a fresh launch, before any languages were chosen', () => {
    expect(run(initialTranslatorState, { type: 'savedRequested', phrase: saved })).toMatchObject({ phase: 'translating', toLang: ar });
  });
});

describe('currentPhrase', () => {
  test('is null until there is a translation', () => {
    expect(currentPhrase(ready)).toBeNull();
    expect(currentPhrase(inReview)).toBeNull();
  });

  test('describes the translation on screen, with the scores so far', () => {
    const practised = run(
      inPlayback,
      { type: 'practiceRequested' },
      { type: 'recordingStarted', at: 5000 },
      { type: 'transcribing' },
      { type: 'practiceTranscribed', transcript: 'donde esta' }
    );

    expect(currentPhrase(practised)).toEqual({
      sourceText: 'Where is the station?',
      sourceLang: 'en',
      translation: '¿Dónde está la estación?',
      targetLang: 'es',
      scores: [50],
    });
  });

  test('uses the detected language when "From" was auto-detect', () => {
    const auto = run(
      { ...ready, fromLang: AUTO_DETECT },
      { type: 'startRequested' },
      { type: 'recordingStarted', at: 1000 },
      { type: 'transcribing' },
      { type: 'transcribed', transcript: 'Bonjour', detectedLang: 'fr' },
      { type: 'translateRequested' },
      { type: 'translated', translation: 'Hola' }
    );

    expect(currentPhrase(auto)).toMatchObject({ sourceLang: 'fr', targetLang: 'es' });
  });
});

describe('Wolof and Bambara (text-only languages)', () => {
  const wo = lang('wo');
  const bm = lang('bm');
  const toWolof = run(
    { ...ready, toLang: wo },
    { type: 'typedSubmitted', text: 'How are you?' },
    { type: 'translateRequested' },
    { type: 'translated', translation: 'Na nga def?' }
  );

  test('a Wolof translation plays like any other but cannot be practiced: the speech model cannot hear Wolof', () => {
    expect(toWolof).toMatchObject({ phase: 'playback', translation: 'Na nga def?' });
    expect(canPractice(toWolof)).toBe(false);
    expect(run(toWolof, { type: 'practiceRequested' })).toBe(toWolof);
  });

  test('it can still be saved to the practice list', () => {
    expect(currentPhrase(toWolof)).toMatchObject({ translation: 'Na nga def?', targetLang: 'wo' });
  });

  test('choosing Wolof or Bambara as the source switches input to typing', () => {
    expect(run(ready, { type: 'setFromLang', lang: wo })).toMatchObject({ fromLang: wo, inputMode: 'text' });
    expect(run(ready, { type: 'setFromLang', lang: bm }).inputMode).toBe('text');
  });

  test('Speak cannot be selected while the source is text-only', () => {
    const fromWolof = run(ready, { type: 'setFromLang', lang: wo });

    expect(run(fromWolof, { type: 'setInputMode', mode: 'voice' }).inputMode).toBe('text');
    expect(voiceUnavailableFor(fromWolof)).toBe('Wolof');
    expect(voiceUnavailableFor(ready)).toBeNull();
  });

  test('swapping so Wolof becomes the source also switches to typing', () => {
    const swapped = run({ ...ready, toLang: wo }, { type: 'swapLanguages' });

    expect(swapped).toMatchObject({ fromLang: wo, toLang: en, inputMode: 'text' });
  });

  test('going back to a spoken source keeps typing selected until the user picks Speak', () => {
    const back = run(ready, { type: 'setFromLang', lang: wo }, { type: 'setFromLang', lang: en });

    expect(back.inputMode).toBe('text');
    expect(run(back, { type: 'setInputMode', mode: 'voice' }).inputMode).toBe('voice');
  });
});

describe('translation without audio (voice service down)', () => {
  const translating = run(inReview, { type: 'translateRequested' });

  test('the translation is shown and marked as missing its audio', () => {
    expect(run(translating, { type: 'translated', translation: 'Hola', audioMissing: true })).toMatchObject({
      phase: 'playback',
      translation: 'Hola',
      audioMissing: true,
    });
  });

  test('a normal translation is not marked', () => {
    expect(inPlayback.audioMissing).toBe(false);
  });

  test('audioLoaded clears the mark once Play has fetched the audio', () => {
    const missing = run(translating, { type: 'translated', translation: 'Hola', audioMissing: true });

    expect(run(missing, { type: 'audioLoaded' }).audioMissing).toBe(false);
    expect(run(inPlayback, { type: 'audioLoaded' })).toBe(inPlayback);
  });

  test('a saved phrase opened offline is marked too, and a new phrase clears the mark', () => {
    const saved = { sourceText: 'Thank you', sourceLang: 'en', translation: 'Gracias', targetLang: 'es' };
    const offline = run(ready, { type: 'savedRequested', phrase: saved }, { type: 'savedAudioFailed', message: 'x' });

    expect(offline.audioMissing).toBe(true);
    expect(run(offline, { type: 'reset' }).audioMissing).toBe(false);
  });
});
