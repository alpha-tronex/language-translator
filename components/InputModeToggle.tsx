import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { InputMode } from '../lib/translatorMachine';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
  disabled?: boolean;
  /** Name of a source language that can only be typed (Wolof, Bambara); disables Speak and says why. */
  voiceUnavailableFor?: string | null;
};

const OPTIONS: { mode: InputMode; label: string; hint: string }[] = [
  { mode: 'voice', label: 'Speak', hint: 'Record the phrase with the microphone' },
  { mode: 'text', label: 'Type', hint: 'Type the phrase instead of speaking it' },
];

/** Speak / Type switch for how the phrase to translate is entered. */
export default function InputModeToggle({ mode, onChange, disabled, voiceUnavailableFor }: Props) {
  return (
    <View>
      <View style={styles.row} accessibilityRole="radiogroup">
        {OPTIONS.map((option) => {
          const selected = option.mode === mode;
          const off = !!disabled || (option.mode === 'voice' && !!voiceUnavailableFor);
          return (
            <TouchableOpacity
              key={option.mode}
              testID={`input-mode-${option.mode}`}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityHint={option.hint}
              accessibilityState={{ selected, disabled: off }}
              disabled={off}
              onPress={() => !selected && onChange(option.mode)}
              style={[styles.option, selected && styles.optionSelected]}
            >
              <Text style={[styles.label, selected && styles.labelSelected, off && !selected && styles.labelOff]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {!!voiceUnavailableFor && (
        <Text style={styles.note} testID="input-mode-note">
          {voiceUnavailableFor} can&apos;t be spoken into the app yet, so type your phrase.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  option: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  optionSelected: {
    backgroundColor: colors.surface,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  labelOff: {
    opacity: 0.4,
  },
  note: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  labelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
