import { render, screen, userEvent, within } from '@testing-library/react-native';
import { scoreAttempt } from '../../lib/practiceScore';
import PracticePanel from '../PracticePanel';

describe('PracticePanel', () => {
  const handlers = {
    onWordPress: jest.fn(),
    onPlaySlowly: jest.fn(),
    onTryAgain: jest.fn(),
    onDone: jest.fn(),
  };
  const almost = scoreAttempt('Where is the station?', 'where is the nation', 'en');
  const perfect = scoreAttempt('¿Dónde está la estación?', 'Donde esta la estacion', 'es');

  afterEach(() => jest.clearAllMocks());

  test('shows the score out of 100 with a friendly verdict', async () => {
    await render(<PracticePanel result={almost} scores={[75]} {...handlers} />);

    expect(screen.getByTestId('practice-score')).toHaveTextContent('75');
    expect(screen.getByLabelText('Score 75 out of 100')).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Almost!' })).toBeTruthy();
  });

  test('a perfect attempt says "Nailed it!"', async () => {
    await render(<PracticePanel result={perfect} scores={[100]} {...handlers} />);

    expect(screen.getByTestId('practice-score')).toHaveTextContent('100');
    expect(screen.getByRole('header', { name: 'Nailed it!' })).toBeTruthy();
  });

  test('marks each expected word as heard or not heard, in words as well as colour', async () => {
    await render(<PracticePanel result={almost} scores={[75]} {...handlers} />);

    expect(screen.getByRole('button', { name: 'Where, heard' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'station?, not heard' })).toBeTruthy();
    expect(within(screen.getByTestId('practice-word-3')).getByText('station?')).toHaveStyle({
      textDecorationLine: 'underline',
    });
  });

  test('shows what was heard, and "(nothing)" when no speech was recognised', async () => {
    const { rerender } = await render(<PracticePanel result={almost} scores={[75]} {...handlers} />);
    expect(screen.getByTestId('practice-heard')).toHaveTextContent('whereisthenation');

    await rerender(<PracticePanel result={scoreAttempt('Good morning', '', 'en')} scores={[0]} {...handlers} />);

    expect(screen.getByTestId('practice-heard')).toHaveTextContent('(nothing)');
    expect(screen.getByRole('header', { name: 'Try again' })).toBeTruthy();
  });

  test('tapping a word asks to hear that word', async () => {
    const user = userEvent.setup();
    await render(<PracticePanel result={almost} scores={[75]} {...handlers} />);

    await user.press(screen.getByTestId('practice-word-3'));

    expect(handlers.onWordPress).toHaveBeenCalledWith('station?');
  });

  test('punctuation on its own is shown but is not a button', async () => {
    await render(<PracticePanel result={scoreAttempt('ありがとう。', 'ありがとう', 'ja')} scores={[100]} characterBased {...handlers} />);

    expect(screen.getByTestId('practice-expected')).toHaveTextContent('ありがとう。');
    expect(screen.getAllByRole('button', { name: /, heard$/ })).toHaveLength(5);
    expect(screen.queryByTestId('practice-word-5')).toBeNull();
  });

  test('dims the word whose audio is loading', async () => {
    await render(<PracticePanel result={almost} scores={[75]} speakingWord="station?" {...handlers} />);

    expect(within(screen.getByTestId('practice-word-3')).getByText('station?')).toHaveStyle({ opacity: 0.4 });
    expect(within(screen.getByTestId('practice-word-0')).getByText('Where')).not.toHaveStyle({ opacity: 0.4 });
  });

  test('shows the scores of earlier attempts so progress is visible', async () => {
    const { rerender } = await render(<PracticePanel result={almost} scores={[75]} {...handlers} />);
    expect(screen.queryByTestId('practice-attempts')).toBeNull();

    await rerender(<PracticePanel result={almost} scores={[40, 60, 75]} {...handlers} />);

    expect(screen.getByTestId('practice-attempts')).toHaveTextContent('Attempts: 40 → 60 → 75');
  });

  test('says the score is a guide, not a grade', async () => {
    await render(<PracticePanel result={almost} scores={[75]} {...handlers} />);

    expect(screen.getByTestId('practice-guide-note')).toHaveTextContent(/a guide, not a grade/);
  });

  test('Play slowly, Try again and Done call their handlers', async () => {
    const user = userEvent.setup();
    await render(<PracticePanel result={almost} scores={[75]} {...handlers} />);

    await user.press(screen.getByRole('button', { name: 'Play slowly' }));
    await user.press(screen.getByRole('button', { name: 'Try again' }));
    await user.press(screen.getByRole('button', { name: 'Done' }));

    expect(handlers.onPlaySlowly).toHaveBeenCalledTimes(1);
    expect(handlers.onTryAgain).toHaveBeenCalledTimes(1);
    expect(handlers.onDone).toHaveBeenCalledTimes(1);
  });

  test('lays Arabic out right-to-left', async () => {
    await render(<PracticePanel result={scoreAttempt('أين المحطة؟', 'اين المحطة', 'ar')} scores={[100]} rtl {...handlers} />);

    expect(screen.getByTestId('practice-expected')).toHaveStyle({ flexDirection: 'row-reverse' });
    expect(screen.getByTestId('practice-heard')).toHaveStyle({ flexDirection: 'row-reverse' });
  });
});
