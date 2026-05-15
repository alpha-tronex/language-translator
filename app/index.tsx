import { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import LanguagePicker from '../components/LanguagePicker';
import RecordButton from '../components/RecordButton';
import { SUPPORTED_LANGUAGES, Language } from '../lib/languages';
import { colors, fontSize, spacing } from '../lib/theme';
import { AppState } from '../lib/types';

export default function HomeScreen() {
  const [fromLang, setFromLang] = useState<Language | null>(null);
  const [toLang,   setToLang]   = useState<Language | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');

  const canRecord = fromLang !== null && toLang !== null && appState === 'idle';
  const isRecording = appState === 'recording';

  function handleRecordPress() {
    if (isRecording) {
      setAppState('idle'); // will wire up real stop logic in Week 2
    } else {
      setAppState('recording'); // will wire up real record logic in Week 2
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* Title */}
        <Text style={styles.title}>Language Translator</Text>

        {/* Language pickers */}
        <View style={styles.pickerRow}>
          <LanguagePicker
            label="From"
            selected={fromLang}
            onPress={() => {
              // language selection modal goes here in Week 3
              setFromLang(SUPPORTED_LANGUAGES[0]);
            }}
          />
          <Text style={styles.swap}>⇄</Text>
          <LanguagePicker
            label="To"
            selected={toLang}
            onPress={() => {
              setToLang(SUPPORTED_LANGUAGES[1]);
            }}
          />
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Record button */}
        <View style={styles.recordArea}>
          <RecordButton
            isRecording={isRecording}
            onPress={handleRecordPress}
            disabled={!canRecord}
          />
          <Text style={styles.recordLabel}>
            {isRecording ? 'Tap to stop' : canRecord ? 'Tap to record' : 'Select languages to start'}
          </Text>
        </View>

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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  swap: {
    color: colors.textSecondary,
    fontSize: fontSize.lg,
    paddingBottom: 14,
  },
  spacer: {
    flex: 1,
  },
  recordArea: {
    alignItems: 'center',
    paddingBottom: spacing.xxl,
    gap: spacing.md,
  },
  recordLabel: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
});
