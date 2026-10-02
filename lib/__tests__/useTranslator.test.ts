import { act, renderHook } from '@testing-library/react-native';
import { speakPhrase, speakText, transcribeAudio, transcribePracticeAttempt, translateText } from '../api';
import { ApiClientError } from '../apiError';
import { createAudioPlayer, SLOW_RATE, WORD_AUDIO_PATH } from '../audioPlayback';
import { AUTO_DETECT, Language, SUPPORTED_LANGUAGES } from '../languages';
import { hasMicPermission, requestMicPermission, startRecording, stopRecording } from '../recorder';
import { START_DELAYS_FIRST_GRANT_MS, START_DELAYS_MS, useTranslator } from '../useTranslator';

jest.mock('../api');
jest.mock('../recorder');
jest.mock('../audioPlayback');

const lang = (code: string) => SUPPORTED_LANGUAGES.find((l) => l.code === code) as Language;

const player = { playBase64: jest.fn(), replay: jest.fn(), stop: jest.fn(), cleanup: jest.fn() };
const wordPlayer = { playBase64: jest.fn(), replay: jest.fn(), stop: jest.fn(), cleanup: jest.fn() };
const recording = { stopAndUnloadAsync: jest.fn(async () => ({})) };
let clock = 0;
const now = () => clock;
const sleep = jest.fn(async () => {});

beforeEach(() => {
  clock = 10_000;
  (createAudioPlayer as jest.Mock).mockImplementation((path?: string) => (path === WORD_AUDIO_PATH ? wordPlayer : player));
  for (const p of [player, wordPlayer]) Object.values(p).forEach((fn) => fn.mockResolvedValue(undefined));
  (speakText as jest.Mock).mockResolvedValue({ audioBase64: 'WORD' });
  (speakPhrase as jest.Mock).mockResolvedValue({ audioBase64: 'PHRASE' });
  player.playBase64.mockResolvedValue(undefined);
  player.replay.mockResolvedValue(undefined);
  player.cleanup.mockResolvedValue(undefined);
  player.stop.mockResolvedValue(undefined);
  (transcribePracticeAttempt as jest.Mock).mockResolvedValue({ transcript: 'Donde esta la estacion' });
  (hasMicPermission as jest.Mock).mockResolvedValue(true);
  (requestMicPermission as jest.Mock).mockResolvedValue(true);
  (startRecording as jest.Mock).mockResolvedValue(recording);
  (stopRecording as jest.Mock).mockResolvedValue('file:///cache/rec.m4a');
  (transcribeAudio as jest.Mock).mockResolvedValue({ transcript: 'Where is the station?' });
  (translateText as jest.Mock).mockResolvedValue({ translation: '¿Dónde está la estación?', audioBase64: 'AAAA' });
});
afterEach(() => jest.clearAllMocks());

async function setup(from = lang('en'), to = lang('es')) {
  const hook = await renderHook(() => useTranslator({ now, sleep }));
  await act(async () => {
    hook.result.current.setFromLang(from);
    hook.result.current.setToLang(to);
  });
  return hook;
}

async function record(hook: Awaited<ReturnType<typeof setup>>, durationMs = 2000) {
  await act(async () => {
    await hook.result.current.beginRecording();
  });
  clock += durationMs;
  await act(async () => {
    await hook.result.current.finishRecording();
  });
}

