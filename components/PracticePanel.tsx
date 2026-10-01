import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';
import TextPanel from './TextPanel';

type Props = {
  expected: string;
  heard: string;
  rtl?: boolean;
  onTryAgain: () => void;
  onDone: () => void;
};

/**
 * Learning mode result: what the student should have said next to what the
 * app heard. Scoring and word-by-word highlighting come next (v2 Week 6).
 */
export default function PracticePanel({ expected, heard, rtl, onTryAgain, onDone }: Props) {
  return (
    <View style={styles.wrapper} testID="practice-panel">
      <Text style={styles.heading} accessibilityRole="header">
        How did you do?
      </Text>
      <TextPanel label="Expected:" text={expected} rtl={rtl} testID="practice-expected" />
      <TextPanel label="We heard:" text={heard || '(nothing)'} rtl={rtl} testID="practice-heard" />
      <View style={styles.row}>
        <TouchableOpacity
          testID="practice-done-button"
          accessibilityRole="button"
          accessibilityLabel="Done"
          accessibilityHint="Goes back to the translation"
          style={[styles.button, styles.secondary]}
          onPress={onDone}
        >
          <Text style={styles.secondaryLabel}>Done</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="practice-try-again-button"
          accessibilityRole="button"
          accessibilityLabel="Try again"
          accessibilityHint="Records another attempt at saying the translation"
          style={[styles.button, styles.primary]}
          onPress={onTryAgain}
        >
          <Text style={styles.primaryLabel}>Try again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  primary: {
    backgroundColor: colors.teal,
  },
  secondaryLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  primaryLabel: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
