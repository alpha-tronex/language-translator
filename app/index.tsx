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
  useWindowDimensions,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import LanguageModal from '../components/LanguageModal';
import LanguagePicker from '../components/LanguagePicker';
import RecordButton from '../components/RecordButton';
import TextPanel from '../components/TextPanel';
import { transcribeAudio, translateText } from '../lib/api';
import { getErrorMessage } from '../lib/errors';
import { Language } from '../lib/languages';
import { requestMicPermission, startRecording, stopRecording } from '../lib/recorder';
import { colors, fontSize, radius, spacing } from '../lib/theme';
import { AppState } from '../lib/types';

const AUDIO_PATH = FileSystem.cacheDirectory + 'translation.mp3';
const MIN_RECORDING_MS = 500;

function showError(message: string) {
  Toast.show({ type: 'error', text1: message, visibilityTime: 4000 });
}

export default function HomeScreen() {
  const [fromLang,    setFromLang]    = useState<Language | null>(null);
  const [toLang,      setToLang]      = useState<Language | null>(null);
  const [appState,    setAppState]    = useState<AppState>('idle');
  const [transcript,  setTranscript]  = useState<string | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [modalTarget, setModalTarget] = useState<'from' | 'to' | null>(null);

  const recordingRef   = useRef<Audio.Recording | null>(null);
  const soundRef       = useRef<Audio.Sound | null>(null);
  const recordStartRef = useRef<number>(0);

  const { width }   = useWindowDimensions();
  const isTablet    = width >= 600;
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
    setAppState('idle');
  }

  async function handleRecordPress() {
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
      recordStartRef.current = Date.now();
      setAppState('recording');
    } catch (e) {
      showError(getErrorMessage(e));
    }
  }

  async function handleStop() {
    if (!recordingRef.current) return;

    const duration = Date.now() - recordStartRef.current;
    if (duration < MIN_RECORDING_MS) {
      showError('Recording too short — hold the button for at least half a second.');
      await recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
      setAppState('idle');
      return;
    }

    setAppState('transcribing');
    try {
      const uri = await stopRecording(recordingRef.current);
      recordingRef.current = null;

      const { transcript } = await transcribeAudio(uri, fromLang!.code);
      setTranscript(transcript);
      setAppState('review');
    } catch (e) {
      showError(getErrorMessage(e));
      setAppState('idle');
    }
  }

  async function handleTranslate() {
    if (!transcript || !fromLang || !toLang) return;
    setAppState('translating');
    try {
      const { translation, audioBase64 } = await translateText(
        transcript,
        fromLang.code,
        toLang.code
      );
      setTranslation(translation);

      await FileSystem.writeAsStringAsync(AUDIO_PATH, audioBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      try {
        const { sound } = await Audio.Sound.createAsync({ uri: AUDIO_PATH });
        soundRef.current = sound;
        await sound.playAsync();
      } catch {
        showError("Couldn't play audio. The translation text is shown above.");
      }

      setAppState('playback');
    } catch (e) {
      showError(getErrorMessage(e));
      setAppState('review');
    }
  }

  async function handlePlay() {
    if (!soundRef.current) return;
    try {
      await soundRef.current.replayAsync();
    } catch {
      showError("Couldn't play audio. Try recording again.");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, isTablet && styles.containerTablet]}>

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
            <TextPanel label="You said:" text={transcript} rtl={fromLang?.rtl} />
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
    width: '100%',
    alignSelf: 'center',
  },
  containerTablet: {
    maxWidth: 480,
    paddingHorizontal: spacing.xl,
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
