import { render, screen, userEvent } from '@testing-library/react-native';
import PracticePanel from '../PracticePanel';

describe('PracticePanel', () => {
  const props = {
    expected: '¿Dónde está la estación?',
    heard: 'Donde esta la estacion',
    onTryAgain: jest.fn(),
    onDone: jest.fn(),
  };

  afterEach(() => jest.clearAllMocks());

  test('shows what was expected next to what was heard', async () => {
    await render(<PracticePanel {...props} />);

    expect(screen.getByRole('header', { name: 'How did you do?' })).toBeTruthy();
    expect(screen.getByTestId('practice-expected-text')).toHaveTextContent('¿Dónde está la estación?');
    expect(screen.getByTestId('practice-heard-text')).toHaveTextContent('Donde esta la estacion');
  });

  test('says "(nothing)" when no speech was recognised', async () => {
    await render(<PracticePanel {...props} heard="" />);

    expect(screen.getByTestId('practice-heard-text')).toHaveTextContent('(nothing)');
  });

  test('Try again and Done call their handlers', async () => {
    const user = userEvent.setup();
    await render(<PracticePanel {...props} />);

    await user.press(screen.getByRole('button', { name: 'Try again' }));
    await user.press(screen.getByRole('button', { name: 'Done' }));

    expect(props.onTryAgain).toHaveBeenCalledTimes(1);
    expect(props.onDone).toHaveBeenCalledTimes(1);
  });

  test('renders Arabic right-to-left', async () => {
    await render(<PracticePanel {...props} expected="أين المحطة؟" heard="اين المحطة" rtl />);

    expect(screen.getByTestId('practice-expected-text')).toHaveStyle({ writingDirection: 'rtl' });
    expect(screen.getByTestId('practice-heard-text')).toHaveStyle({ writingDirection: 'rtl' });
  });
});
