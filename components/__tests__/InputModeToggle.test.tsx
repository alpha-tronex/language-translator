import { render, screen, userEvent } from '@testing-library/react-native';
import InputModeToggle from '../InputModeToggle';

describe('InputModeToggle', () => {
  test('marks the current mode as selected for screen readers', async () => {
    await render(<InputModeToggle mode="voice" onChange={jest.fn()} />);

    expect(screen.getByTestId('input-mode-voice')).toBeSelected();
    expect(screen.getByTestId('input-mode-text')).not.toBeSelected();
  });

  test('switches to Type', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await render(<InputModeToggle mode="voice" onChange={onChange} />);

    await user.press(screen.getByRole('radio', { name: 'Type' }));

    expect(onChange).toHaveBeenCalledWith('text');
  });

  test('pressing the mode that is already selected does nothing', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await render(<InputModeToggle mode="text" onChange={onChange} />);

    await user.press(screen.getByTestId('input-mode-text'));

    expect(onChange).not.toHaveBeenCalled();
  });

  test('cannot switch while disabled', async () => {
    await render(<InputModeToggle mode="voice" onChange={jest.fn()} disabled />);

    expect(screen.getByTestId('input-mode-text')).toBeDisabled();
  });
});
