import { render, screen, userEvent } from '@testing-library/react-native';
import LearnActions from '../LearnActions';

describe('LearnActions', () => {
  test('offers to hear the translation slowly and to practice saying it', async () => {
    const user = userEvent.setup();
    const onPlaySlowly = jest.fn();
    const onPractice = jest.fn();
    await render(<LearnActions saved={false} onToggleSaved={jest.fn()} onPlaySlowly={onPlaySlowly} onPractice={onPractice} />);

    await user.press(screen.getByRole('button', { name: 'Play slowly' }));
    expect(onPlaySlowly).toHaveBeenCalledTimes(1);
    expect(onPractice).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Practice saying it' }));
    expect(onPractice).toHaveBeenCalledTimes(1);
  });

  test('an unsaved translation shows an empty star that saves it', async () => {
    const user = userEvent.setup();
    const onToggleSaved = jest.fn();
    await render(<LearnActions saved={false} onToggleSaved={onToggleSaved} onPlaySlowly={jest.fn()} onPractice={jest.fn()} />);

    const star = screen.getByRole('button', { name: 'Save to practice list' });
    expect(star).toHaveTextContent('☆');
    expect(star).not.toBeSelected();
    await user.press(star);

    expect(onToggleSaved).toHaveBeenCalledTimes(1);
  });

  test('a saved translation shows a filled star that removes it', async () => {
    await render(<LearnActions saved onToggleSaved={jest.fn()} onPlaySlowly={jest.fn()} onPractice={jest.fn()} />);

    const star = screen.getByRole('button', { name: 'Remove from practice list' });
    expect(star).toHaveTextContent('★');
    expect(star).toBeSelected();
  });
});

describe('LearnActions for a language that cannot be practiced', () => {
  test('hides Practice but keeps the star and slow playback', async () => {
    await render(<LearnActions saved={false} onToggleSaved={jest.fn()} onPlaySlowly={jest.fn()} />);

    expect(screen.queryByTestId('home-practice-button')).toBeNull();
    expect(screen.getByTestId('home-star-button')).toBeTruthy();
    expect(screen.getByTestId('home-play-slowly-button')).toBeTruthy();
  });

  test('says when the audio is missing and that Play will try again', async () => {
    const { rerender } = await render(<LearnActions saved={false} onToggleSaved={jest.fn()} onPlaySlowly={jest.fn()} audioMissing />);
    expect(screen.getByTestId('home-audio-missing')).toHaveTextContent('Audio temporarily unavailable. Tap Play to try again.');

    await rerender(<LearnActions saved={false} onToggleSaved={jest.fn()} onPlaySlowly={jest.fn()} />);
    expect(screen.queryByTestId('home-audio-missing')).toBeNull();
  });
});
