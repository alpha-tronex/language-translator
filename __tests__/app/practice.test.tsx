import { render, screen, userEvent } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import PracticeListScreen from '../../app/practice';
import { useAppState } from '../../lib/AppState';
import { SavedPhrase } from '../../lib/practiceList';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../../lib/AppState');

const router = { back: jest.fn(), push: jest.fn() };
const openSaved = jest.fn(async () => {});
const remove = jest.fn();
const reload = jest.fn(async () => {});

const phrase = (id: string, translation: string, extra: Partial<SavedPhrase> = {}): SavedPhrase => ({
  id,
  sourceText: `source ${id}`,
  sourceLang: 'en',
  translation,
  targetLang: 'es',
  createdAt: 1,
  favorite: true,
  bestScore: null,
  attemptCount: 0,
  nailedCount: 0,
  lastPracticedAt: null,
  ...extra,
});
const gracias = phrase('a', 'Gracias', { bestScore: 100, attemptCount: 4, nailedCount: 2 });
const hola = phrase('b', 'Hola');

function renderWith(status: 'loading' | 'ready' | 'error', phrases: SavedPhrase[] = []) {
  (useRouter as jest.Mock).mockReturnValue(router);
  (useAppState as jest.Mock).mockReturnValue({
    translator: { openSaved },
    practice: { data: { phrases, practiceDays: [] }, status, remove, reload },
  });
  return render(<PracticeListScreen />);
}

afterEach(() => jest.clearAllMocks());

describe('PracticeListScreen', () => {
  test('shows a spinner while the list loads from the device', async () => {
    await renderWith('loading');

    expect(screen.getByRole('header', { name: 'Practice list' })).toBeTruthy();
    expect(screen.getByTestId('practice-list-loading')).toBeTruthy();
    expect(screen.queryByTestId('practice-list-empty')).toBeNull();
  });

  test('a failed load offers Retry', async () => {
    const user = userEvent.setup();
    await renderWith('error');

    expect(screen.getByTestId('practice-list-error')).toHaveTextContent(/Couldn't load your practice list/);
    await user.press(screen.getByRole('button', { name: 'Retry' }));

    expect(reload).toHaveBeenCalledTimes(1);
  });

  test('an empty list explains how to add a phrase', async () => {
    await renderWith('ready');

    expect(screen.getByTestId('practice-list-empty')).toHaveTextContent(/Nothing saved yet/);
    expect(screen.getByTestId('practice-list-empty')).toHaveTextContent(/tap ☆/);
    expect(screen.queryByTestId('practice-list')).toBeNull();
  });

  test('lists the saved phrases with their mastery', async () => {
    await renderWith('ready', [gracias, hola]);

    expect(screen.getByRole('button', { name: 'Gracias. Mastered' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Hola. Not practiced yet' })).toBeTruthy();
    expect(screen.getByTestId('practice-list-item-a')).toHaveTextContent(/Best 100 · 4 attempts/);
  });

  test('tapping a phrase opens it on the translator and goes back there', async () => {
    const user = userEvent.setup();
    await renderWith('ready', [gracias, hola]);

    await user.press(screen.getByTestId('practice-list-item-b'));

    expect(openSaved).toHaveBeenCalledWith(hola);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  test('Delete removes that phrase and stays on the list', async () => {
    const user = userEvent.setup();
    await renderWith('ready', [gracias, hola]);

    await user.press(screen.getByTestId('practice-list-delete-a'));

    expect(remove).toHaveBeenCalledWith('a');
    expect(router.back).not.toHaveBeenCalled();
    expect(openSaved).not.toHaveBeenCalled();
  });

  test('Back returns to the translator without opening anything', async () => {
    const user = userEvent.setup();
    await renderWith('ready', [gracias]);

    await user.press(screen.getByRole('button', { name: 'Back' }));

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(openSaved).not.toHaveBeenCalled();
  });
});