describe('recording and transcription', () => {
  test('records, transcribes in the chosen language and lands in review', async () => {
    const hook = await setup();

    await record(hook);

    expect(transcribeAudio).toHaveBeenCalledWith('file:///cache/rec.m4a', 'en');
    expect(hook.result.current.state).toMatchObject({ phase: 'review', transcript: 'Where is the station?' });
  });

  test('waits only briefly before starting when the mic was already allowed', async () => {
    const hook = await setup();

    await act(async () => {
      await hook.result.current.beginRecording();
    });

    expect(sleep.mock.calls).toEqual(START_DELAYS_MS.map((ms) => [ms]));
    expect(hook.result.current.state).toMatchObject({ phase: 'recording', recordingStartedAt: 10_000 });
  });

  test('on the very first permission grant, retries quietly while iOS sets up audio', async () => {
    (hasMicPermission as jest.Mock).mockResolvedValue(false);
    (startRecording as jest.Mock)
      .mockRejectedValueOnce(new Error('session not ready'))
      .mockResolvedValueOnce(recording);
    const hook = await setup();

    await act(async () => {
      await hook.result.current.beginRecording();
    });

    expect(sleep.mock.calls).toEqual(START_DELAYS_FIRST_GRANT_MS.slice(0, 2).map((ms) => [ms]));
    expect(hook.result.current.state.phase).toBe('recording');
    expect(hook.result.current.state.alert).toBeNull();
  });

  test('shows a microphone error only after every retry fails', async () => {
    (hasMicPermission as jest.Mock).mockResolvedValue(false);
    (startRecording as jest.Mock).mockRejectedValue(new Error('Audio session could not start'));
    const hook = await setup();

    await act(async () => {
      await hook.result.current.beginRecording();
    });

    expect(startRecording).toHaveBeenCalledTimes(START_DELAYS_FIRST_GRANT_MS.length);
    expect(hook.result.current.state).toMatchObject({ phase: 'idle', alert: { title: 'Microphone error' } });
  });

  test('denied microphone permission offers to open Settings', async () => {
    (requestMicPermission as jest.Mock).mockResolvedValue(false);
    const hook = await setup();

    await act(async () => {
      await hook.result.current.beginRecording();
    });

    expect(startRecording).not.toHaveBeenCalled();
    expect(hook.result.current.state.alert).toMatchObject({ action: 'openSettings' });
  });

  test('a tap shorter than 500 ms is discarded without calling the API', async () => {
    const hook = await setup();

    await record(hook, 300);

    expect(recording.stopAndUnloadAsync).toHaveBeenCalled();
    expect(transcribeAudio).not.toHaveBeenCalled();
    expect(hook.result.current.state).toMatchObject({ phase: 'idle', alert: { title: 'Recording too short' } });
  });

  test('a transcription error goes back to idle with a friendly message', async () => {
    (transcribeAudio as jest.Mock).mockRejectedValue(ApiClientError.networkError());
    const hook = await setup();

    await record(hook);

    expect(hook.result.current.state).toMatchObject({
      phase: 'idle',
      alert: { title: 'Transcription failed', message: 'No internet connection — translation needs network.' },
    });
  });

  test('beginRecording does nothing until both languages are chosen', async () => {
    const hook = await renderHook(() => useTranslator({ now, sleep }));

    await act(async () => {
      await hook.result.current.beginRecording();
    });

    expect(requestMicPermission).not.toHaveBeenCalled();
  });
});

describe('auto-detect', () => {
  test('sends "auto", then translates from the language the model heard', async () => {
    (transcribeAudio as jest.Mock).mockResolvedValue({ transcript: 'Où est la gare ?', detectedLang: 'fr' });
    const hook = await setup(AUTO_DETECT as unknown as Language, lang('en'));

    await record(hook);
    await act(async () => {
      await hook.result.current.translate();
    });

    expect(transcribeAudio).toHaveBeenCalledWith('file:///cache/rec.m4a', 'auto');
    expect(translateText).toHaveBeenCalledWith('Où est la gare ?', 'fr', 'en');
  });
});

