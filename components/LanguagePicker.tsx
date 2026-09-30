import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SourceLanguage } from '../lib/languages';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  label: string;
  selected: SourceLanguage | null;
  onPress: () => void;
};

export default function LanguagePicker({ label, selected, onPress }: Props) {
  const id = `language-picker-${label.toLowerCase()}`;
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        testID={id}
        accessibilityRole="button"
        accessibilityLabel={`${label} language: ${selected ? selected.label : 'not selected'}`}
        accessibilityHint="Opens the list of languages"
        style={styles.picker}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Text style={selected ? styles.selected : styles.placeholder}>
          {selected ? selected.label : 'Select language'}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  picker: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 52,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selected: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
  },
  placeholder: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
});
