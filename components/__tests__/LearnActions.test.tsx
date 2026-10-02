import { render, screen, userEvent } from '@testing-library/react-native';
import LearnActions from '../LearnActions';

describe('LearnActions', () => {
  test('offers to hear the translation slowly and to practice saying it', async () => {
    const user = userEvent.setup();
    const onPlaySlowly = jest.fn();
    const onPractice = jest.fn();
    await render(<LearnActions onPlaySlowly={onPlaySlowly} onPractice={onPractice} />);

    await user.press(screen.getByRole('button', { name: 'Play slowly' }));
    expect(onPlaySlowly).toHaveBeenCalledTimes(1);
    expect(onPractice).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Practice saying it' }));
    expect(onPractice).toHaveBeenCalledTimes(1);
  });
});