describe('translation and playback', () => {
  test('translates, shows the translation and plays the audio', async () => {
    const hook = await setup();
    await record(hook);

    await act(async () => {
      await hook.result.current.translate();
    });

    expect(translateText).toHaveBeenCalledWith('Where is the station?', 'en', 'es');
    expect(player.playBase64).toHaveBeenCalledWith('AAAA');
    expect(hook.result.current.state).toMatchObject({ phase: 'playback', translation: '¿Dónde está la estación?' });
  });

  test('if audio fails, the translation text is still shown with a note', async () => {
    player.playBase64.mockRejectedValue(new Error('decoder error'));
    const hook = await setup();
    await record(hook);

    await act(async () => {
      await hook.result.current.translate();
    });

    expect(hook.result.current.state).toMatchObject({ phase: 'playback', alert: { title: 'Audio unavailable' } });
  });

  test('a translation error returns to review so the user can retry', async () => {
    (translateText as jest.Mock).mockRejectedValue(new ApiClientError(429, 'Too many requests', 30));
    const hook = await setup();
    await record(hook);

    await act(async () => {
      await hook.result.current.translate();
    });

    expect(hook.result.current.state).toMatchObject({
      phase: 'review',
      alert: { message: "You're going fast — try again in 30 seconds." },
    });
  });

  test('replay failure shows an alert', async () => {
    player.replay.mockRejectedValue(new Error('No audio to replay'));
    const hook = await setup();

    await act(async () => {
      await hook.result.current.replay();
    });

    expect(hook.result.current.state.alert?.title).toBe('Audio unavailable');
  });

  test('reset clears results and the cached audio', async () => {
    const hook = await setup();
    await record(hook);
    player.cleanup.mockClear();

    await act(async () => {
      hook.result.current.reset();
    });

    expect(player.cleanup).toHaveBeenCalled();
    expect(hook.result.current.state).toMatchObject({ phase: 'idle', transcript: null });
  });

  test('unmounting releases the audio', async () => {
    const hook = await setup();
    player.cleanup.mockClear();

    await hook.unmount();

    expect(player.cleanup).toHaveBeenCalled();
  });
});

describe('typed input', () => {
  test('a typed phrase skips the microphone and is translated like a spoken one', async () => {
    const hook = await setup();

    await act(async () => {
      hook.result.current.setInputMode('text');
      hook.result.current.submitTyped('Where is the library?');
    });
    await act(async () => {
      await hook.result.current.translate();
    });

    expect(requestMicPermission).not.toHaveBeenCalled();
    expect(transcribeAudio).not.toHaveBeenCalled();
    expect(translateText).toHaveBeenCalledWith('Where is the library?', 'en', 'es');
    expect(hook.result.current.state.inputMode).toBe('text');
  });
});

describe('practice (learning mode)', () => {
  async function toPlayback() {
    const hook = await setup();
    await record(hook);
    await act(async () => {
      await hook.result.current.translate();
    });
    return hook;
  }

  test('records the attempt and transcribes it in the TARGET language', async () => {
    const hook = await toPlayback();

    await act(async () => {
      await hook.result.current.beginPractice();
    });
    clock += 1500;
    await act(async () => {
      await hook.result.current.finishRecording();
    });

    expect(transcribePracticeAttempt).toHaveBeenCalledWith('file:///cache/rec.m4a', 'es');
    expect(hook.result.current.state).toMatchObject({
      phase: 'practiceResult',
      practiceAttempt: 'Donde esta la estacion',
      translation: '¿Dónde está la estación?',
    });
  });

  test('stops the translation audio so the mic does not hear it, but keeps it for replay', async () => {
    const hook = await toPlayback();
    player.cleanup.mockClear();

    await act(async () => {
      await hook.result.current.beginPractice();
    });

    expect(player.stop).toHaveBeenCalled();
    expect(player.cleanup).not.toHaveBeenCalled();
  });

  test('a failed attempt returns to the translation with a message', async () => {
    (transcribePracticeAttempt as jest.Mock).mockRejectedValue(ApiClientError.networkError());
    const hook = await toPlayback();

    await act(async () => {
      await hook.result.current.beginPractice();
    });
    clock += 1500;
    await act(async () => {
      await hook.result.current.finishRecording();
    });

    expect(hook.result.current.state).toMatchObject({ phase: 'playback', alert: { title: "Couldn't hear that" } });
  });

  test('endPractice goes back to the translation', async () => {
    const hook = await toPlayback();
    await act(async () => {
      await hook.result.current.beginPractice();
    });
    clock += 1500;
    await act(async () => {
      await hook.result.current.finishRecording();
    });

    await act(async () => {
      hook.result.current.endPractice();
    });

    expect(hook.result.current.state.phase).toBe('playback');
  });
});

