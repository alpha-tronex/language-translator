import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PracticeListItem from '../components/PracticeListItem';
import { useAppState } from '../lib/AppState';
import { SavedPhrase } from '../lib/practiceList';
import { colors, fontSize, radius, spacing } from '../lib/theme';

/**
 * The practice list: starred translations with a mastery dot each. Layout
 * only; the list lives in lib/usePracticeList.ts and opening a phrase is
 * lib/useTranslator.ts (tests mock lib/AppState, rule T4).
 */
export default function PracticeListScreen() {
  const router = useRouter();
  const { practice, translator } = useAppState();
  const { phrases } = practice.data;

  function open(phrase: SavedPhrase) {
    void translator.openSaved(phrase);
    router.back();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            testID="practice-list-back-button"
            accessibilityRole="button"
            accessibilityLabel="Back"
            accessibilityHint="Goes back to the translator"
            onPress={() => router.back()}
          >
            <Text style={styles.back}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.title} accessibilityRole="header">
            Practice list
          </Text>
        </View>

        {practice.status === 'loading' && (
          <View style={styles.center} testID="practice-list-loading">
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}

        {practice.status === 'error' && (
          <View style={styles.center} testID="practice-list-error">
            <Text style={styles.message}>Couldn&apos;t load your practice list.</Text>
            <TouchableOpacity
              testID="practice-list-retry-button"
              accessibilityRole="button"
              accessibilityLabel="Retry"
              accessibilityHint="Tries to load your practice list again"
              style={styles.retry}
              onPress={() => void practice.reload()}
            >
              <Text style={styles.retryLabel}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {practice.status === 'ready' && phrases.length === 0 && (
          <View style={styles.center} testID="practice-list-empty">
            <Text style={styles.message}>Nothing saved yet.</Text>
            <Text style={styles.hint}>Translate a phrase, then tap ☆ to keep it here for practice.</Text>
          </View>
        )}

        {practice.status === 'ready' && phrases.length > 0 && (
          <FlatList
            testID="practice-list"
            data={phrases}
            keyExtractor={(phrase) => phrase.id}
            contentContainerStyle={styles.list}
            ListFooterComponent={<Text style={styles.hint}>Tap a phrase to practice it. Swipe left to delete.</Text>}
            renderItem={({ item }) => (
              <PracticeListItem phrase={item} onOpen={open} onDelete={(phrase) => practice.remove(phrase.id)} />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  back: {
    color: colors.teal,
    fontSize: fontSize.md,
    fontWeight: '600',
    paddingVertical: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  message: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    textAlign: 'center',
  },
  hint: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 18,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  retry: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryLabel: {
    color: colors.teal,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});
