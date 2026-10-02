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