describe('learning mode: play slowly and tap a word (week 6)', () => {
  async function toPlayback() {
    const hook = await setup();
    await record(hook);
    await act(async () => {
      await hook.result.current.translate();
    });
    return hook;
  }

  test('playSlowly replays the translation at the slow rate without a network call', async () => {
    const hook = await toPlayback();

    await act(async () => {
      await hook.result.current.playSlowly();
    });

    expect(player.replay).toHaveBeenCalledWith(SLOW_RATE);
    expect(speakText).not.toHaveBeenCalled();
    expect(translateText).toHaveBeenCalledTimes(1);
  });

  test('a normal replay asks for normal speed, so it is not left slow', async () => {
    const hook = await toPlayback();

    await act(async () => {
      await hook.result.current.playSlowly();
      await hook.result.current.replay();
    });

    expect(player.replay).toHaveBeenLastCalledWith(1);
  });

  test('playSlowly failure shows an alert', async () => {
    player.replay.mockRejectedValue(new Error('No audio to replay'));
    const hook = await toPlayback();

    await act(async () => {
      await hook.result.current.playSlowly();
    });

    expect(hook.result.current.state.alert?.title).toBe('Audio unavailable');
  });

  test('speakWord fetches the word in the target language, without its punctuation, and plays it on the word player', async () => {
    const hook = await toPlayback();
    player.playBase64.mockClear();

    await act(async () => {
      await hook.result.current.speakWord('estación?');
    });

    expect(speakText).toHaveBeenCalledWith('estación', 'es');
    expect(player.stop).toHaveBeenCalled();
    expect(wordPlayer.playBase64).toHaveBeenCalledWith('WORD');
    expect(player.playBase64).not.toHaveBeenCalled();
    expect(hook.result.current.state.speakingWord).toBeNull();
  });

  test('a second tap on the same word reuses the audio instead of calling the API again', async () => {
    const hook = await toPlayback();

    await act(async () => {
      await hook.result.current.speakWord('estación?');
    });
    await act(async () => {
      await hook.result.current.speakWord('Estación');
    });

    expect(speakText).toHaveBeenCalledTimes(1);
    expect(wordPlayer.playBase64).toHaveBeenCalledTimes(2);
  });

  test('a new translation forgets the saved word audio', async () => {
    const hook = await toPlayback();
    await act(async () => {
      await hook.result.current.speakWord('la');
    });

    await act(async () => {
      hook.result.current.reset();
    });
    await record(hook);
    await act(async () => {
      await hook.result.current.translate();
    });
    await act(async () => {
      await hook.result.current.speakWord('la');
    });

    expect(speakText).toHaveBeenCalledTimes(2);
  });

  test('shows the API message when the word cannot be loaded, and stops the loading state', async () => {
    (speakText as jest.Mock).mockRejectedValue(ApiClientError.networkError());
    const hook = await toPlayback();

    await act(async () => {
      await hook.result.current.speakWord('la');
    });

    expect(hook.result.current.state).toMatchObject({ speakingWord: null, alert: { title: 'Audio unavailable' } });
    expect(wordPlayer.playBase64).not.toHaveBeenCalled();
  });

  test('does nothing for punctuation or before there is a translation', async () => {
    const hook = await toPlayback();
    await act(async () => {
      await hook.result.current.speakWord('—');
    });
    const fresh = await setup();
    await act(async () => {
      await fresh.result.current.speakWord('hola');
    });

    expect(speakText).not.toHaveBeenCalled();
  });

  test('starting a practice attempt stops a word that is still playing', async () => {
    const hook = await toPlayback();

    await act(async () => {
      await hook.result.current.beginPractice();
    });

    expect(wordPlayer.stop).toHaveBeenCalled();
  });

  test('a practice attempt is scored against the translation', async () => {
    const hook = await toPlayback();

    await act(async () => {
      await hook.result.current.beginPractice();
    });
    clock += 1500;
    await act(async () => {
      await hook.result.current.finishRecording();
    });

    expect(hook.result.current.state.practiceScores).toEqual([100]);
  });
});

