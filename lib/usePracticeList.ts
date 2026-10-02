import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addPhrase,
  EMPTY_PRACTICE_DATA,
  NewPhrase,
  PracticeData,
  recordAttempt,
  removePhrase,
} from './practiceList';
import { loadPracticeData, savePracticeData } from './practiceStore';

export type PracticeListDeps = {
  /** Injected clock and ID source (testability rule R5). */
  now?: () => number;
  newId?: () => string;
};

/**
 * The practice list and practice days, loaded from the device once and
 * written back after every change. Screens read `data` and call the
 * actions; they never touch storage themselves.
 */
export function usePracticeList({ now = Date.now, newId = Crypto.randomUUID }: PracticeListDeps = {}) {
  const [data, setData] = useState<PracticeData>(EMPTY_PRACTICE_DATA);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const dataRef = useRef(data);
  const active = useRef(true);
  /** Changes before the stored list has been read would overwrite it, so they are ignored. */
  const loaded = useRef(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const stored = await loadPracticeData();
      if (!active.current) return;
      dataRef.current = stored;
      loaded.current = true;
      setData(stored);
      setStatus('ready');
    } catch {
      if (active.current) setStatus('error');
    }
  }, []);

  useEffect(() => {
    active.current = true;
    void load();
    return () => {
      active.current = false;
    };
  }, [load]);

  /** Applies a pure change, then saves. A failed save keeps the change for this session. */
  const apply = useCallback((change: (current: PracticeData) => PracticeData) => {
    if (!loaded.current) return;
    const next = change(dataRef.current);
    if (next === dataRef.current) return;
    dataRef.current = next;
    setData(next);
    void savePracticeData(next).catch(() => {});
  }, []);

  const save = useCallback((phrase: NewPhrase) => apply((d) => addPhrase(d, phrase, newId(), now())), [apply, newId, now]);
  const remove = useCallback((id: string) => apply((d) => removePhrase(d, id)), [apply]);
  /** Call after every scored attempt, saved phrase or not: it also feeds the streak. */
  const recordPractice = useCallback(
    (key: { translation: string; targetLang: string }, score: number) => apply((d) => recordAttempt(d, key, score, now())),
    [apply, now]
  );

  return { data, status, reload: load, save, remove, recordPractice };
}

export type PracticeList = ReturnType<typeof usePracticeList>;
