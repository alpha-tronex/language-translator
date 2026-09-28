import * as ExpoAv from 'expo-av';
import { playAudioFromUri, requestMicPermission, startRecording, stopRecording } from '../recorder';

const av = ExpoAv as typeof ExpoAv & {
  __reset(): void;
  __setState(s: Record<string, unknown>): void;
  __getState(): { audioMode: Record<string, unknown>; soundsCreated: string[] };
};
const { Audio } = ExpoAv;

beforeEach(() => av.__reset());
afterEach(() => jest.clearAllMocks());

describe('requestMicPermission', () => {
  test('returns true when the user allows the microphone', async () => {
    await expect(requestMicPermission()).resolves.toBe(true);
  });

  test('returns false when the user denies the microphone', async () => {
    av.__setState({ permissionGranted: false });
    await expect(requestMicPermission()).resolves.toBe(false);
  });
});

describe('startRecording', () => {
  test('enables iOS recording and silent-mode playback before recording in high quality', async () => {
    const recording = await startRecording();

    expect(recording).toBeDefined();
    expect(av.__getState().audioMode).toEqual({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    expect(Audio.Recording.createAsync).toHaveBeenCalledWith(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  });

  test('propagates a failure to start (e.g. audio session not ready after first permission grant)', async () => {
    av.__setState({ createRecordingError: new Error('Audio session not ready') });
    await expect(startRecording()).rejects.toThrow('Audio session not ready');
  });
});

describe('stopRecording', () => {
  test('stops, turns iOS recording mode back off, and returns the file URI', async () => {
    const recording = await startRecording();

    await expect(stopRecording(recording)).resolves.toBe('file:///cache/recording.m4a');
    expect(recording.stopAndUnloadAsync).toHaveBeenCalled();
    expect(av.__getState().audioMode.allowsRecordingIOS).toBe(false);
  });

  test('throws when the recording produced no file', async () => {
    av.__setState({ recordingUri: null });
    const recording = await startRecording();

    await expect(stopRecording(recording)).rejects.toThrow('No recording URI returned');
  });
});

describe('playAudioFromUri', () => {
  test('loads the file and starts playback', async () => {
    const sound = await playAudioFromUri('file:///cache/translation.mp3');

    expect(av.__getState().soundsCreated).toEqual(['file:///cache/translation.mp3']);
    expect(sound.playAsync).toHaveBeenCalled();
  });
});
