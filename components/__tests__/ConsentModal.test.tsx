import { render, screen, userEvent } from '@testing-library/react-native';
import ConsentModal from '../ConsentModal';

describe('ConsentModal', () => {
  test('explains what is sent to OpenAI and links the privacy policy', async () => {
    await render(<ConsentModal visible onAgree={jest.fn()} onDecline={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Before you start' })).toBeTruthy();
    expect(screen.getByText(/voice recording .* is sent to OpenAI/)).toBeTruthy();
    expect(screen.getByText(/speak or type is sent to OpenAI for translation/)).toBeTruthy();
    expect(screen.getByText(/\/privacy/)).toBeTruthy();
  });

  test('says Wolof and Bambara audio comes from our own server, not OpenAI', async () => {
    await render(<ConsentModal visible onAgree={jest.fn()} onDecline={jest.fn()} />);

    expect(screen.getByText(/For Wolof and Bambara, it is sent to our own voice server/)).toBeTruthy();
    expect(screen.getByText(/a server we operate/)).toBeTruthy();
  });

  test('says practice attempts are sent and that the practice list stays on the device', async () => {
    await render(<ConsentModal visible onAgree={jest.fn()} onDecline={jest.fn()} />);

    expect(screen.getByText(/or a practice attempt/)).toBeTruthy();
    expect(screen.getByText(/practice list, scores and streak are stored only on this device/)).toBeTruthy();
  });

  test('names no specific AI model, so the notice stays true when a model is swapped', async () => {
    await render(<ConsentModal visible onAgree={jest.fn()} onDecline={jest.fn()} />);

    expect(screen.queryByText(/Whisper|GPT-4o/)).toBeNull();
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
