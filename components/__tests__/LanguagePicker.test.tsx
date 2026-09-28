import { render, screen, userEvent } from '@testing-library/react-native';
import { Language } from '../../lib/languages';
import LanguagePicker from '../LanguagePicker';

const spanish: Language = { code: 'es', label: 'Spanish', nativeLabel: 'Español' };

describe('LanguagePicker', () => {
  test('shows a placeholder when no language is selected yet', async () => {
    await render(<LanguagePicker label="From" selected={null} onPress={jest.fn()} />);

    expect(screen.getByText('From')).toBeTruthy();
    expect(screen.getByText('Select language')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'From language: not selected' })).toBeTruthy();
  });

  test('shows the selected language and includes it in the accessible name', async () => {
    await render(<LanguagePicker label="To" selected={spanish} onPress={jest.fn()} />);

    expect(screen.getByTestId('language-picker-to')).toHaveTextContent('Spanish▾');
    expect(screen.getByRole('button', { name: 'To language: Spanish' })).toBeTruthy();
  });

  test('calls onPress so the screen can open the language list', async () => {
    const user = userEvent.setup();
    const onPress = jest.fn();
    await render(<LanguagePicker label="From" selected={null} onPress={onPress} />);

    await user.press(screen.getByTestId('language-picker-from'));

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
