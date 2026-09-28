import { render, screen, userEvent } from '@testing-library/react-native';
import AlertModal from '../AlertModal';

describe('AlertModal', () => {
  test('shows the title as a header and the message', async () => {
    await render(<AlertModal visible title="Microphone error" message="Try again." onClose={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Microphone error' })).toBeTruthy();
    expect(screen.getByTestId('alert-modal-message')).toHaveTextContent('Try again.');
  });

  test('single-button mode: "Got it" closes the alert', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    await render(<AlertModal visible title="t" message="m" onClose={onClose} />);

    expect(screen.queryByTestId('alert-modal-confirm-button')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Got it' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('confirm mode: Cancel only closes, it does not run the confirmed action', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    await render(<AlertModal visible title="Change language?" message="m" onClose={onClose} onConfirm={onConfirm} />);

    await user.press(screen.getByTestId('alert-modal-cancel-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('confirm mode: the confirm button closes the alert and runs the action', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    await render(
      <AlertModal visible title="t" message="m" confirmLabel="Clear it" onClose={onClose} onConfirm={onConfirm} />
    );

    await user.press(screen.getByRole('button', { name: 'Clear it' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  test('renders nothing when not visible', async () => {
    await render(<AlertModal visible={false} title="Hidden" message="m" onClose={jest.fn()} />);

    expect(screen.queryByText('Hidden')).toBeNull();
  });
});
