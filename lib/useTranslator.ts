import type { Audio } from 'expo-av';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { transcribeAudio, transcribePracticeAttempt, translateText } from './api';
import { createAudioPlayer } from './audioPlayback';
import { getErrorMessage } from './errors';
import { Language, SourceLanguage } from './languages';
import { hasMicPermission, requestMicPermission, startRecording, stopRecording } from './recorder';
import {
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
export function useTranslator({ now = Date.now, sleep = defaultSleep }: TranslatorDeps = {}) {
  const [state, dispatch] = useReducer(translatorReducer, initialTranslatorState);
  const [player] = useState(() => createAudioPlayer());
  const recordingRef = useRef<Audio.Recording | null>(null);
  const stateRef = useRef<TranslatorState>(state);
  stateRef.current = state;

  useEffect(
    () => () => {
      void player.cleanup();
      void recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    },
    [player]
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
    await startMicrophone();
  }, [player, startMicrophone]);

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
  }, [player]);

  const replay = useCallback(async () => {
    try {
      await player.replay();
    } catch {
      dispatch({
        type: 'showAlert',
        alert: { title: 'Audio unavailable', message: "Couldn't play the audio. Try recording again." },
      });
    }
  }, [player]);

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
