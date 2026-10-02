import { NAILED_IT_SCORE } from './practiceScore';

/**
 * The practice list: translations a student starred to come back to.
 * Pure functions only (testability rule R4); storage is lib/practiceStore.ts.
 *
 * The record is shaped so v2.1's history can extend it instead of replacing
 * it: history will store every translation as a SavedPhrase with
 * `favorite: false`, and starring one just flips the flag.
 */
export type SavedPhrase = {
  id: string;
  /** What was said or typed, and the language it was in ("auto" if unknown). */
  sourceText: string;
  sourceLang: string;
  translation: string;
  targetLang: string;
  createdAt: number;
  /** Starred = on the practice list. Always true until history arrives in v2.1. */
  favorite: boolean;
  bestScore: number | null;
  attemptCount: number;
  /** How many attempts scored "Nailed it" (≥ 85). */
  nailedCount: number;
  lastPracticedAt: number | null;
};

export type PracticeData = {
  phrases: SavedPhrase[];
  /** Local calendar days ("2026-10-02") with at least one practice attempt, oldest first. */
  practiceDays: string[];
};

export const EMPTY_PRACTICE_DATA: PracticeData = { phrases: [], practiceDays: [] };

/** A phrase is mastered once it has been nailed this many times. */
export const MASTERY_NAILED_COUNT = 2;
export const MAX_SAVED_PHRASES = 200;
/** Enough history for any streak worth showing. */
const MAX_PRACTICE_DAYS = 400;

export type Mastery = 'new' | 'practicing' | 'mastered';

export const MASTERY_LABELS: Record<Mastery, string> = {
  new: 'Not practiced yet',
  practicing: 'Practicing',
  mastered: 'Mastered',
};

export function masteryOf(phrase: Pick<SavedPhrase, 'attemptCount' | 'nailedCount'>): Mastery {
  if (phrase.nailedCount >= MASTERY_NAILED_COUNT) return 'mastered';
  return phrase.attemptCount > 0 ? 'practicing' : 'new';
}

type PhraseKey = Pick<SavedPhrase, 'translation' | 'targetLang'>;

/** The same translation into the same language is the same phrase, however it was first said. */
export function findSaved(data: PracticeData, key: PhraseKey | null): SavedPhrase | undefined {
  if (!key) return undefined;
  return data.phrases.find((p) => p.targetLang === key.targetLang && p.translation === key.translation);
}

function statsFrom(scores: number[]) {
  return {
    bestScore: scores.length ? Math.max(...scores) : null,
    attemptCount: scores.length,
    nailedCount: scores.filter((s) => s >= NAILED_IT_SCORE).length,
  };
}

export type NewPhrase = Pick<SavedPhrase, 'sourceText' | 'sourceLang' | 'translation' | 'targetLang'> & {
  /** Scores from attempts made before the phrase was starred, so they are not lost. */
  scores?: number[];
};

/** Adds a phrase to the top of the list. Saving the same phrase twice changes nothing. */
export function addPhrase(data: PracticeData, phrase: NewPhrase, id: string, now: number): PracticeData {
  if (findSaved(data, phrase) || !phrase.translation.trim()) return data;
  const scores = phrase.scores ?? [];
  const saved: SavedPhrase = {
    id,
    sourceText: phrase.sourceText,
    sourceLang: phrase.sourceLang,
    translation: phrase.translation,
    targetLang: phrase.targetLang,
    createdAt: now,
    favorite: true,
    ...statsFrom(scores),
    lastPracticedAt: scores.length ? now : null,
  };
  return { ...data, phrases: [saved, ...data.phrases].slice(0, MAX_SAVED_PHRASES) };
}

export function removePhrase(data: PracticeData, id: string): PracticeData {
  return { ...data, phrases: data.phrases.filter((p) => p.id !== id) };
}

/** Local calendar day, e.g. "2026-10-02". */
export function dayKey(now: number): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Records one scored attempt: counts today toward the streak and, if the
 * phrase is on the list, updates its best score, attempts and mastery.
 */
export function recordAttempt(data: PracticeData, key: PhraseKey, score: number, now: number): PracticeData {
  const today = dayKey(now);
  const practiceDays = data.practiceDays.includes(today)
    ? data.practiceDays
    : [...data.practiceDays, today].slice(-MAX_PRACTICE_DAYS);
  const target = findSaved(data, key);
  const phrases = target
    ? data.phrases.map((p) =>
        p === target
          ? {
              ...p,
              bestScore: Math.max(p.bestScore ?? 0, score),
              attemptCount: p.attemptCount + 1,
              nailedCount: p.nailedCount + (score >= NAILED_IT_SCORE ? 1 : 0),
              lastPracticedAt: now,
            }
          : p
      )
    : data.phrases;
  return { phrases, practiceDays };
}

/**
 * Consecutive days of practice ending today. Yesterday still counts (the
 * streak is alive until midnight tonight), so it doesn't read 0 every morning.
 */
export function currentStreak(practiceDays: string[], now: number): number {
  const days = new Set(practiceDays);
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0); // noon, so daylight-saving changes can't skip or repeat a day
  if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);

  let streak = 0;
  while (days.has(dayKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function practicedToday(practiceDays: string[], now: number): boolean {
  return practiceDays.includes(dayKey(now));
}

const isText = (v: unknown): v is string => typeof v === 'string';
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function parsePhrase(raw: unknown): SavedPhrase | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (!isText(r.id) || !isText(r.translation) || !isText(r.targetLang) || !r.translation.trim()) return null;
  return {
    id: r.id,
    sourceText: isText(r.sourceText) ? r.sourceText : '',
    sourceLang: isText(r.sourceLang) ? r.sourceLang : 'auto',
    translation: r.translation,
    targetLang: r.targetLang,
    createdAt: isCount(r.createdAt) ? r.createdAt : 0,
    favorite: r.favorite !== false,
    bestScore: isCount(r.bestScore) ? Math.min(100, r.bestScore) : null,
    attemptCount: isCount(r.attemptCount) ? r.attemptCount : 0,
    nailedCount: isCount(r.nailedCount) ? r.nailedCount : 0,
    lastPracticedAt: isCount(r.lastPracticedAt) ? r.lastPracticedAt : null,
  };
}

/**
 * Reads stored JSON defensively: anything missing or malformed is dropped
 * rather than crashing the app on launch.
 */
export function parsePracticeData(json: string | null): PracticeData {
  if (!json) return EMPTY_PRACTICE_DATA;
  try {
    const raw = JSON.parse(json) as Record<string, unknown> | null;
    const phrases = Array.isArray(raw?.phrases) ? raw.phrases : [];
    const days = Array.isArray(raw?.practiceDays) ? raw.practiceDays : [];
    return {
      phrases: phrases.map(parsePhrase).filter((p): p is SavedPhrase => p !== null),
      practiceDays: days.filter((d): d is string => isText(d) && /^\d{4}-\d{2}-\d{2}$/.test(d)),
    };
  } catch {
    return EMPTY_PRACTICE_DATA;
  }
}
