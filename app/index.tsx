import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
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
import AlertModal from '../components/AlertModal';
import ConsentModal from '../components/ConsentModal';
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
  const [fromLang,          setFromLang]          = useState<Language | null>(null);
  const [toLang,            setToLang]            = useState<Language | null>(null);
  const [appState,          setAppState]          = useState<AppState>('idle');
  const [transcript,        setTranscript]        = useState<string | null>(null);
  const [translation,       setTranslation]       = useState<string | null>(null);
  const [modalTarget,       setModalTarget]       = useState<'from' | 'to' | null>(null);
  const [isStartingAudio,   setIsStartingAudio]   = useState(false);
  const [showLangAlert,     setShowLangAlert]     = useState(false);
  const [alertModal,        setAlertModal]        = useState<{ title: string; message: string } | null>(null);
  const [confirmModal,      setConfirmModal]      = useState<{ onConfirm: () => void } | null>(null);
  const [showConsent,       setShowConsent]       = useState(false);
  const [consentGiven,      setConsentGiven]      = useState(false);

  const CONSENT_KEY = 'tlt_consent_v1';

  useEffect(() => {
    AsyncStorage.getItem(CONSENT_KEY).then((val) => {
      if (val === 'true') setConsentGiven(true);
    });
  }, []);

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
    } else if (!fromLang || !toLang) {
      setShowLangAlert(true);
    } else if (!consentGiven) {
      setShowConsent(true);
    } else {
      await handleRecord();
    }
  }

  async function handleRecord() {
    await cleanupAudio();
    setTranscript(null);
    setTranslation(null);

    // Check if permission was already granted before requesting.
    // If not yet granted, iOS needs extra time to initialize the audio
    // session after the user taps Allow — otherwise startRecording() fails.
    const { granted: alreadyGranted } = await Audio.getPermissionsAsync();
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

    // Disable the button while we initialize the audio session.
    setIsStartingAudio(true);

    // On first-ever permission grant iOS needs time to initialize the audio
    // session. Retry silently up to 3 times with increasing delays before
    // surfacing any error to the user.
    const delays = alreadyGranted ? [100] : [1500, 1000, 1000];
    let lastError: unknown;

    for (const delay of delays) {
      await new Promise(resolve => setTimeout(resolve, delay));
      try {
        recordingRef.current = await startRecording();
        recordStartRef.current = Date.now();
        setAppState('recording');
        setIsStartingAudio(false);
        return;
      } catch (e) {
        lastError = e;
      }
    }

    // All retries failed — show modal error.
    setAlertModal({
      title: 'Microphone error',
      message: getErrorMessage(lastError),
    });
    setIsStartingAudio(false);
  }

  async function handleStop() {
    if (!recordingRef.current) return;

    const duration = Date.now() - recordStartRef.current;
    if (duration < MIN_RECORDING_MS) {
      setAlertModal({
        title: 'Recording too short',
        message: 'Hold the record button for at least half a second before releasing.',
      });
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
      setAlertModal({ title: 'Transcription failed', message: getErrorMessage(e) });
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
        setAlertModal({
          title: 'Audio unavailable',
          message: "Couldn't play the audio. The translation text is shown above.",
        });
      }

      setAppState('playback');
    } catch (e) {
      setAlertModal({ title: 'Translation failed', message: getErrorMessage(e) });
      setAppState('review');
    }
  }

  async function handlePlay() {
    if (!soundRef.current) return;
    try {
      await soundRef.current.replayAsync();
    } catch {
      setAlertModal({
        title: 'Audio unavailable',
        message: "Couldn't play the audio. Try recording again.",
      });
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={[styles.container, isTablet && styles.containerTablet]}>

        {/* Title */}
        <Text style={styles.title}>Thiam LLM Language Translator</Text>

        {/* Language pickers */}
        <View style={styles.pickerRow}>
          <LanguagePicker
            label="From"
            selected={fromLang}
            onPress={() => setModalTarget('from')}
          />
          <TouchableOpacity
            onPress={() => {
              const doSwap = () => { const t = fromLang; setFromLang(toLang); setToLang(t); };
              if (transcript || translation) {
                setConfirmModal({ onConfirm: () => { cleanupAudio(); setTranscript(null); setTranslation(null); setAppState('idle'); doSwap(); } });
              } else {
                doSwap();
              }
            }}
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
            const isChanging = modalTarget === 'from'
              ? lang.code !== fromLang?.code
              : lang.code !== toLang?.code;

            const applyChange = () => {
              if (modalTarget === 'from') setFromLang(lang);
              else setToLang(lang);
            };

            if (isChanging && (transcript || translation)) {
              // Close language modal first, then show confirmation.
              setModalTarget(null);
              setConfirmModal({
                onConfirm: () => {
                  cleanupAudio();
                  setTranscript(null);
                  setTranslation(null);
                  setAppState('idle');
                  applyChange();
                },
              });
            } else {
              applyChange();
            }
          }}
          onClose={() => setModalTarget(null)}
        />

        <AlertModal
          visible={showLangAlert}
          title="Select both languages"
          message={
            !fromLang
              ? 'Tap "From" above to choose the language you\'ll speak in.'
              : 'Tap "To" above to choose the language you want to translate into.'
          }
          onClose={() => setShowLangAlert(false)}
        />

        <AlertModal
          visible={alertModal !== null}
          title={alertModal?.title ?? ''}
          message={alertModal?.message ?? ''}
          onClose={() => setAlertModal(null)}
        />

        <AlertModal
          visible={confirmModal !== null}
          title="Change language?"
          message="This will clear your current transcript and translation. Do you want to continue?"
          confirmLabel="Continue"
          onConfirm={confirmModal?.onConfirm}
          onClose={() => setConfirmModal(null)}
        />

        <ConsentModal
          visible={showConsent}
          onAgree={async () => {
            await AsyncStorage.setItem(CONSENT_KEY, 'true');
            setConsentGiven(true);
            setShowConsent(false);
            await handleRecord();
          }}
          onDecline={() => setShowConsent(false)}
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
              disabled={appState === 'transcribing' || appState === 'translating' || isStartingAudio}
            />
            <Text style={styles.recordLabel}>
              {isRecording
                ? 'Tap to stop'
                : appState === 'transcribing' || appState === 'translating'
                ? 'Processing…'
                : !fromLang || !toLang
                ? 'Select languages above to get started'
                : 'Tap to record'}
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
