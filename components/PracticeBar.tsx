import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  /** Phrases on the practice list. */
  count: number;
  /** Days of practice in a row; null hides the streak (feature flag off). */
  streak: number | null;
  onOpen: () => void;
};

/** Home screen strip: the way into the practice list, plus the daily streak. */
export default function PracticeBar({ count, streak, onOpen }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        testID="home-practice-list-button"
        accessibilityRole="button"
        accessibilityLabel={`Practice list, ${count} ${count === 1 ? 'phrase' : 'phrases'}`}
        accessibilityHint="Opens the phrases you saved to practice"
        style={styles.link}
        onPress={onOpen}
      >
        <Text style={styles.linkLabel}>★  Practice list ({count})</Text>
      </TouchableOpacity>
      {streak !== null && streak > 0 && (
        <View style={styles.streak} testID="home-streak" accessible accessibilityLabel={`${streak}-day practice streak`}>
          <Text style={styles.streakLabel}>{streak}-day streak</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  link: { paddingVertical: spacing.sm },
  linkLabel: {
    color: colors.teal,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  streak: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  streakLabel: {
    color: colors.warning,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
