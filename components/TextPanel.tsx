import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  label: string;
  text: string;
  rtl?: boolean;
  testID?: string;
};

export default function TextPanel({ label, text, rtl, testID }: Props) {
  return (
    <View style={styles.card} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.text, rtl && styles.rtl]} testID={testID ? `${testID}-text` : undefined}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    width: '100%',
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  text: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    lineHeight: fontSize.lg * 1.5,
  },
  rtl: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
});
