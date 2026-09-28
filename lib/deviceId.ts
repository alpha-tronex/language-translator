import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

export const DEVICE_ID_KEY = 'tlt_device_id_v1';

let pending: Promise<string> | null = null;

async function loadOrCreate(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
  } catch {
    // Storage unavailable: fall through and use a fresh ID for this session.
  }
  const id = Crypto.randomUUID();
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  } catch {
    // Not fatal: the ID still works for this session.
  }
  return id;
}

/**
 * A random, anonymous ID for this install, sent as `X-Device-Id` so the
 * backend can rate-limit per device (a whole class shares one school IP).
 * It is not linked to the user. Created once, then read from AsyncStorage.
 */
export function getDeviceId(): Promise<string> {
  if (!pending) {
    pending = loadOrCreate().catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}

/** Test-only: forget the cached ID. */
export function __resetDeviceIdCache(): void {
  pending = null;
}
