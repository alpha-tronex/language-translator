import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  onPlaySlowly: () => void;
  onPractice: () => void;
};

/** Learning mode buttons under a translation: hear it slowly, then say it back. */
export default function LearnActions({ onPlaySlowly, onPractice }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        testID="home-play-slowly-button"
        accessibilityRole="button"
        accessibilityLabel="Play slowly"
        accessibilityHint="Plays the translation at a slower speed"
        style={styles.button}
        onPress={onPlaySlowly}
      >
        <Text style={styles.label}>▶  Play slowly</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="home-practice-button"
        accessibilityRole="button"
        accessibilityLabel="Practice saying it"
        accessibilityHint="Records you saying the translation and scores what the app heard"
        style={styles.button}
        onPress={onPractice}
      >
        <Text style={styles.label}>Practice saying it</Text>
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
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: colors.teal,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
