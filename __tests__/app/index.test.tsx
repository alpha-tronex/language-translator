import { render, screen, userEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import HomeScreen from '../../app/index';
import { AUTO_DETECT, Language, SUPPORTED_LANGUAGES } from '../../lib/languages';
import { initialTranslatorState, TranslatorState } from '../../lib/translatorMachine';
import { useConsent } from '../../lib/useConsent';
import { useTranslator } from '../../lib/useTranslator';

jest.mock('../../lib/useTranslator');
jest.mock('../../lib/useConsent');

const lang = (code: string) => SUPPORTED_LANGUAGES.find((l) => l.code === code) as Language;
const en = lang('en');
const es = lang('es');
const ar = lang('ar');

const actions = {
  beginRecording: jest.fn(async () => {}),
  finishRecording: jest.fn(async () => {}),
  translate: jest.fn(async () => {}),
  replay: jest.fn(async () => {}),
  reset: jest.fn(),
  setFromLang: jest.fn(),
  setToLang: jest.fn(),
  swapLanguages: jest.fn(),
  dismissAlert: jest.fn(),
  beginPractice: jest.fn(async () => {}),
  endPractice: jest.fn(),
  setInputMode: jest.fn(),
  submitTyped: jest.fn(),
};
const giveConsent = jest.fn(async () => {});

function renderWith(state: Partial<TranslatorState>, { consentGiven = true } = {}) {
  (useTranslator as jest.Mock).mockReturnValue({ state: { ...initialTranslatorState, ...state }, ...actions });
  (useConsent as jest.Mock).mockReturnValue({ consentGiven, giveConsent });
  return render(<HomeScreen />);
}

const ready = { fromLang: en, toLang: es };
const review = { ...ready, phase: 'review' as const, transcript: 'Where is the station?' };
const playback = { ...review, phase: 'playback' as const, translation: '¿Dónde está la estación?' };

afterEach(() => jest.clearAllMocks());

describe('HomeScreen: idle', () => {
  test('asks the user to pick languages first, and explains which one is missing', async () => {
    const user = userEvent.setup();
    await renderWith({});

    expect(screen.getByRole('header', { name: 'Thiam LLM Language Translator' })).toBeTruthy();
    expect(screen.getByTestId('home-record-hint')).toHaveTextContent('Select languages above to get started');
    await user.press(screen.getByTestId('record-button'));

    expect(actions.beginRecording).not.toHaveBeenCalled();
    expect(screen.getByText('Select both languages')).toBeTruthy();
    expect(screen.getByText(/Tap "From" above/)).toBeTruthy();
  });

  test('with languages chosen and consent given, the record button starts recording', async () => {
    const user = userEvent.setup();
    await renderWith(ready);

    await user.press(screen.getByTestId('record-button'));

    expect(actions.beginRecording).toHaveBeenCalledTimes(1);
  });

  test('on first use, shows the OpenAI consent notice before recording', async () => {
    const user = userEvent.setup();
    await renderWith(ready, { consentGiven: false });

    await user.press(screen.getByTestId('record-button'));
    expect(actions.beginRecording).not.toHaveBeenCalled();
    await user.press(screen.getByTestId('consent-agree-button'));

    expect(giveConsent).toHaveBeenCalled();
    expect(actions.beginRecording).toHaveBeenCalledTimes(1);
  });

  test('declining consent does not record', async () => {
    const user = userEvent.setup();
    await renderWith(ready, { consentGiven: false });

    await user.press(screen.getByTestId('record-button'));
    await user.press(screen.getByTestId('consent-decline-button'));

    expect(actions.beginRecording).not.toHaveBeenCalled();
  });
});

describe('HomeScreen: recording and loading', () => {
  test('while recording, the button stops and transcribes', async () => {
    const user = userEvent.setup();
    await renderWith({ ...ready, phase: 'recording', recordingStartedAt: 1 });

    expect(screen.getByTestId('home-record-hint')).toHaveTextContent('Tap to stop');
    await user.press(screen.getByRole('button', { name: 'Stop recording' }));

    expect(actions.finishRecording).toHaveBeenCalledTimes(1);
  });

  test.each([
    ['transcribing', 'Transcribing…'],
    ['translating', 'Translating…'],
  ] as const)('shows a spinner and disables recording while %s', async (phase, text) => {
    await renderWith({ ...review, phase });

    expect(screen.getByTestId('home-loading')).toHaveTextContent(text);
    expect(screen.getByTestId('record-button')).toBeDisabled();
  });
});

describe('HomeScreen: review and playback', () => {
  test('review shows the transcript with Translate and Re-record', async () => {
    const user = userEvent.setup();
    await renderWith(review);

    expect(screen.getByTestId('home-transcript-text')).toHaveTextContent('Where is the station?');
    expect(screen.queryByTestId('record-button')).toBeNull();
    await user.press(screen.getByTestId('home-translate-button'));
    await user.press(screen.getByTestId('home-rerecord-button'));

    expect(actions.translate).toHaveBeenCalledTimes(1);
    expect(actions.reset).toHaveBeenCalledTimes(1);
  });

  test('playback shows the translation and replays it', async () => {
    const user = userEvent.setup();
    await renderWith(playback);

    expect(screen.getByTestId('home-translation-text')).toHaveTextContent('¿Dónde está la estación?');
    await user.press(screen.getByRole('button', { name: 'Play translation' }));

    expect(actions.replay).toHaveBeenCalledTimes(1);
  });

  test('renders an Arabic translation right-to-left', async () => {
    await renderWith({ ...playback, toLang: ar, translation: 'أين المحطة؟' });

    expect(screen.getByTestId('home-translation-text')).toHaveStyle({ writingDirection: 'rtl' });
  });
});

describe('HomeScreen: auto-detect', () => {
  test('shows which language was detected', async () => {
    await renderWith({ ...review, fromLang: AUTO_DETECT, detectedLang: 'es', transcript: '¿Dónde está?' });

    expect(screen.getByTestId('home-detected-lang')).toHaveTextContent('Detected: Spanish');
  });

  test('offers Auto-detect in the From list only', async () => {
    const user = userEvent.setup();
    await renderWith({});

    await user.press(screen.getByTestId('language-picker-from'));
    await user.press(screen.getByTestId('language-option-auto'));
    expect(actions.setFromLang).toHaveBeenCalledWith(AUTO_DETECT);

    await user.press(screen.getByTestId('language-picker-to'));
    expect(screen.queryByTestId('language-option-auto')).toBeNull();
  });

  test('disables swapping while From is Auto-detect', async () => {
    await renderWith({ fromLang: AUTO_DETECT, toLang: es });

    expect(screen.getByTestId('home-swap-button')).toBeDisabled();
  });
});

describe('HomeScreen: changing languages', () => {
  test('changes immediately when there is nothing to lose', async () => {
    const user = userEvent.setup();
    await renderWith(ready);

    await user.press(screen.getByTestId('language-picker-to'));
    await user.press(screen.getByTestId('language-option-ar'));

    expect(actions.setToLang).toHaveBeenCalledWith(ar);
  });

  test('asks before clearing a transcript, and only changes after Continue', async () => {
    const user = userEvent.setup();
    await renderWith(review);

    await user.press(screen.getByTestId('language-picker-to'));
    await user.press(screen.getByTestId('language-option-ar'));
    expect(actions.setToLang).not.toHaveBeenCalled();
    expect(screen.getByText('Change language?')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Continue' }));
    expect(actions.setToLang).toHaveBeenCalledWith(ar);
  });

  test('picking the same language again does nothing', async () => {
    const user = userEvent.setup();
    await renderWith(review);

    await user.press(screen.getByTestId('language-picker-to'));
    await user.press(screen.getByTestId('language-option-es'));

    expect(actions.setToLang).not.toHaveBeenCalled();
    expect(screen.queryByText('Change language?')).toBeNull();
  });

  test('swap asks first when results would be cleared', async () => {
    const user = userEvent.setup();
    await renderWith(review);

    await user.press(screen.getByTestId('home-swap-button'));
    await user.press(screen.getByRole('button', { name: 'Continue' }));

    expect(actions.swapLanguages).toHaveBeenCalledTimes(1);
  });
});

describe('HomeScreen: alerts', () => {
  test('shows state alerts and dismisses them', async () => {
    const user = userEvent.setup();
    await renderWith({ ...ready, alert: { title: 'Transcription failed', message: 'No internet connection.' } });

    expect(screen.getByTestId('alert-modal-message')).toHaveTextContent('No internet connection.');
    await user.press(screen.getByRole('button', { name: 'Got it' }));

    expect(actions.dismissAlert).toHaveBeenCalledTimes(1);
  });

  test('a denied microphone offers to open Settings', async () => {
    const user = userEvent.setup();
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await renderWith({
      ...ready,
      alert: { title: 'Microphone access denied', message: 'Enable it in Settings.', action: 'openSettings' },
    });

    await user.press(screen.getByRole('button', { name: 'Open Settings' }));

    expect(openSettings).toHaveBeenCalled();
    expect(actions.dismissAlert).toHaveBeenCalled();
  });
});

describe('HomeScreen: typed input', () => {
  test('the Speak/Type switch is offered while idle', async () => {
    const user = userEvent.setup();
    await renderWith(ready);

    await user.press(screen.getByRole('radio', { name: 'Type' }));

    expect(actions.setInputMode).toHaveBeenCalledWith('text');
  });

  test('in Type mode the text box replaces the record button', async () => {
    await renderWith({ ...ready, inputMode: 'text' });

    expect(screen.getByTestId('typed-input-field')).toBeTruthy();
    expect(screen.queryByTestId('record-button')).toBeNull();
  });

  test('submitting typed text sends it to review', async () => {
    const user = userEvent.setup();
    await renderWith({ ...ready, inputMode: 'text' });

    await user.type(screen.getByTestId('typed-input-field'), 'Where is the library?');
    await user.press(screen.getByTestId('typed-input-submit'));

    expect(actions.submitTyped).toHaveBeenCalledWith('Where is the library?');
  });

  test('typed text also needs the one-time OpenAI consent first', async () => {
    const user = userEvent.setup();
    await renderWith({ ...ready, inputMode: 'text' }, { consentGiven: false });

    await user.type(screen.getByTestId('typed-input-field'), 'Hello');
    await user.press(screen.getByTestId('typed-input-submit'));
    expect(actions.submitTyped).not.toHaveBeenCalled();

    await user.press(screen.getByTestId('consent-agree-button'));
    expect(actions.submitTyped).toHaveBeenCalledWith('Hello');
    expect(actions.beginRecording).not.toHaveBeenCalled();
  });

  test('typed text without languages asks for them first', async () => {
    const user = userEvent.setup();
    await renderWith({ inputMode: 'text' });

    await user.type(screen.getByTestId('typed-input-field'), 'Hello');
    await user.press(screen.getByTestId('typed-input-submit'));

    expect(actions.submitTyped).not.toHaveBeenCalled();
    expect(screen.getByText('Select both languages')).toBeTruthy();
  });

  test('a typed transcript is labelled "You typed:"', async () => {
    await renderWith({ ...review, inputSource: 'typed' });

    expect(screen.getByText('You typed:')).toBeTruthy();
  });
});

describe('HomeScreen: practice (learning mode)', () => {
  test('after a translation, offers to practice saying it', async () => {
    const user = userEvent.setup();
    await renderWith(playback);

    await user.press(screen.getByRole('button', { name: 'Practice saying it' }));

    expect(actions.beginPractice).toHaveBeenCalledTimes(1);
  });

  test('while practising, the record button stops the attempt and the hint says what to do', async () => {
    const user = userEvent.setup();
    await renderWith({ ...playback, phase: 'recording', recordingFor: 'practice', recordingStartedAt: 1 });

    expect(screen.getByTestId('home-record-hint')).toHaveTextContent('Say the translation, then tap to stop');
    await user.press(screen.getByRole('button', { name: 'Stop recording' }));

    expect(actions.finishRecording).toHaveBeenCalledTimes(1);
  });

  test('shows "Listening…" while the attempt is transcribed', async () => {
    await renderWith({ ...playback, phase: 'transcribing', recordingFor: 'practice' });

    expect(screen.getByTestId('home-loading')).toHaveTextContent('Listening…');
  });

  test('the result shows expected vs heard, with Try again and Done', async () => {
    const user = userEvent.setup();
    await renderWith({ ...playback, phase: 'practiceResult', practiceAttempt: 'Donde esta la estacion' });

    expect(screen.getByTestId('practice-expected-text')).toHaveTextContent('¿Dónde está la estación?');
    expect(screen.getByTestId('practice-heard-text')).toHaveTextContent('Donde esta la estacion');
    expect(screen.queryByTestId('home-practice-button')).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Try again' }));
    await user.press(screen.getByRole('button', { name: 'Done' }));

    expect(actions.beginPractice).toHaveBeenCalledTimes(1);
    expect(actions.endPractice).toHaveBeenCalledTimes(1);
  });
});
