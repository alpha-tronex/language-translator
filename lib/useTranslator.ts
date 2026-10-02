import type { Audio } from 'expo-av';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { speakPhrase, speakText, transcribeAudio, transcribePracticeAttempt, translateText } from './api';
import { createAudioPlayer, SLOW_RATE, WORD_AUDIO_PATH } from './audioPlayback';
import { getErrorMessage } from './errors';
import { findLanguage, Language, SourceLanguage } from './languages';
import { NewPhrase } from './practiceList';
import { scoreAttempt, wordForSpeech } from './practiceScore';
import { hasMicPermission, requestMicPermission, startRecording, stopRecording } from './recorder';
import {
  canOpenSaved,
  canPractice,
  canRecord,
  InputMode,
  initialTranslatorState,
  isRecordingTooShort,
  sourceLanguageCode,
  translatorReducer,
  TranslatorState,
} from './translatorMachine';

export type TranslatorDeps = {
  /** Injected clock (testability rule R5). */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** Told about every scored practice attempt, so the practice list can keep best scores and the streak. */
  onPracticeScored?: (attempt: { translation: string; targetLang: string; score: number }) => void;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * iOS needs time to set up the audio session right after the user first
 * allows the microphone; retry quietly before showing an error.
 */
export const START_DELAYS_FIRST_GRANT_MS = [1500, 1000, 1000];
export const START_DELAYS_MS = [100];

/**
 * Everything the home screen does, behind one hook: the state machine plus
 * the microphone, API and audio side effects. The screen renders `state`
 * and calls these functions; tests mock this hook (rule T4).
 */
export function useTranslator({ now = Date.now, sleep = defaultSleep, onPracticeScored }: TranslatorDeps = {}) {
  const [state, dispatch] = useReducer(translatorReducer, initialTranslatorState);
  const [player] = useState(() => createAudioPlayer());
  /** Separate player for single words, so the translation stays ready to replay. */
  const [wordPlayer] = useState(() => createAudioPlayer(WORD_AUDIO_PATH));
  /** Word audio already fetched for this translation: a second tap is free and instant. */
  const wordAudio = useRef(new Map<string, string>());
  const recordingRef = useRef<Audio.Recording | null>(null);
  const stateRef = useRef<TranslatorState>(state);
  stateRef.current = state;
  const onPracticeScoredRef = useRef(onPracticeScored);
  onPracticeScoredRef.current = onPracticeScored;

  useEffect(
    () => () => {
      void player.cleanup();
      void wordPlayer.cleanup();
      void recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    },
    [player, wordPlayer]
  );

  /** Mic → recording, shared by the phrase and practice attempts. */
  const startMicrophone = useCallback(async () => {
    const alreadyGranted = await hasMicPermission();
    if (!(await requestMicPermission())) {
      dispatch({ type: 'micPermissionDenied' });
      return;
    }

    let lastError: unknown;
    for (const delay of alreadyGranted ? START_DELAYS_MS : START_DELAYS_FIRST_GRANT_MS) {
      await sleep(delay);
      try {
        recordingRef.current = await startRecording();
        dispatch({ type: 'recordingStarted', at: now() });
        return;
      } catch (e) {
        lastError = e;
      }
    }
    dispatch({ type: 'recordingFailed', message: getErrorMessage(lastError) });
  }, [now, sleep]);

  const beginRecording = useCallback(async () => {
    if (!canRecord(stateRef.current)) return;
    dispatch({ type: 'startRequested' });
    await player.cleanup();
    await startMicrophone();
  }, [player, startMicrophone]);

  /** Learning mode: record the student saying the translation back. */
  const beginPractice = useCallback(async () => {
    if (!canPractice(stateRef.current)) return;
    dispatch({ type: 'practiceRequested' });
    // Stop playback so the mic doesn't pick it up, but keep the audio for replay.
    await player.stop();
    await wordPlayer.stop();
    await startMicrophone();
  }, [player, wordPlayer, startMicrophone]);

  const finishRecording = useCallback(async () => {
    const recording = recordingRef.current;
    const current = stateRef.current;
    if (!recording || current.phase !== 'recording') return;
    recordingRef.current = null;

    if (isRecordingTooShort(current.recordingStartedAt, now())) {
      dispatch({ type: 'recordingTooShort' });
      await recording.stopAndUnloadAsync().catch(() => {});
      return;
    }

    dispatch({ type: 'transcribing' });
    try {
      const uri = await stopRecording(recording);
      if (current.recordingFor === 'practice') {
        const { transcript } = await transcribePracticeAttempt(uri, current.toLang?.code ?? '');
        dispatch({ type: 'practiceTranscribed', transcript });
        if (current.translation !== null && current.toLang) {
          onPracticeScoredRef.current?.({
            translation: current.translation,
            targetLang: current.toLang.code,
            score: scoreAttempt(current.translation, transcript, current.toLang.code).score,
          });
        }
      } else {
        const { transcript, detectedLang } = await transcribeAudio(uri, current.fromLang?.code ?? 'auto');
        dispatch({ type: 'transcribed', transcript, detectedLang });
      }
    } catch (e) {
      dispatch({ type: 'transcribeFailed', message: getErrorMessage(e) });
    }
  }, [now]);

  const translate = useCallback(async () => {
    const current = stateRef.current;
    if (current.phase !== 'review' || !current.transcript || !current.toLang) return;
    dispatch({ type: 'translateRequested' });

    let audioBase64: string;
    try {
      const result = await translateText(current.transcript, sourceLanguageCode(current), current.toLang.code);
      audioBase64 = result.audioBase64;
      wordAudio.current.clear();
      void wordPlayer.cleanup();
      dispatch({ type: 'translated', translation: result.translation });
    } catch (e) {
      dispatch({ type: 'translateFailed', message: getErrorMessage(e) });
      return;
    }

    try {
      await player.playBase64(audioBase64);
    } catch {
      dispatch({
        type: 'showAlert',
        alert: { title: 'Audio unavailable', message: "Couldn't play the audio. The translation text is shown above." },
      });
    }
  }, [player, wordPlayer]);

  /** Practice list: put a saved phrase on screen and fetch its audio (needs internet). */
  const openSaved = useCallback(
    async (phrase: NewPhrase) => {
      if (!canOpenSaved(stateRef.current) || !findLanguage(phrase.targetLang)) return;
      dispatch({ type: 'savedRequested', phrase });
      wordAudio.current.clear();
      await Promise.all([player.cleanup(), wordPlayer.cleanup()]);

      let audioBase64: string;
      try {
        audioBase64 = (await speakPhrase(phrase.translation, phrase.targetLang)).audioBase64;
        dispatch({ type: 'translated', translation: phrase.translation });
      } catch (e) {
        dispatch({ type: 'savedAudioFailed', message: `${getErrorMessage(e)} You can still practice saying it.` });
        return;
      }
      await player.playBase64(audioBase64).catch(() => {
        dispatch({
          type: 'showAlert',
          alert: { title: 'Audio unavailable', message: "Couldn't play the audio. The translation text is shown above." },
        });
      });
    },
    [player, wordPlayer]
  );

  const replayAt = useCallback(
    async (rate: number) => {
      try {
        await wordPlayer.stop();
        await player.replay(rate);
      } catch {
        dispatch({
          type: 'showAlert',
          alert: { title: 'Audio unavailable', message: "Couldn't play the audio. Try recording again." },
        });
      }
    },
    [player, wordPlayer]
  );
  const replay = useCallback(() => replayAt(1), [replayAt]);
  /** Learning mode: the same audio at three-quarter speed (no network call). */
  const playSlowly = useCallback(() => replayAt(SLOW_RATE), [replayAt]);

  /** Learning mode: tap a word of the translation to hear just that word. */
  const speakWord = useCallback(
    async (token: string) => {
      const current = stateRef.current;
      const word = wordForSpeech(token);
      const lang = current.toLang?.code;
      if (!word || !lang || !canPractice(current) || current.speakingWord !== null) return;

      dispatch({ type: 'wordRequested', word: token });
      try {
        const key = `${lang}:${word.toLowerCase()}`;
        let audioBase64 = wordAudio.current.get(key);
        if (!audioBase64) {
          audioBase64 = (await speakText(word, lang)).audioBase64;
          wordAudio.current.set(key, audioBase64);
        }
        await player.stop();
        await wordPlayer.playBase64(audioBase64);
      } catch (e) {
        dispatch({ type: 'showAlert', alert: { title: 'Audio unavailable', message: getErrorMessage(e) } });
      } finally {
        dispatch({ type: 'wordFinished' });
      }
    },
    [player, wordPlayer]
  );

  const reset = useCallback(() => {
    void player.cleanup();
    dispatch({ type: 'reset' });
  }, [player]);

  const setFromLang = useCallback(
    (lang: SourceLanguage) => {
      void player.cleanup();
      dispatch({ type: 'setFromLang', lang });
    },
    [player]
  );

  const setToLang = useCallback(
    (lang: Language) => {
      void player.cleanup();
      dispatch({ type: 'setToLang', lang });
    },
    [player]
  );

  const swapLanguages = useCallback(() => {
    void player.cleanup();
    dispatch({ type: 'swapLanguages' });
  }, [player]);

  const dismissAlert = useCallback(() => dispatch({ type: 'dismissAlert' }), []);
  const endPractice = useCallback(() => dispatch({ type: 'practiceDone' }), []);
  const setInputMode = useCallback((mode: InputMode) => dispatch({ type: 'setInputMode', mode }), []);
  /** Typed phrase → review, skipping the microphone and transcription. */
  const submitTyped = useCallback(
    (text: string) => {
      void player.cleanup();
      dispatch({ type: 'typedSubmitted', text });
    },
    [player]
  );

  return {
    state,
    beginRecording,
    finishRecording,
    translate,
    replay,
    playSlowly,
    speakWord,
    openSaved,
    reset,
    setFromLang,
    setToLang,
    swapLanguages,
    dismissAlert,
    beginPractice,
    endPractice,
    setInputMode,
    submitTyped,
  };
}

export type Translator = ReturnType<typeof useTranslator>;
