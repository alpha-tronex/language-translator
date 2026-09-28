import { render, screen, userEvent } from '@testing-library/react-native';
import RecordButton from '../RecordButton';

describe('RecordButton', () => {
  test('offers to start recording when idle and calls onPress when tapped', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<RecordButton isRecording={false} onPress={onPress} />);

    const button = screen.getByRole('button', { name: 'Start recording' });
    expect(button.props.accessibilityHint).toBe('Records what you say');
    await user.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('switches its label to "Stop recording" while recording, so screen readers announce the change', async () => {
    await render(<RecordButton isRecording onPress={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Stop recording' })).toBeTruthy();
    expect(screen.getByText('■')).toBeTruthy();
  });

  test('ignores taps while disabled (e.g. during transcription)', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<RecordButton isRecording={false} onPress={onPress} disabled />);

    const button = screen.getByTestId('record-button');
    expect(button).toBeDisabled();
    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });
});
