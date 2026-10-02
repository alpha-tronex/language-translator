import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { NewPhrase } from '../practiceList';
import { PRACTICE_KEY } from '../practiceStore';
import { usePracticeList } from '../usePracticeList';

const NOW = new Date(2026, 9, 2, 12).getTime();
const now = () => NOW;
let ids = 0;
const newId = () => `id-${++ids}`;

const station: NewPhrase = {
  sourceText: 'Where is the station?',
  sourceLang: 'en',
  translation: '¿Dónde está la estación?',
  targetLang: 'es',
};

const stored = async () => JSON.parse((await AsyncStorage.getItem(PRACTICE_KEY)) ?? 'null');

async function setup() {
  const hook = await renderHook(() => usePracticeList({ now, newId }));
  await waitFor(() => expect(hook.result.current.status).toBe('ready'));
  return hook;
}

beforeEach(async () => {
  ids = 0;
  await AsyncStorage.clear();
});
afterEach(() => jest.clearAllMocks());

/** Holds the storage read open so the loading state can be observed. */
function holdRead() {
  let release = () => {};
  (AsyncStorage.getItem as jest.Mock).mockImplementationOnce(
    (key: string) =>
      new Promise((resolve) => {
        release = () => resolve(heldValue[key] ?? null);
      })
  );
  return () => release();
}
const heldValue: Record<string, string> = {};

describe('usePracticeList', () => {
  test('starts loading, then is ready with an empty list on a fresh install', async () => {
    const release = holdRead();
    const hook = await renderHook(() => usePracticeList({ now, newId }));

    expect(hook.result.current.status).toBe('loading');
    await act(async () => release());
    await waitFor(() => expect(hook.result.current.status).toBe('ready'));
    expect(hook.result.current.data.phrases).toEqual([]);
  });

  test('loads the list saved in an earlier session', async () => {
    const first = await setup();
    await act(async () => first.result.current.save(station));
    await first.unmount();

    const second = await setup();

    expect(second.result.current.data.phrases.map((p) => p.translation)).toEqual(['¿Dónde está la estación?']);
  });

  test('save adds the phrase and writes it to the device', async () => {
    const hook = await setup();

    await act(async () => hook.result.current.save(station));

    expect(hook.result.current.data.phrases[0]).toMatchObject({ id: 'id-1', createdAt: NOW, favorite: true });
    await waitFor(async () => expect((await stored()).phrases).toHaveLength(1));
  });

  test('remove deletes the phrase and writes the change', async () => {
    const hook = await setup();
    await act(async () => hook.result.current.save(station));

    await act(async () => hook.result.current.remove('id-1'));

    expect(hook.result.current.data.phrases).toEqual([]);
    await waitFor(async () => expect((await stored()).phrases).toEqual([]));
  });

  test('recordPractice updates the saved phrase and counts today toward the streak', async () => {
    const hook = await setup();
    await act(async () => hook.result.current.save(station));

    await act(async () => hook.result.current.recordPractice(station, 90));

    expect(hook.result.current.data.phrases[0]).toMatchObject({ bestScore: 90, attemptCount: 1, nailedCount: 1 });
    expect(hook.result.current.data.practiceDays).toEqual(['2026-10-02']);
    await waitFor(async () => expect((await stored()).practiceDays).toEqual(['2026-10-02']));
  });

  test('ignores changes made before the stored list has loaded, so they cannot overwrite it', async () => {
    const first = await setup();
    await act(async () => first.result.current.save(station));
    await waitFor(async () => expect((await stored()).phrases).toHaveLength(1));
    await first.unmount();
    heldValue[PRACTICE_KEY] = (await AsyncStorage.getItem(PRACTICE_KEY)) as string;
    const setItem = AsyncStorage.setItem as jest.Mock;
    setItem.mockClear();
    const release = holdRead();

    const second = await renderHook(() => usePracticeList({ now, newId }));
    await act(async () => second.result.current.recordPractice(station, 10));
    await act(async () => release());
    await waitFor(() => expect(second.result.current.status).toBe('ready'));

    expect(setItem).not.toHaveBeenCalled();
    expect(second.result.current.data.phrases[0]).toMatchObject({ attemptCount: 0 });
  });

  test('a failed read reports an error and reload tries again', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('disk'));
    const hook = await renderHook(() => usePracticeList({ now, newId }));
    await waitFor(() => expect(hook.result.current.status).toBe('error'));

    await act(async () => {
      await hook.result.current.reload();
    });

    expect(hook.result.current.status).toBe('ready');
  });

  test('a failed write keeps the change for this session', async () => {
    const hook = await setup();
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('full'));

    await act(async () => hook.result.current.save(station));

    expect(hook.result.current.data.phrases).toHaveLength(1);
  });
});
