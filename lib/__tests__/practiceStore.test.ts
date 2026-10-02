import AsyncStorage from '@react-native-async-storage/async-storage';
import { addPhrase, EMPTY_PRACTICE_DATA } from '../practiceList';
import { loadPracticeData, PRACTICE_KEY, savePracticeData } from '../practiceStore';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('practiceStore', () => {
  test('a fresh install has an empty practice list', async () => {
    await expect(loadPracticeData()).resolves.toEqual(EMPTY_PRACTICE_DATA);
  });

  test('loads back what was saved', async () => {
    const data = addPhrase(
      EMPTY_PRACTICE_DATA,
      { sourceText: 'Thank you', sourceLang: 'en', translation: 'Gracias', targetLang: 'es' },
      'id-1',
      1000
    );

    await savePracticeData(data);

    await expect(loadPracticeData()).resolves.toEqual(data);
    expect(JSON.parse((await AsyncStorage.getItem(PRACTICE_KEY)) as string).phrases).toHaveLength(1);
  });

  test('corrupted storage loads as an empty list', async () => {
    await AsyncStorage.setItem(PRACTICE_KEY, '{broken');

    await expect(loadPracticeData()).resolves.toEqual(EMPTY_PRACTICE_DATA);
  });
});
