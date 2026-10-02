import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { SavedPhrase } from '../../lib/practiceList';
import { colors } from '../../lib/theme';
import PracticeListItem, { phraseSummary } from '../PracticeListItem';

const phrase: SavedPhrase = {
  id: 'id-1',
  sourceText: 'Where is the station?',
  sourceLang: 'en',
  translation: '¿Dónde está la estación?',
  targetLang: 'es',
  createdAt: 1,
  favorite: true,
  bestScore: null,
  attemptCount: 0,
  nailedCount: 0,
  lastPracticedAt: null,
};
const practicing: SavedPhrase = { ...phrase, bestScore: 70, attemptCount: 3 };
const mastered: SavedPhrase = { ...phrase, bestScore: 100, attemptCount: 5, nailedCount: 2 };

describe('phraseSummary', () => {
  test('a phrase that was never practiced says so', () => {
    expect(phraseSummary(phrase)).toBe('EN → ES · Not practiced yet');
  });

  test('shows the best score and attempts, singular and plural', () => {
    expect(phraseSummary(practicing)).toBe('EN → ES · Best 70 · 3 attempts');
    expect(phraseSummary({ ...practicing, attemptCount: 1 })).toBe('EN → ES · Best 70 · 1 attempt');
  });

  test('an undetected source language shows as "?"', () => {
    expect(phraseSummary({ ...phrase, sourceLang: 'auto' })).toBe('? → ES · Not practiced yet');
  });
});

describe('PracticeListItem', () => {
  const onOpen = jest.fn();
  const onDelete = jest.fn();
  afterEach(() => jest.clearAllMocks());

  test('shows the translation, what was said and a summary', async () => {
    await render(<PracticeListItem phrase={practicing} onOpen={onOpen} onDelete={onDelete} />);

    const row = screen.getByTestId('practice-list-item-id-1');
    expect(row).toHaveTextContent(/¿Dónde está la estación\?/);
    expect(row).toHaveTextContent(/Where is the station\?/);
    expect(row).toHaveTextContent(/EN → ES · Best 70 · 3 attempts/);
  });

  test.each([
    ['not practiced', phrase, 'Not practiced yet', colors.border],
    ['practicing', practicing, 'Practicing', colors.warning],
    ['mastered', mastered, 'Mastered', colors.success],
  ])('the mastery dot for a %s phrase has its own colour and spoken label', async (_name, item, label, color) => {
    await render(<PracticeListItem phrase={item} onOpen={onOpen} onDelete={onDelete} />);

    const dot = screen.getByTestId('practice-list-mastery-id-1');
    expect(dot).toHaveStyle({ backgroundColor: color });
    expect(dot.props.accessibilityLabel).toBe(label);
    expect(screen.getByRole('button', { name: `¿Dónde está la estación?. ${label}` })).toBeTruthy();
  });

  test('tapping the row opens the phrase', async () => {
    const user = userEvent.setup();
    await render(<PracticeListItem phrase={phrase} onOpen={onOpen} onDelete={onDelete} />);

    await user.press(screen.getByTestId('practice-list-item-id-1'));

    expect(onOpen).toHaveBeenCalledWith(phrase);
    expect(onDelete).not.toHaveBeenCalled();
  });

  test('the Delete action behind the swipe removes the phrase', async () => {
    const user = userEvent.setup();
    await render(<PracticeListItem phrase={phrase} onOpen={onOpen} onDelete={onDelete} />);

    await user.press(screen.getByRole('button', { name: 'Delete ¿Dónde está la estación?' }));

    expect(onDelete).toHaveBeenCalledWith(phrase);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('screen readers can delete without swiping, through an accessibility action', async () => {
    await render(<PracticeListItem phrase={phrase} onOpen={onOpen} onDelete={onDelete} />);
    const row = screen.getByTestId('practice-list-item-id-1');

    expect(row.props.accessibilityActions).toEqual([{ name: 'delete', label: 'Delete' }]);
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    await fireEvent(row, 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  test('an Arabic translation is laid out right-to-left', async () => {
    await render(<PracticeListItem phrase={{ ...phrase, translation: 'أين المحطة؟', targetLang: 'ar' }} onOpen={onOpen} onDelete={onDelete} />);

    expect(screen.getByText('أين المحطة؟')).toHaveStyle({ writingDirection: 'rtl' });
  });

  test('a phrase with no source text shows just the translation and summary', async () => {
    await render(<PracticeListItem phrase={{ ...phrase, sourceText: '' }} onOpen={onOpen} onDelete={onDelete} />);

    expect(screen.queryByText('Where is the station?')).toBeNull();
  });
});
