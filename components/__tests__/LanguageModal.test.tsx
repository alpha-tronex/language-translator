import { render, screen, userEvent } from '@testing-library/react-native';
import { SUPPORTED_LANGUAGES } from '../../lib/languages';
import LanguageModal from '../LanguageModal';

const arabic = SUPPORTED_LANGUAGES.find((l) => l.code === 'ar')!;

describe('LanguageModal', () => {
  test('lists every supported language with its native name', async () => {
    await render(<LanguageModal visible selected={null} onSelect={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Select language' })).toBeTruthy();
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(screen.getByTestId(`language-option-${lang.code}`)).toHaveTextContent(`${lang.label}${lang.nativeLabel}`);
    }
  });

  test('marks the currently selected language as selected for screen readers', async () => {
    await render(<LanguageModal visible selected={arabic} onSelect={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByTestId('language-option-ar')).toBeSelected();
    expect(screen.getByTestId('language-option-en')).not.toBeSelected();
  });

  test('selecting a language reports it and closes the list', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await render(<LanguageModal visible selected={null} onSelect={onSelect} onClose={onClose} />);

    await user.press(screen.getByTestId('language-option-es'));

    expect(onSelect).toHaveBeenCalledWith(SUPPORTED_LANGUAGES.find((l) => l.code === 'es'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('tapping the dimmed background closes without selecting', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    const onClose = jest.fn();
    await render(<LanguageModal visible selected={null} onSelect={onSelect} onClose={onClose} />);

    await user.press(screen.getByTestId('language-modal-overlay'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  test('renders nothing when not visible', async () => {
    await render(<LanguageModal visible={false} selected={null} onSelect={jest.fn()} onClose={jest.fn()} />);

    expect(screen.queryByText('Select language')).toBeNull();
  });
});
