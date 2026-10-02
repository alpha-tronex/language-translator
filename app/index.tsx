import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import AlertModal from '../components/AlertModal';
import ConsentModal from '../components/ConsentModal';
import { homeStyles as styles } from '../components/homeStyles';
import InputModeToggle from '../components/InputModeToggle';
import LanguageModal from '../components/LanguageModal';
import LanguagePicker from '../components/LanguagePicker';
import LearnActions from '../components/LearnActions';
import PracticeBar from '../components/PracticeBar';
import PracticePanel from '../components/PracticePanel';
import RecordButton from '../components/RecordButton';
import TextPanel from '../components/TextPanel';
import TypedInput from '../components/TypedInput';
import { useAppState } from '../lib/AppState';
import { AUTO_DETECT, Language, SourceLanguage, SUPPORTED_LANGUAGES } from '../lib/languages';
import { isCharacterBased } from '../lib/practiceScore';
import { colors } from '../lib/theme';
import {
  canPractice,
  canSwap,
  detectedLanguageLabel,
  hasResults,
  isBusy,
  languagesChosen,
  loadingLabel,
  practiceResult,
  recordHint,
  transcriptIsRtl,
  transcriptLabel,
} from '../lib/translatorMachine';
import { useConsent } from '../lib/useConsent';

const FROM_OPTIONS: SourceLanguage[] = [AUTO_DETECT, ...SUPPORTED_LANGUAGES];

/**
 * Layout only. Every decision lives in lib/translatorMachine.ts and every
 * side effect in lib/useTranslator.ts, shared through lib/AppState.tsx;
 * tests mock that hook (rule R2/T4).
 */
