/**
 * Learning mode scoring: compares what the student should have said with
 * what the speech model heard. Pure functions only (testability rule R4).
 *
 * The score is a guide, not a grade: speech models tidy what they hear
 * toward fluent text, so a rough accent can still produce a perfect
 * transcript.
 */

/** Languages written without spaces between words are compared character by character. */
export const CHARACTER_BASED_LANGUAGES: readonly string[] = ['zh', 'ja'];

export const NAILED_IT_SCORE = 85;
export const ALMOST_SCORE = 60;

export type Verdict = 'nailed' | 'almost' | 'tryAgain';

export type DiffToken = {
  /** The text as written, shown to the student. */
  text: string;
  /**
   * matched: said and heard. missed: expected but not heard.
   * extra: heard but not expected. neutral: punctuation, not scored.
   */
  status: 'matched' | 'missed' | 'extra' | 'neutral';
};

export type PracticeScore = {
  /** 0–100. */
  score: number;
  verdict: Verdict;
  /** The expected phrase, token by token, for highlighting. */
  expected: DiffToken[];
  /** What was heard, token by token. */
  heard: DiffToken[];
};

// Explicit ranges instead of \p{…} classes: those are not reliable on every
// Hermes version, and Jest (Node) can't tell us when they break on a phone.
/** Latin accents (after NFD), Arabic vowel marks and tatweel. Japanese dakuten are kept: が is not か. */
const ACCENTS = /[̀-ًͯ-ٰٟـ]/g;
const PUNCTUATION =
  /[!-/:-@[-`{-~¡-¿ -⁯　-〿＀-／：-＠［-｀｛-･،؛؟٪-٭۔]/g;

/** For comparison only: lowercase, no accents, no punctuation. */
export function normalizeForComparison(text: string): string {
  return text
    .normalize('NFD')
    .replace(ACCENTS, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(PUNCTUATION, '')
    .trim();
}

const EDGE_PUNCTUATION = new RegExp(`^${PUNCTUATION.source}+|${PUNCTUATION.source}+$`, 'g');

/** A token as it should be spoken: "station?" → "station", but "don't" keeps its apostrophe and accents stay. */
export function wordForSpeech(token: string): string {
  return token.trim().replace(EDGE_PUNCTUATION, '');
}

export function isCharacterBased(lang: string | null | undefined): boolean {
  return CHARACTER_BASED_LANGUAGES.includes((lang ?? '').toLowerCase().split(/[-_]/)[0]);
}

/** Words for most languages; single characters for Chinese and Japanese. */
export function tokenize(text: string, lang: string | null | undefined): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return isCharacterBased(lang) ? Array.from(trimmed.replace(/\s+/g, '')) : trimmed.split(/\s+/);
}

export function verdictFor(score: number): Verdict {
  if (score >= NAILED_IT_SCORE) return 'nailed';
  return score >= ALMOST_SCORE ? 'almost' : 'tryAgain';
}

export const VERDICT_LABELS: Record<Verdict, string> = {
  nailed: 'Nailed it!',
  almost: 'Almost!',
  tryAgain: 'Try again',
};

type Scored = { text: string; key: string };

/**
 * Levenshtein alignment over tokens. Returns the edit distance and, for each
 * side, which tokens lined up with an identical token on the other side.
 */
function align(a: Scored[], b: Scored[]): { distance: number; aMatched: boolean[]; bMatched: boolean[] } {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j < cols; j++) d[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const substitution = d[i - 1][j - 1] + (a[i - 1].key === b[j - 1].key ? 0 : 1);
      d[i][j] = Math.min(substitution, d[i - 1][j] + 1, d[i][j - 1] + 1);
    }
  }

  const aMatched = new Array<boolean>(a.length).fill(false);
  const bMatched = new Array<boolean>(b.length).fill(false);
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    const same = a[i - 1].key === b[j - 1].key;
    if (d[i][j] === d[i - 1][j - 1] + (same ? 0 : 1)) {
      if (same) {
        aMatched[i - 1] = true;
        bMatched[j - 1] = true;
      }
      i--;
      j--;
    } else if (d[i][j] === d[i - 1][j] + 1) {
      i--;
    } else {
      j--;
    }
  }
  return { distance: d[a.length][b.length], aMatched, bMatched };
}

/**
 * Scores a practice attempt. `lang` is the language being practiced (the
 * translation's language).
 */
export function scoreAttempt(expected: string, heard: string, lang: string | null | undefined): PracticeScore {
  const toScored = (text: string): Scored[] =>
    tokenize(text, lang).map((t) => ({ text: t, key: normalizeForComparison(t) }));
  const expectedAll = toScored(expected);
  const heardAll = toScored(heard);
  // Tokens that are only punctuation ("—", "。") are shown but not scored.
  const expectedScored = expectedAll.filter((t) => t.key);
  const heardScored = heardAll.filter((t) => t.key);

  const { distance, aMatched, bMatched } = align(expectedScored, heardScored);
  const longest = Math.max(expectedScored.length, heardScored.length);
  const score = longest === 0 ? 0 : Math.round(100 * (1 - distance / longest));

  const mark = (all: Scored[], matched: boolean[], miss: 'missed' | 'extra'): DiffToken[] => {
    let n = 0;
    return all.map((t) => ({
      text: t.text,
      status: !t.key ? 'neutral' : matched[n++] ? 'matched' : miss,
    }));
  };

  return {
    score,
    verdict: verdictFor(score),
    expected: mark(expectedAll, aMatched, 'missed'),
    heard: mark(heardAll, bMatched, 'extra'),
  };
}
