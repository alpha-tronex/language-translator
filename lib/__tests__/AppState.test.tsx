import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';
import { speakPhrase, transcribePracticeAttempt } from '../api';
import { AppStateProvider, useAppState } from '../AppState';
import { hasMicPermission, requestMicPermission, startRecording, stopRecording } from '../recorder';

jest.mock('../api');
jest.mock('../recorder');
jest.mock('../audioPlayback', () => ({
  SLOW_RATE: 0.75,
  WORD_AUDIO_PATH: 'word.mp3',
  createAudioPlayer: () => ({
    playBase64: jest.fn(async () => {}),
    replay: jest.fn(async () => {}),
    stop: jest.fn(async () => {}),
    cleanup: jest.fn(async () => {}),
  }),
}));

let clock = new Date(2026, 9, 2, 12).getTime();
const now = () => clock;
const thanks = { sourceText: 'Thank you', sourceLang: 'en', translation: 'Gracias', targetLang: 'es' };

function wrapperWith(streakEnabled: boolean) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AppStateProvider now={now} streakEnabled={streakEnabled}>
        {children}
      </AppStateProvider>
    );
  };
}

async function setup(streakEnabled = true) {
  const hook = await renderHook(() => useAppState(), { wrapper: wrapperWith(streakEnabled) });
  await waitFor(() => expect(hook.result.current.practice.status).toBe('ready'));
  return hook;
}

/** Opens the saved phrase on the home screen and records one practice attempt. */
async function practice(hook: Awaited<ReturnType<typeof setup>>, heard: string) {
  (transcribePracticeAttempt as jest.Mock).mockResolvedValue({ transcript: heard });
  await act(async () => {
    await hook.result.current.translator.openSaved(thanks);
  });
  await act(async () => {
    await hook.result.current.translator.beginPractice();
  });
  clock += 2000;
  await act(async () => {
    await hook.result.current.translator.finishRecording();
  });
}

beforeEach(async () => {
  clock = new Date(2026, 9, 2, 12).getTime();
  await AsyncStorage.clear();
  (speakPhrase as jest.Mock).mockResolvedValue({ audioBase64: 'AAAA' });
  (hasMicPermission as jest.Mock).mockResolvedValue(true);
  (requestMicPermission as jest.Mock).mockResolvedValue(true);
  (startRecording as jest.Mock).mockResolvedValue({ stopAndUnloadAsync: jest.fn(async () => ({})) });
  (stopRecording as jest.Mock).mockResolvedValue('file:///cache/rec.m4a');
});
afterEach(() => jest.clearAllMocks());

describe('AppStateProvider', () => {
  test('useAppState outside the provider fails loudly', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useAppState())).rejects.toThrow('useAppState must be used inside <AppStateProvider>');
  });

  test('nothing is saved or starred on a fresh install', async () => {
    const hook = await setup();

    expect(hook.result.current.savedCurrent).toBeUndefined();
    expect(hook.result.current.practice.data.phrases).toEqual([]);
    expect(hook.result.current.streak).toBe(0);
  });

  test('toggleSaved does nothing when there is no translation on screen', async () => {
    const hook = await setup();

    await act(async () => hook.result.current.toggleSaved());

    expect(hook.result.current.practice.data.phrases).toEqual([]);
  });

  test('toggleSaved stars the translation on screen, and un-stars it the second time', async () => {
    const hook = await setup();
    await act(async () => {
      await hook.result.current.translator.openSaved(thanks);
    });

    await act(async () => hook.result.current.toggleSaved());
    expect(hook.result.current.savedCurrent).toMatchObject({ translation: 'Gracias', targetLang: 'es', sourceText: 'Thank you' });

    await act(async () => hook.result.current.toggleSaved());
    expect(hook.result.current.savedCurrent).toBeUndefined();
    expect(hook.result.current.practice.data.phrases).toEqual([]);
  });

  test('a practice attempt on a saved phrase updates its best score and starts the streak', async () => {
    const hook = await setup();
    await act(async () => {
      await hook.result.current.translator.openSaved(thanks);
    });
    await act(async () => hook.result.current.toggleSaved());

    await practice(hook, 'gracias');

    expect(hook.result.current.savedCurrent).toMatchObject({ bestScore: 100, attemptCount: 1, nailedCount: 1 });
    expect(hook.result.current.streak).toBe(1);
  });

  test('starring after practicing keeps the scores already earned', async () => {
    const hook = await setup();
    await practice(hook, 'gracias');

    await act(async () => hook.result.current.toggleSaved());

    expect(hook.result.current.savedCurrent).toMatchObject({ bestScore: 100, attemptCount: 1 });
  });

  test('practicing an unsaved phrase still counts toward the streak', async () => {
    const hook = await setup();

    await practice(hook, 'gracia');

    expect(hook.result.current.practice.data.phrases).toEqual([]);
    expect(hook.result.current.streak).toBe(1);
  });

  test('the streak is null when the feature flag is off', async () => {
    const hook = await setup(false);

    await practice(hook, 'gracias');

    expect(hook.result.current.streak).toBeNull();
  });
});