export default function HomeScreen() {
  const router = useRouter();
  const { translator, practice, savedCurrent, toggleSaved, streak } = useAppState();
  const { state } = translator;
  const { consentGiven, giveConsent } = useConsent();

  const [picker, setPicker] = useState<'from' | 'to' | null>(null);
  const [showLangAlert, setShowLangAlert] = useState(false);
  /** What to do once the user agrees to the OpenAI notice (record or submit typed text). */
  const [afterConsent, setAfterConsent] = useState<(() => void) | null>(null);
  const [pendingChange, setPendingChange] = useState<(() => void) | null>(null);

  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const busy = isBusy(state);
  const detected = detectedLanguageLabel(state);
  const loading = loadingLabel(state);
  const result = practiceResult(state);
  const typing = state.phase === 'idle' && state.inputMode === 'text';
  const showRecordArea = ['idle', 'starting', 'recording', 'transcribing', 'translating'].includes(state.phase) && !typing;

  /** Changing languages throws away the current results, so ask first. */
  function confirmIfResults(apply: () => void) {
    if (hasResults(state)) setPendingChange(() => apply);
    else apply();
  }

  /** Languages first, then the one-time OpenAI consent, then the action. */
  function whenReady(action: () => void) {
    if (!languagesChosen(state)) setShowLangAlert(true);
    else if (!consentGiven) setAfterConsent(() => action);
    else action();
  }

  function onRecordPress() {
    if (state.phase === 'recording') void translator.finishRecording();
    else whenReady(() => void translator.beginRecording());
  }

  function onSelectLanguage(lang: SourceLanguage) {
    const target = picker;
    const current = target === 'from' ? state.fromLang : state.toLang;
    if (!target || lang.code === current?.code) return;
    confirmIfResults(() =>
      target === 'from' ? translator.setFromLang(lang) : translator.setToLang(lang as Language)
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Keeps the focused text box above the keyboard; the scroll view lets
          long content (practice results, long phrases) scroll, and a tap or
          drag outside the text box closes the keyboard. */}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          testID="home-scroll"
          style={styles.flex}
          contentContainerStyle={[styles.container, isTablet && styles.containerTablet]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title} accessibilityRole="header">
            Thiam LLM Language Translator
          </Text>

          <PracticeBar count={practice.data.phrases.length} streak={streak} onOpen={() => router.push('/practice')} />

          <View style={styles.pickerRow}>
            <LanguagePicker label="From" selected={state.fromLang} onPress={() => setPicker('from')} />
            <TouchableOpacity
              testID="home-swap-button"
              accessibilityRole="button"
              accessibilityLabel="Swap languages"
              accessibilityHint="Exchanges the From and To languages"
              accessibilityState={{ disabled: !canSwap(state) }}
              disabled={!canSwap(state)}
              onPress={() => confirmIfResults(translator.swapLanguages)}
            >
              <Text style={[styles.swap, !canSwap(state) && styles.swapDisabled]}>⇄</Text>
            </TouchableOpacity>
            <LanguagePicker label="To" selected={state.toLang} onPress={() => setPicker('to')} />
          </View>

          {state.transcript !== null && (
            <View style={styles.panelArea}>
              <TextPanel label={transcriptLabel(state)} text={state.transcript} rtl={transcriptIsRtl(state)} testID="home-transcript" />
              {detected && (
                <View style={styles.detectedChip} testID="home-detected-lang">
                  <Text style={styles.detectedLabel}>Detected: {detected}</Text>
                </View>
              )}
              {state.translation !== null && (
                <TextPanel label="Translation:" text={state.translation} rtl={state.toLang?.rtl} testID="home-translation" />
              )}
            </View>
          )}

          {state.phase === 'idle' && (
            <InputModeToggle mode={state.inputMode} onChange={translator.setInputMode} />
          )}

          {loading && (
            <View style={styles.spinnerArea} testID="home-loading">
              <ActivityIndicator color={colors.accent} size="large" />
              <Text style={styles.statusText}>{loading}</Text>
            </View>
          )}

          <View style={styles.spacer} />

          {typing && (
            <TypedInput
              rtl={state.fromLang?.rtl}
              onSubmit={(text) => whenReady(() => translator.submitTyped(text))}
            />
          )}

          {result && (
            <PracticePanel
              result={result}
              scores={state.practiceScores}
              characterBased={isCharacterBased(state.toLang?.code)}
              rtl={state.toLang?.rtl}
              speakingWord={state.speakingWord}
              onWordPress={(word) => void translator.speakWord(word)}
              onPlaySlowly={() => void translator.playSlowly()}
              onTryAgain={() => void translator.beginPractice()}
              onDone={translator.endPractice}
            />
          )}

          {state.phase === 'playback' && canPractice(state) && (
            <LearnActions
              saved={savedCurrent !== undefined}
              onToggleSaved={toggleSaved}
              onPlaySlowly={() => void translator.playSlowly()}
              onPractice={() => void translator.beginPractice()}
            />
          )}

          {(state.phase === 'review' || state.phase === 'playback') && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                testID="home-rerecord-button"
                accessibilityRole="button"
                accessibilityLabel="Re-record"
                accessibilityHint="Clears this phrase so you can record a new one"
                style={styles.reRecordBtn}
                onPress={translator.reset}
              >
                <Text style={styles.reRecordLabel}>Re-record</Text>
              </TouchableOpacity>
              {state.phase === 'review' ? (
                <TouchableOpacity
                  testID="home-translate-button"
                  accessibilityRole="button"
                  accessibilityLabel="Translate"
                  accessibilityHint="Translates what you said and plays it aloud"
                  style={styles.translateBtn}
                  onPress={() => void translator.translate()}
                >
                  <Text style={styles.translateLabel}>Translate</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  testID="home-play-button"
                  accessibilityRole="button"
                  accessibilityLabel="Play translation"
                  accessibilityHint="Plays the translation again"
                  style={styles.playBtn}
                  onPress={() => void translator.replay()}
                >
                  <Text style={styles.playLabel}>▶  Play</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {showRecordArea && (
            <View style={styles.recordArea}>
              <RecordButton isRecording={state.phase === 'recording'} onPress={onRecordPress} disabled={busy} />
              <Text style={styles.recordLabel} testID="home-record-hint">
                {recordHint(state)}
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

        <LanguageModal
          visible={picker !== null}
          selected={picker === 'from' ? state.fromLang : state.toLang}
          options={picker === 'from' ? FROM_OPTIONS : SUPPORTED_LANGUAGES}
          onSelect={onSelectLanguage}
          onClose={() => setPicker(null)}
        />

        <AlertModal
          visible={showLangAlert}
          title="Select both languages"
          message={
            !state.fromLang
              ? 'Tap "From" above to choose the language you\'ll speak in.'
              : 'Tap "To" above to choose the language you want to translate into.'
          }
          onClose={() => setShowLangAlert(false)}
        />

        <AlertModal
          visible={state.alert !== null}
          title={state.alert?.title ?? ''}
          message={state.alert?.message ?? ''}
          confirmLabel={state.alert?.action === 'openSettings' ? 'Open Settings' : undefined}
          onConfirm={state.alert?.action === 'openSettings' ? () => void Linking.openSettings() : undefined}
          onClose={translator.dismissAlert}
        />

        <AlertModal
          visible={pendingChange !== null}
          title="Change language?"
          message="This will clear your current transcript and translation. Do you want to continue?"
          confirmLabel="Continue"
          onConfirm={pendingChange ?? undefined}
          onClose={() => setPendingChange(null)}
        />

        <ConsentModal
          visible={afterConsent !== null}
          onAgree={async () => {
            const next = afterConsent;
            setAfterConsent(null);
            await giveConsent();
            next?.();
          }}
          onDecline={() => setAfterConsent(null)}
        />
    </SafeAreaView>
  );
}
