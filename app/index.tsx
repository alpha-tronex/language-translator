import { Audio } from 'expo-av';
import { useRef, useState } from 'react';
import {
  Alert,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LanguagePicker from '../components/LanguagePicker';
import RecordButton from '../components/RecordButton';
import { SUPPORTED_LANGUAGES, Language } from '../lib/languages';
import { requestMicPermission, startRecording, stopRecording, playAudioFromUri } from '../lib/recorder';
import { colors, fontSize, radius, spacing } from '../lib/theme';
import { AppState } from '../lib/types';

export default function HomeScreen() {
  const [fromLang, setFromLang] = useState<Language | null>(null);
  const [toLang,   setToLang]   = useState<Language | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const recordingRef  = useRef<Audio.Recording | null>(null);
  const soundRef      = useRef<Audio.Sound | null>(null);

  const isRecording = appState === 'recording';
  const canRecord   = fromLang !== null && toLang !== null && appState === 'idle';

  async function handleRecordPress() {
    setErrorMsg(null);

    if (isRecording) {
      await handleStop();
    } else {
      await handleRecord();
    }
  }

  async function handleRecord() {
    // Unload any previous playback
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    const granted = await requestMicPermission();
    if (!granted) {
      Alert.alert(
        'Microphone access denied',
        'Please enable microphone access in your device settings to use this app.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    try {
      recordingRef.current = await startRecording();
      setAppState('recording');
    } catch (e) {
      setErrorMsg('Could not start recording. Try again.');
    }
  }

  async function handleStop() {
    if (!recordingRef.current) return;
    setAppState('transcribing'); // reusing this state as "processing" for now

    try {
      const uri = await stopRecording(recordingRef.current);
      recordingRef.current = null;

      // Play back your own voice so you can verify the mic is working
      soundRef.current = await playAudioFromUri(uri);
      setAppState('idle');
    } catch (e) {
      setErrorMsg('Could not process recording. Try again.');
      setAppState('idle');
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
            onPress={() => setFromLang(SUPPORTED_LANGUAGES[0])}
          />
          <TouchableOpacity
            onPress={() => {
              const temp = fromLang;
              setFromLang(toLang);
              setToLang(temp);
            }}
          >
            <Text style={styles.swap}>⇄</Text>
          </TouchableOpacity>
          <LanguagePicker
            label="To"
            selected={toLang}
            onPress={() => setToLang(SUPPORTED_LANGUAGES[1])}
          />
        </View>

        {/* Status message */}
        <View style={styles.statusArea}>
          {appState === 'transcribing' && (
            <Text style={styles.statusText}>Processing…</Text>
          )}
          {errorMsg && (
            <Text style={styles.errorText}>{errorMsg}</Text>
          )}
          {appState === 'idle' && !errorMsg && (
            <Text style={styles.hintText}>
              {canRecord ? 'Ready to record' : 'Tap a language to get started'}
            </Text>
          )}
          {isRecording && (
            <Text style={styles.recordingText}>Recording…</Text>
          )}
        </View>

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Record button */}
        <View style={styles.recordArea}>
          <RecordButton
            isRecording={isRecording}
            onPress={handleRecordPress}
            disabled={!canRecord && !isRecording}
          />
          <Text style={styles.recordLabel}>
            {isRecording ? 'Tap to stop' : canRecord ? 'Tap to record' : 'Select both languages first'}
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
  statusArea: {
    marginTop: spacing.xl,
    alignItems: 'center',
    minHeight: 40,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  recordingText: {
    color: colors.accent,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },
  errorText: {
    color: colors.destructive,
    fontSize: fontSize.sm,
    textAlign: 'center',
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
