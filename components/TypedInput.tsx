import { useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MAX_TYPED_CHARS, typedTextError } from '../lib/translatorMachine';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  rtl?: boolean;
};

/** Type a phrase instead of recording it (e.g. preparing lesson phrases). */
export default function TypedInput({ onSubmit, disabled, rtl }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    const problem = typedTextError(text);
    if (problem) {
      setError(problem);
      return;
    }
    Keyboard.dismiss();
    onSubmit(text.trim());
  }

  return (
    <View style={styles.wrapper}>
      <TextInput
        testID="typed-input-field"
        accessibilityLabel="Phrase to translate"
        accessibilityHint="Type the phrase you want translated"
        style={[styles.input, rtl && styles.rtl]}
        value={text}
        onChangeText={(value) => {
          setText(value);
          if (error) setError(null);
        }}
        placeholder="Type a phrase…"
        placeholderTextColor={colors.textSecondary}
        multiline
        // The keyboard's Return key reads "done" and closes the keyboard
        // instead of adding a line; phrases are short, so no newlines needed.
        returnKeyType="done"
        submitBehavior="blurAndSubmit"
        maxLength={MAX_TYPED_CHARS}
        editable={!disabled}
      />
      <View style={styles.footer}>
        <Text style={styles.count} testID="typed-input-count">
          {text.length}/{MAX_TYPED_CHARS}
        </Text>
        {error && (
          <Text style={styles.error} testID="typed-input-error" accessibilityLiveRegion="polite">
            {error}
          </Text>
        )}
      </View>
      <TouchableOpacity
        testID="typed-input-submit"
        accessibilityRole="button"
        accessibilityLabel="Continue"
        accessibilityHint="Shows your phrase so you can translate it"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        style={[styles.button, disabled && styles.disabled]}
        onPress={submit}
      >
        <Text style={styles.buttonLabel}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  input: {
    minHeight: 96,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    textAlignVertical: 'top',
  },
  rtl: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  count: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  error: {
    color: colors.accent,
    fontSize: fontSize.sm,
  },
  button: {
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  buttonLabel: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
