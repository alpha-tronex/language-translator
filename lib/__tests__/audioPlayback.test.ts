import * as ExpoAv from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer, TRANSLATION_AUDIO_PATH } from '../audioPlayback';

const fs = FileSystem as typeof FileSystem & { __reset(): void; __files(): ReadonlyMap<string, unknown> };
const av = ExpoAv as typeof ExpoAv & { __reset(): void };

beforeEach(() => {
  fs.__reset();
  av.__reset();
});
afterEach(() => jest.clearAllMocks());

describe('createAudioPlayer', () => {
  test('writes the base64 MP3 to the cache and plays it', async () => {
    const player = createAudioPlayer();

    await player.playBase64('AAAA');

    expect(fs.__files().get(TRANSLATION_AUDIO_PATH)).toEqual({ contents: 'AAAA', encoding: 'base64' });
    const { sound } = await (ExpoAv.Audio.Sound.createAsync as jest.Mock).mock.results[0].value;
    expect(sound.playAsync).toHaveBeenCalled();
  });

  test('replay plays the same sound again', async () => {
    const player = createAudioPlayer();
    await player.playBase64('AAAA');
    const { sound } = await (ExpoAv.Audio.Sound.createAsync as jest.Mock).mock.results[0].value;

    await player.replay();

    expect(sound.replayAsync).toHaveBeenCalledTimes(1);
  });

  test('replay before anything was played fails, so the screen can show an error', async () => {
    await expect(createAudioPlayer().replay()).rejects.toThrow('No audio to replay');
  });

  test('cleanup unloads the sound and deletes the file, and is safe to call twice', async () => {
    const player = createAudioPlayer();
    await player.playBase64('AAAA');
    const { sound } = await (ExpoAv.Audio.Sound.createAsync as jest.Mock).mock.results[0].value;

    await player.cleanup();
    await player.cleanup();

    expect(sound.unloadAsync).toHaveBeenCalledTimes(1);
    expect(fs.__files().has(TRANSLATION_AUDIO_PATH)).toBe(false);
  });

  test('playing a new translation unloads the previous sound first', async () => {
    const player = createAudioPlayer();
    await player.playBase64('AAAA');
    const first = (await (ExpoAv.Audio.Sound.createAsync as jest.Mock).mock.results[0].value).sound;

    await player.playBase64('BBBB');

    expect(first.unloadAsync).toHaveBeenCalled();
    expect(fs.__files().get(TRANSLATION_AUDIO_PATH)).toMatchObject({ contents: 'BBBB' });
  });
});
