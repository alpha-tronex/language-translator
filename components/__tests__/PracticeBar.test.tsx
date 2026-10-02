import { render, screen, userEvent } from '@testing-library/react-native';
import PracticeBar from '../PracticeBar';

describe('PracticeBar', () => {
  test('shows how many phrases are saved and opens the list', async () => {
    const user = userEvent.setup();
    const onOpen = jest.fn();
    await render(<PracticeBar count={5} streak={null} onOpen={onOpen} />);

    const button = screen.getByRole('button', { name: 'Practice list, 5 phrases' });
    expect(button).toHaveTextContent('★ Practice list (5)');
    await user.press(button);

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test('says "1 phrase", not "1 phrases"', async () => {
    await render(<PracticeBar count={1} streak={null} onOpen={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Practice list, 1 phrase' })).toBeTruthy();
  });

  test('shows the streak when there is one', async () => {
    await render(<PracticeBar count={0} streak={4} onOpen={jest.fn()} />);

    expect(screen.getByTestId('home-streak')).toHaveTextContent('4-day streak');
    expect(screen.getByLabelText('4-day practice streak')).toBeTruthy();
  });

  test.each([
    ['the feature is off', null],
    ['there is no streak yet', 0],
  ])('hides the streak when %s', async (_why, streak) => {
    await render(<PracticeBar count={0} streak={streak} onOpen={jest.fn()} />);

    expect(screen.queryByTestId('home-streak')).toBeNull();
  });
});
