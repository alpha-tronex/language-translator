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

describe('InputModeToggle with a text-only source language', () => {
  test('disables Speak and explains why', async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    await render(<InputModeToggle mode="text" onChange={onChange} voiceUnavailableFor="Wolof" />);

    expect(screen.getByTestId('input-mode-note')).toHaveTextContent("Wolof can't be spoken into the app yet, so type your phrase.");
    expect(screen.getByTestId('input-mode-voice')).toBeDisabled();
    expect(screen.getByTestId('input-mode-text')).toBeEnabled();
    await user.press(screen.getByTestId('input-mode-voice'));

    expect(onChange).not.toHaveBeenCalled();
  });

  test('shows no note for a language that can be spoken', async () => {
    await render(<InputModeToggle mode="voice" onChange={jest.fn()} voiceUnavailableFor={null} />);

    expect(screen.queryByTestId('input-mode-note')).toBeNull();
    expect(screen.getByTestId('input-mode-voice')).toBeEnabled();
  });
});
