import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

export const TRANSLATION_AUDIO_PATH = `${FileSystem.cacheDirectory}translation.mp3`;

export type AudioPlayer = {
  /** Saves the base64 MP3 to the cache and plays it. */
  playBase64(audioBase64: string): Promise<void>;
  /** Plays the last translation again from the start. */
  replay(): Promise<void>;
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
    async replay() {
      if (!sound) throw new Error('No audio to replay');
      await sound.replayAsync();
    },
    async stop() {
      await sound?.stopAsync().catch(() => {});
    },
    cleanup,
  };
}
