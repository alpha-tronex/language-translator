import { act, renderHook } from '@testing-library/react-native';
import { transcribeAudio, translateText } from '../api';
import { ApiClientError } from '../apiError';
import { createAudioPlayer } from '../audioPlayback';
import { AUTO_DETECT, Language, SUPPORTED_LANGUAGES } from '../languages';
import { hasMicPermission, requestMicPermission, startRecording, stopRecording } from '../recorder';
import { START_DELAYS_FIRST_GRANT_MS, START_DELAYS_MS, useTranslator } from '../useTranslator';

jest.mock('../api');
jest.mock('../recorder');
jest.mock('../audioPlayback');

const lang = (code: string) => SUPPORTED_LANGUAGES.find((l) => l.code === code) as Language;

const player = { playBase64: jest.fn(), replay: jest.fn(), cleanup: jest.fn() };
const recording = { stopAndUnloadAsync: jest.fn(async () => ({})) };
let clock = 0;
const now = () => clock;
const sleep = jest.fn(async () => {});

beforeEach(() => {
  clock = 10_000;
  (createAudioPlayer as jest.Mock).mockReturnValue(player);
  player.playBase64.mockResolvedValue(undefined);
  player.replay.mockResolvedValue(undefined);
  player.cleanup.mockResolvedValue(undefined);
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
