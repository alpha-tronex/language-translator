import { createContext, ReactNode, useCallback, useContext } from 'react';
import { isStreakEnabled } from './config';
import { currentStreak, findSaved, SavedPhrase } from './practiceList';
import { currentPhrase } from './translatorMachine';
import { PracticeList, usePracticeList } from './usePracticeList';
import { Translator, useTranslator } from './useTranslator';

export type AppState = {
  translator: Translator;
  practice: PracticeList;
  /** The translation on screen, if it is on the practice list. */
  savedCurrent: SavedPhrase | undefined;
  /** Stars or un-stars the translation on screen. */
  toggleSaved: () => void;
  /** Days of practice in a row, or null when the streak feature is off. */
  streak: number | null;
};

const AppStateContext = createContext<AppState | null>(null);

type Props = {
  children: ReactNode;
  /** Injected clock (testability rule R5). */
  now?: () => number;
  streakEnabled?: boolean;
};

/**
 * One translator and one practice list for the whole app, so the practice
 * list screen can put a saved phrase on the home screen and practice
 * attempts made there update the list. Created per app instance, not at
 * module scope (rule R10).
 */
export function AppStateProvider({ children, now = Date.now, streakEnabled = isStreakEnabled() }: Props) {
  const practice = usePracticeList({ now });
  const { recordPractice, save, remove, data } = practice;
  const translator = useTranslator({
    now,
    onPracticeScored: ({ translation, targetLang, score }) => recordPractice({ translation, targetLang }, score),
  });

  const phrase = currentPhrase(translator.state);
  const savedCurrent = findSaved(data, phrase);
  const toggleSaved = useCallback(() => {
    if (savedCurrent) remove(savedCurrent.id);
    else if (phrase) save(phrase);
  }, [savedCurrent, phrase, save, remove]);
  const streak = streakEnabled ? currentStreak(data.practiceDays, now()) : null;

  const value = { translator, practice, savedCurrent, toggleSaved, streak };
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const value = useContext(AppStateContext);
  if (!value) throw new Error('useAppState must be used inside <AppStateProvider>');
  return value;
}
