import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { CONSENT_KEY, useConsent } from '../useConsent';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('useConsent', () => {
  test('starts without consent on a fresh install', async () => {
    const { result } = await renderHook(() => useConsent());

    expect(result.current.consentGiven).toBe(false);
  });

  test('remembers consent given in an earlier session', async () => {
    await AsyncStorage.setItem(CONSENT_KEY, 'true');

    const { result } = await renderHook(() => useConsent());

    await waitFor(() => expect(result.current.consentGiven).toBe(true));
  });

  test('giveConsent updates state immediately and persists it', async () => {
    const { result } = await renderHook(() => useConsent());

    await act(async () => {
      await result.current.giveConsent();
    });

    expect(result.current.consentGiven).toBe(true);
    await expect(AsyncStorage.getItem(CONSENT_KEY)).resolves.toBe('true');
  });

  test('consent given to the old (v1) notice does not count: the new notice covers more data sharing', async () => {
    await AsyncStorage.setItem('tlt_consent_v1', 'true');

    const { result } = await renderHook(() => useConsent());
    await act(async () => {});

    expect(CONSENT_KEY).toBe('tlt_consent_v2');
    expect(result.current.consentGiven).toBe(false);
  });
});
