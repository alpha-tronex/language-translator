import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  /** Whether this translation is on the practice list. */
  saved: boolean;
  onToggleSaved: () => void;
  onPlaySlowly: () => void;
  onPractice: () => void;
};

/** Learning mode buttons under a translation: star it, hear it slowly, say it back. */
export default function LearnActions({ saved, onToggleSaved, onPlaySlowly, onPractice }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        testID="home-star-button"
        accessibilityRole="button"
        accessibilityLabel={saved ? 'Remove from practice list' : 'Save to practice list'}
        accessibilityHint={saved ? 'Takes this phrase off your practice list' : 'Keeps this phrase so you can practice it later'}
        accessibilityState={{ selected: saved }}
        style={[styles.button, styles.star, saved && styles.starOn]}
        onPress={onToggleSaved}
      >
        <Text style={[styles.starLabel, saved && styles.starLabelOn]}>{saved ? '★' : '☆'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="home-play-slowly-button"
        accessibilityRole="button"
        accessibilityLabel="Play slowly"
        accessibilityHint="Plays the translation at a slower speed"
        style={[styles.button, styles.wide]}
        onPress={onPlaySlowly}
      >
        <Text style={styles.label}>▶  Slowly</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="home-practice-button"
        accessibilityRole="button"
        accessibilityLabel="Practice saying it"
        accessibilityHint="Records you saying the translation and scores what the app heard"
        style={[styles.button, styles.wide]}
        onPress={onPractice}
      >
        <Text style={styles.label}>Practice</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  button: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wide: { flex: 1 },
  star: { width: 52 },
  starOn: { backgroundColor: colors.teal },
  starLabel: {
    color: colors.teal,
    fontSize: fontSize.xl,
  },
  starLabelOn: { color: colors.background },
  label: {
    color: colors.teal,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
