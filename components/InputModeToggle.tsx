import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { InputMode } from '../lib/translatorMachine';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  mode: InputMode;
  onChange: (mode: InputMode) => void;
  disabled?: boolean;
};

const OPTIONS: { mode: InputMode; label: string; hint: string }[] = [
  { mode: 'voice', label: 'Speak', hint: 'Record the phrase with the microphone' },
  { mode: 'text', label: 'Type', hint: 'Type the phrase instead of speaking it' },
];

/** Speak / Type switch for how the phrase to translate is entered. */
export default function InputModeToggle({ mode, onChange, disabled }: Props) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {OPTIONS.map((option) => {
        const selected = option.mode === mode;
        return (
          <TouchableOpacity
            key={option.mode}
            testID={`input-mode-${option.mode}`}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityHint={option.hint}
            accessibilityState={{ selected, disabled: !!disabled }}
            disabled={disabled}
            onPress={() => !selected && onChange(option.mode)}
            style={[styles.option, selected && styles.optionSelected]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
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
  labelSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
