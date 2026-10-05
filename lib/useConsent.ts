import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

/**
 * v2 (app 2.0): the notice now also covers typed text, practice attempts and
 * the self-hosted Wolof/Bambara voice server, so people who agreed to the v1
 * wording are asked once more. Bump the suffix whenever the notice describes
 * a new kind of data sharing.
 */
export const CONSENT_KEY = 'tlt_consent_v2';

/** Whether the user agreed to send audio to OpenAI (stored on the device). */
export function useConsent() {
  const [consentGiven, setConsentGiven] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(CONSENT_KEY)
      .then((value) => {
        if (active && value === 'true') setConsentGiven(true);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const giveConsent = useCallback(async () => {
    setConsentGiven(true);
    await AsyncStorage.setItem(CONSENT_KEY, 'true').catch(() => {});
  }, []);

  return { consentGiven, giveConsent };
}
