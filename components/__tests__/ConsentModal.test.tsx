import { render, screen, userEvent } from '@testing-library/react-native';
import ConsentModal from '../ConsentModal';

describe('ConsentModal', () => {
  test('explains that audio and text are sent to OpenAI and links the privacy policy', async () => {
    await render(<ConsentModal visible onAgree={jest.fn()} onDecline={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Before you record' })).toBeTruthy();
    expect(screen.getByText(/sent to OpenAI Whisper/)).toBeTruthy();
    expect(screen.getByText(/\/privacy/)).toBeTruthy();
  });

  test('Agree calls onAgree and not onDecline', async () => {
    const user = userEvent.setup();
    const onAgree = jest.fn();
    const onDecline = jest.fn();
    await render(<ConsentModal visible onAgree={onAgree} onDecline={onDecline} />);

    await user.press(screen.getByTestId('consent-agree-button'));

    expect(onAgree).toHaveBeenCalledTimes(1);
    expect(onDecline).not.toHaveBeenCalled();
  });

  test('Decline calls onDecline and not onAgree, so nothing is recorded', async () => {
    const user = userEvent.setup();
    const onAgree = jest.fn();
    const onDecline = jest.fn();
    await render(<ConsentModal visible onAgree={onAgree} onDecline={onDecline} />);

    await user.press(screen.getByRole('button', { name: 'Decline' }));

    expect(onDecline).toHaveBeenCalledTimes(1);
    expect(onAgree).not.toHaveBeenCalled();
  });
});
