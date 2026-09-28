import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { __resetDeviceIdCache, DEVICE_ID_KEY, getDeviceId } from '../deviceId';

const crypto = Crypto as typeof Crypto & { __reset(): void };

beforeEach(async () => {
  __resetDeviceIdCache();
  crypto.__reset();
  await AsyncStorage.clear();
});
afterEach(() => jest.clearAllMocks());

describe('getDeviceId', () => {
  test('creates a UUID on first launch and saves it', async () => {
    const id = await getDeviceId();

    expect(id).toBe('00000000-0000-4000-8000-000000000001');
    await expect(AsyncStorage.getItem(DEVICE_ID_KEY)).resolves.toBe(id);
  });

  test('reuses the saved ID after an app restart instead of creating a new one', async () => {
    await AsyncStorage.setItem(DEVICE_ID_KEY, 'saved-device-id-1234');

    await expect(getDeviceId()).resolves.toBe('saved-device-id-1234');
    expect(Crypto.randomUUID).not.toHaveBeenCalled();
  });

  test('concurrent first calls share one ID (transcribe and translate can race on launch)', async () => {
    const [a, b] = await Promise.all([getDeviceId(), getDeviceId()]);

    expect(a).toBe(b);
    expect(Crypto.randomUUID).toHaveBeenCalledTimes(1);
  });

  test('still returns an ID when storage fails, so requests are never blocked', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk full'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));

    await expect(getDeviceId()).resolves.toBe('00000000-0000-4000-8000-000000000001');
  });
});
