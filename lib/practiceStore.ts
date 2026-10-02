import AsyncStorage from '@react-native-async-storage/async-storage';
import { parsePracticeData, PracticeData } from './practiceList';

/** v1 of the stored shape; bump the suffix (and migrate) if it ever changes incompatibly. */
export const PRACTICE_KEY = 'tlt_practice_v1';

/** The practice list stays on this device; nothing here is sent to the API. */
export async function loadPracticeData(): Promise<PracticeData> {
  return parsePracticeData(await AsyncStorage.getItem(PRACTICE_KEY));
}

export async function savePracticeData(data: PracticeData): Promise<void> {
  await AsyncStorage.setItem(PRACTICE_KEY, JSON.stringify(data));
}
