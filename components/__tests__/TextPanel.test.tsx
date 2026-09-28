import { render, screen } from '@testing-library/react-native';
import TextPanel from '../TextPanel';

describe('TextPanel', () => {
  test('shows the label and the text', async () => {
    await render(<TextPanel label="You said:" text="Where is the station?" testID="transcript-panel" />);

    expect(screen.getByText('You said:')).toBeTruthy();
    expect(screen.getByTestId('transcript-panel-text')).toHaveTextContent('Where is the station?');
  });

  test('right-aligns right-to-left text such as Arabic', async () => {
    await render(<TextPanel label="Translation:" text="أين المحطة؟" rtl testID="translation-panel" />);

    expect(screen.getByTestId('translation-panel-text')).toHaveStyle({ writingDirection: 'rtl', textAlign: 'right' });
  });

  test('keeps left-to-right text in the default direction', async () => {
    await render(<TextPanel label="Translation:" text="¿Dónde está?" testID="translation-panel" />);

    expect(screen.getByTestId('translation-panel-text')).not.toHaveStyle({ writingDirection: 'rtl' });
  });
});
