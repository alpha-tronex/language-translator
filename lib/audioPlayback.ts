import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

export const TRANSLATION_AUDIO_PATH = `${FileSystem.cacheDirectory}translation.mp3`;
/** Single words get their own file so they never replace the translation's audio. */
export const WORD_AUDIO_PATH = `${FileSystem.cacheDirectory}word.mp3`;
/** "Play slowly": three-quarter speed, pitch kept natural. */
export const SLOW_RATE = 0.75;

export type AudioPlayer = {
  /** Saves the base64 MP3 to the cache and plays it. */
  playBase64(audioBase64: string): Promise<void>;
  /** Plays the last audio again from the start, at normal speed unless a rate is given. */
  replay(rate?: number): Promise<void>;
  /** Stops playback but keeps the audio for a later replay. */
  stop(): Promise<void>;
  /** Unloads the sound and deletes the cached file. Safe to call anytime. */
  cleanup(): Promise<void>;
};

/**
 * One player per screen instance (created with useState(() => ...)), so no
 * module-level mutable state (testability rule R10).
 */
export function createAudioPlayer(path: string = TRANSLATION_AUDIO_PATH): AudioPlayer {
  let sound: Audio.Sound | null = null;

  async function cleanup() {
    const current = sound;
    sound = null;
    await current?.unloadAsync().catch(() => {});
    await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
  }

  return {
    async playBase64(audioBase64) {
      await cleanup();
      await FileSystem.writeAsStringAsync(path, audioBase64, { encoding: FileSystem.EncodingType.Base64 });
      const created = await Audio.Sound.createAsync({ uri: path });
      sound = created.sound;
      await sound.playAsync();
    },
    async replay(rate = 1) {
      if (!sound) throw new Error('No audio to replay');
      // Always set the rate, so a normal replay after a slow one is back to normal speed.
      await sound.setRateAsync(rate, true);
      await sound.replayAsync();
    },
    async stop() {
      await sound?.stopAsync().catch(() => {});
    },
    cleanup,
  };
}
