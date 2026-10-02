import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DiffToken, PracticeScore, VERDICT_LABELS, Verdict } from '../lib/practiceScore';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  result: PracticeScore;
  /** Scores of every attempt at this phrase, oldest first (the last one is `result`). */
  scores: number[];
  /** Chinese and Japanese are shown character by character, without gaps. */
  characterBased?: boolean;
  rtl?: boolean;
  /** The word whose audio is loading, if any. */
  speakingWord?: string | null;
  onWordPress: (word: string) => void;
  onPlaySlowly: () => void;
  onTryAgain: () => void;
  onDone: () => void;
};

const VERDICT_COLORS: Record<Verdict, string> = {
  nailed: colors.success,
  almost: colors.warning,
  tryAgain: colors.accent,
};

/**
 * Learning mode result: a 0–100 score, the expected phrase with each word
 * marked as heard or missed (tap a word to hear it), and what the app heard.
 */
export default function PracticePanel({
  result,
  scores,
  characterBased,
  rtl,
  speakingWord,
  onWordPress,
  onPlaySlowly,
  onTryAgain,
  onDone,
}: Props) {
  const tokenRow = [styles.tokens, characterBased && styles.tokensTight, rtl && styles.tokensRtl];

  return (
    <View style={styles.wrapper} testID="practice-panel">
      <View style={styles.scoreRow}>
        <Text
          testID="practice-score"
          style={[styles.score, { color: VERDICT_COLORS[result.verdict] }]}
          accessibilityLabel={`Score ${result.score} out of 100`}
        >
          {result.score}
        </Text>
        <View style={styles.flex}>
          <Text style={styles.heading} accessibilityRole="header" testID="practice-verdict">
            {VERDICT_LABELS[result.verdict]}
          </Text>
          {scores.length > 1 && (
            <Text style={styles.note} testID="practice-attempts">
              Attempts: {scores.join(' → ')}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Expected (tap a word to hear it):</Text>
        <View style={tokenRow} testID="practice-expected">
          {result.expected.map((token, i) =>
            token.status === 'neutral' ? (
              <Text key={i} style={styles.token}>
                {token.text}
              </Text>
            ) : (
              <TouchableOpacity
                key={i}
                testID={`practice-word-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`${token.text}, ${token.status === 'matched' ? 'heard' : 'not heard'}`}
                accessibilityHint="Plays this word"
                onPress={() => onWordPress(token.text)}
              >
                <Text style={[styles.token, expectedStyle(token), speakingWord === token.text && styles.loading]}>
                  {token.text}
                </Text>
              </TouchableOpacity>
            )
          )}
        </View>
        <TouchableOpacity
          testID="practice-play-slowly-button"
          accessibilityRole="button"
          accessibilityLabel="Play slowly"
          accessibilityHint="Plays the whole translation at a slower speed"
          onPress={onPlaySlowly}
        >
          <Text style={styles.link}>▶  Play slowly</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>We heard:</Text>
        <View style={tokenRow} testID="practice-heard">
          {result.heard.length === 0 ? (
            <Text style={[styles.token, styles.extra]}>(nothing)</Text>
          ) : (
            result.heard.map((token, i) => (
              <Text key={i} style={[styles.token, token.status === 'extra' && styles.extra]}>
                {token.text}
              </Text>
            ))
          )}
        </View>
      </View>

      <Text style={styles.note} testID="practice-guide-note">
        The score is a guide, not a grade. Speech recognition tidies up what it hears, so small pronunciation slips can
        go unnoticed.
      </Text>

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

/** Missed words are underlined as well as amber, so colour is not the only cue. */
function expectedStyle(token: DiffToken) {
  return token.status === 'matched' ? styles.matched : styles.missed;
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  flex: { flex: 1 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  score: {
    fontSize: 44,
    fontWeight: '700',
    minWidth: 72,
    textAlign: 'center',
  },
  heading: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  tokens: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.sm,
    rowGap: spacing.xs,
  },
  tokensTight: { columnGap: 0 },
  tokensRtl: { flexDirection: 'row-reverse' },
  token: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    lineHeight: 30,
  },
  matched: { color: colors.success },
  missed: { color: colors.warning, textDecorationLine: 'underline' },
  extra: { color: colors.textSecondary },
  loading: { opacity: 0.4 },
  link: {
    color: colors.teal,
    fontSize: fontSize.md,
    fontWeight: '600',
    paddingTop: spacing.xs,
  },
  note: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    lineHeight: 18,
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
