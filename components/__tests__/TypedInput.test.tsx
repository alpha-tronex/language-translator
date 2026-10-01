import { fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { MAX_TYPED_CHARS } from '../../lib/translatorMachine';
import TypedInput from '../TypedInput';

describe('TypedInput', () => {
  test('submits the trimmed phrase', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    await render(<TypedInput onSubmit={onSubmit} />);

    await user.type(screen.getByTestId('typed-input-field'), '  Where is the library?  ');
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(onSubmit).toHaveBeenCalledWith('Where is the library?');
  });

  test('shows an inline error instead of submitting an empty phrase, and clears it when typing', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    await render(<TypedInput onSubmit={onSubmit} />);

    await user.press(screen.getByTestId('typed-input-submit'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId('typed-input-error')).toHaveTextContent('Type a phrase first.');

    await user.type(screen.getByTestId('typed-input-field'), 'H');
    expect(screen.queryByTestId('typed-input-error')).toBeNull();
  });

  test('counts characters against the 1,000-character API limit', async () => {
    await render(<TypedInput onSubmit={jest.fn()} />);

    await fireEvent.changeText(screen.getByTestId('typed-input-field'), 'Hello');

    expect(screen.getByTestId('typed-input-count')).toHaveTextContent(`5/${MAX_TYPED_CHARS}`);
    expect(screen.getByTestId('typed-input-field').props.maxLength).toBe(MAX_TYPED_CHARS);
  });

  test('right-aligns when the source language is right-to-left', async () => {
    await render(<TypedInput onSubmit={jest.fn()} rtl />);

    expect(screen.getByTestId('typed-input-field')).toHaveStyle({ writingDirection: 'rtl' });
  });
});
