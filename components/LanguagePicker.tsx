import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Language } from '../lib/types';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  label: string;
  selected: Language | null;
  onPress: () => void;
};

export default function LanguagePicker({ label, selected, onPress }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.picker} onPress={onPress} activeOpacity={0.7}>
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
