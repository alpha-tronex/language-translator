import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { findLanguage } from '../lib/languages';
import { Mastery, MASTERY_LABELS, masteryOf, SavedPhrase } from '../lib/practiceList';
import { colors, fontSize, radius, spacing } from '../lib/theme';

type Props = {
  phrase: SavedPhrase;
  onOpen: (phrase: SavedPhrase) => void;
  onDelete: (phrase: SavedPhrase) => void;
};

const DOT_COLORS: Record<Mastery, string> = {
  new: colors.border,
  practicing: colors.warning,
  mastered: colors.success,
};

/** "EN → ES · Best 90 · 3 attempts", or "… · Not practiced yet". */
export function phraseSummary(phrase: SavedPhrase): string {
  const code = (lang: string) => (lang === 'auto' ? '?' : lang.toUpperCase());
  const languages = `${code(phrase.sourceLang)} → ${code(phrase.targetLang)}`;
  if (phrase.attemptCount === 0 || phrase.bestScore === null) return `${languages} · ${MASTERY_LABELS.new}`;
  const attempts = `${phrase.attemptCount} ${phrase.attemptCount === 1 ? 'attempt' : 'attempts'}`;
  return `${languages} · Best ${phrase.bestScore} · ${attempts}`;
}

/**
 * One saved phrase: tap to open it for practice, swipe left to reveal
 * Delete. Screen readers get the same delete through an accessibility action.
 */
export default function PracticeListItem({ phrase, onOpen, onDelete }: Props) {
  const mastery = masteryOf(phrase);
  const rtl = !!findLanguage(phrase.targetLang)?.rtl;

  return (
    <Swipeable
      overshootRight={false}
      renderRightActions={() => (
        <TouchableOpacity
          testID={`practice-list-delete-${phrase.id}`}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${phrase.translation}`}
          accessibilityHint="Removes this phrase from your practice list"
          style={styles.delete}
          onPress={() => onDelete(phrase)}
        >
          <Text style={styles.deleteLabel}>Delete</Text>
        </TouchableOpacity>
      )}
    >
      <TouchableOpacity
        testID={`practice-list-item-${phrase.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${phrase.translation}. ${MASTERY_LABELS[mastery]}`}
        accessibilityHint="Opens this phrase to hear it and practice"
        accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'delete') onDelete(phrase);
        }}
        activeOpacity={0.7}
        style={styles.row}
        onPress={() => onOpen(phrase)}
      >
        <View
          testID={`practice-list-mastery-${phrase.id}`}
          accessibilityLabel={MASTERY_LABELS[mastery]}
          style={[styles.dot, { backgroundColor: DOT_COLORS[mastery] }]}
        />
        <View style={styles.text}>
          <Text style={[styles.translation, rtl && styles.rtl]} numberOfLines={2}>
            {phrase.translation}
          </Text>
          {phrase.sourceText !== '' && (
            <Text style={styles.source} numberOfLines={1}>
              {phrase.sourceText}
            </Text>
          )}
          <Text style={styles.meta}>{phraseSummary(phrase)}</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: radius.full,
  },
  text: {
    flex: 1,
    gap: spacing.xs,
  },
  translation: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  rtl: {
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  source: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  meta: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  delete: {
    backgroundColor: colors.destructive,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginLeft: spacing.sm,
  },
  deleteLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
