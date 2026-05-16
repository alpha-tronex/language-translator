import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LanguagePicker from '../components/LanguagePicker';
import LanguageModal from '../components/LanguageModal';
import RecordButton from '../components/RecordButton';
import TextPanel from '../components/TextPanel';
import { Language } from '../lib/languages';
import { requestMicPermission, startRecording, stopRecording } from '../lib/recorder';
import { transcribeAudio, translateText } from '../lib/api';
import { colors, fontSize, radius, spacing } from '../lib/theme';
import { AppState } from '../lib/types';

const AUDIO_PATH = FileSystem.cacheDirectory + 'translation.mp3';

export default function HomeScreen() {
  const [fromLang,     setFromLang]     = useState<Language | null>(null);
  const [toLang,       setToLang]       = useState<Language | null>(null);
  const [appState,     setAppState]     = useState<AppState>('idle');
  const [transcript,   setTranscript]   = useState<string | null>(null);
  const [translation,  setTranslation]  = useState<string | null>(null);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [modalTarget,  setModalTarget]  = useState<'from' | 'to' | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef     = useRef<Audio.Sound | null>(null);

  const isRecording = appState === 'recording';
  const canRecord   = fromLang !== null && toLang !== null && appState === 'idle';

  async function cleanupAudio() {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    await FileSystem.deleteAsync(AUDIO_PATH, { idempotent: true });
  }

  function handleReRecord() {
    cleanupAudio();
    setTranscript(null);
    setTranslation(null);
    setErrorMsg(null);
    setAppState('idle');
  }

  async function handleRecordPress() {
    setErrorMsg(null);
    if (isRecording) {
      await handleStop();
    } else {
      await handleRecord();
    }
  }

  async function handleRecord() {
    await cleanupAudio();
    setTranscript(null);
    setTranslation(null);

    const granted = await requestMicPermission();
    if (!granted) {
      Alert.alert(
        'Microphone access denied',
        'Please enable microphone access in your device settings.',
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
    } catch {
      setErrorMsg('Could not start recording. Try again.');
    }
  }

  async function handleStop() {
    if (!recordingRef.current) return;
    setAppState('transcribing');
    try {
      const uri = await stopRecording(recordingRef.current);
      recordingRef.current = null;

      const { transcript } = await transcribeAudio(uri, fromLang!.code);
      setTranscript(transcript);
      setAppState('review');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Transcription failed. Try again.');
      setAppState('idle');
    }
  }

  async function handleTranslate() {
    if (!transcript || !fromLang || !toLang) return;
    setAppState('translating');
    setErrorMsg(null);
    try {
      const { translation, audioBase64 } = await translateText(
        transcript,
        fromLang.code,
        toLang.code
      );
      setTranslation(translation);

      // Write audio to device and play
      await FileSystem.writeAsStringAsync(AUDIO_PATH, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const { sound } = await Audio.Sound.createAsync({ uri: AUDIO_PATH });
      soundRef.current = sound;
      await sound.playAsync();

      setAppState('playback');
    } catch (e: any) {
      setErrorMsg(e.message ?? 'Translation failed. Try again.');
      setAppState('review');
    }
  }

  async function handlePlay() {
    if (!soundRef.current) return;
    await soundRef.current.replayAsync();
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
            onPress={() => setModalTarget('from')}
          />
          <TouchableOpacity
            onPress={() => { const t = fromLang; setFromLang(toLang); setToLang(t); }}
          >
            <Text style={styles.swap}>⇄</Text>
          </TouchableOpacity>
          <LanguagePicker
            label="To"
            selected={toLang}
            onPress={() => setModalTarget('to')}
          />
        </View>

        {/* Language selection modal */}
        <LanguageModal
          visible={modalTarget !== null}
          selected={modalTarget === 'from' ? fromLang : toLang}
          onSelect={(lang) => {
            if (modalTarget === 'from') setFromLang(lang);
            else setToLang(lang);
          }}
          onClose={() => setModalTarget(null)}
        />

        {/* Text panels */}
        {transcript && (
          <View style={styles.panelArea}>
            <TextPanel label="You said:" text={transcript} />
            {translation && (
              <TextPanel
                label="Translation:"
                text={translation}
                rtl={toLang?.rtl}
              />
            )}
          </View>
        )}

        {/* Spinners */}
        {(appState === 'transcribing' || appState === 'translating') && (
          <View style={styles.spinnerArea}>
            <ActivityIndicator color={colors.accent} size="large" />
            <Text style={styles.statusText}>
              {appState === 'transcribing' ? 'Transcribing…' : 'Translating…'}
            </Text>
          </View>
        )}

        {/* Error */}
        {errorMsg && (
          <View style={styles.spinnerArea}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.spacer} />

        {/* Review buttons */}
        {appState === 'review' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.reRecordBtn} onPress={handleReRecord}>
              <Text style={styles.reRecordLabel}>Re-record</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.translateBtn} onPress={handleTranslate}>
              <Text style={styles.translateLabel}>Translate</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Playback buttons */}
        {appState === 'playback' && (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.reRecordBtn} onPress={handleReRecord}>
              <Text style={styles.reRecordLabel}>Re-record</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.playBtn} onPress={handlePlay}>
              <Text style={styles.playLabel}>▶  Play</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Record button */}
        {appState !== 'review' && appState !== 'playback' && (
          <View style={styles.recordArea}>
            <RecordButton
              isRecording={isRecording}
              onPress={handleRecordPress}
              disabled={!canRecord && !isRecording}
            />
            <Text style={styles.recordLabel}>
              {isRecording
                ? 'Tap to stop'
                : appState === 'transcribing' || appState === 'translating'
                ? 'Processing…'
                : canRecord
                ? 'Tap to record'
                : 'Select both languages first'}
            </Text>
          </View>
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
  panelArea: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  spinnerArea: {
    marginTop: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
  },
  errorText: {
    color: colors.destructive,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  reRecordBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.destructive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reRecordLabel: {
    color: colors.destructive,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  translateBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translateLabel: {
    color: '#FFFFFF',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  playBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playLabel: {
    color: colors.background,
    fontSize: fontSize.md,
    fontWeight: '600',
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