describe('practice list (week 7)', () => {
  const saved = { sourceText: 'Thank you', sourceLang: 'en', translation: 'Gracias', targetLang: 'es' };

  test('openSaved shows the phrase, fetches its audio without translating again, and plays it', async () => {
    const hook = await renderHook(() => useTranslator({ now, sleep }));

    await act(async () => {
      await hook.result.current.openSaved(saved);
    });

    expect(speakPhrase).toHaveBeenCalledWith('Gracias', 'es');
    expect(translateText).not.toHaveBeenCalled();
    expect(player.playBase64).toHaveBeenCalledWith('PHRASE');
    expect(hook.result.current.state).toMatchObject({
      phase: 'playback',
      transcript: 'Thank you',
      translation: 'Gracias',
      inputSource: 'saved',
    });
  });

  test('openSaved without a connection still shows the phrase so it can be practiced', async () => {
    (speakPhrase as jest.Mock).mockRejectedValue(ApiClientError.networkError());
    const hook = await renderHook(() => useTranslator({ now, sleep }));

    await act(async () => {
      await hook.result.current.openSaved(saved);
    });

    expect(hook.result.current.state).toMatchObject({ phase: 'playback', translation: 'Gracias' });
    expect(hook.result.current.state.alert?.message).toMatch(/You can still practice saying it\.$/);
    expect(player.playBase64).not.toHaveBeenCalled();
  });

  test('openSaved clears the previous audio first', async () => {
    const hook = await setup();
    await record(hook);
    await act(async () => {
      await hook.result.current.translate();
    });
    player.cleanup.mockClear();

    await act(async () => {
      await hook.result.current.openSaved(saved);
    });

    expect(player.cleanup).toHaveBeenCalled();
    expect(wordPlayer.cleanup).toHaveBeenCalled();
  });

  test('openSaved does nothing mid-recording or for a language the app does not have', async () => {
    const hook = await setup();
    await act(async () => {
      await hook.result.current.beginRecording();
    });

    await act(async () => {
      await hook.result.current.openSaved(saved);
      await hook.result.current.openSaved({ ...saved, targetLang: 'xx' });
    });

    expect(speakPhrase).not.toHaveBeenCalled();
    expect(hook.result.current.state.phase).toBe('recording');
  });

  test('reports every scored practice attempt, so the practice list can keep best scores and the streak', async () => {
    const onPracticeScored = jest.fn();
    const hook = await renderHook(() => useTranslator({ now, sleep, onPracticeScored }));
    await act(async () => {
      hook.result.current.setFromLang(lang('en'));
      hook.result.current.setToLang(lang('es'));
    });
    await record(hook);
    await act(async () => {
      await hook.result.current.translate();
    });

    await act(async () => {
      await hook.result.current.beginPractice();
    });
    clock += 1500;
    await act(async () => {
      await hook.result.current.finishRecording();
    });

    expect(onPracticeScored).toHaveBeenCalledWith({ translation: '¿Dónde está la estación?', targetLang: 'es', score: 100 });
  });

  test('a failed attempt reports nothing', async () => {
    (transcribePracticeAttempt as jest.Mock).mockRejectedValue(ApiClientError.networkError());
    const onPracticeScored = jest.fn();
    const hook = await renderHook(() => useTranslator({ now, sleep, onPracticeScored }));
    await act(async () => {
      await hook.result.current.openSaved(saved);
    });

    await act(async () => {
      await hook.result.current.beginPractice();
    });
    clock += 1500;
    await act(async () => {
      await hook.result.current.finishRecording();
    });

    expect(onPracticeScored).not.toHaveBeenCalled();
  });
});
