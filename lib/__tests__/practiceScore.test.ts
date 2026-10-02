import {
  ALMOST_SCORE,
  isCharacterBased,
  NAILED_IT_SCORE,
  normalizeForComparison,
  scoreAttempt,
  tokenize,
  verdictFor,
  wordForSpeech,
} from '../practiceScore';

const statuses = (tokens: { text: string; status: string }[]) => tokens.map((t) => `${t.text}:${t.status}`);

describe('normalizeForComparison', () => {
  test('ignores case, punctuation and accents, so "¿Dónde está?" equals "donde esta"', () => {
    expect(normalizeForComparison('¿Dónde está?')).toBe('donde esta');
  });

  test('treats straight and curly apostrophes the same', () => {
    expect(normalizeForComparison("Don't")).toBe(normalizeForComparison('don’t'));
  });

  test('keeps German umlauts comparable with their base letters and leaves ß alone', () => {
    expect(normalizeForComparison('Schön')).toBe('schon');
    expect(normalizeForComparison('Straße')).toBe('straße');
  });

  test('removes Arabic vowel marks, which speech models usually leave out', () => {
    expect(normalizeForComparison('مَرْحَبًا')).toBe('مرحبا');
  });

  test('keeps Japanese voicing marks: が and か are different sounds', () => {
    expect(normalizeForComparison('が')).toBe('が');
    expect(normalizeForComparison('が')).not.toBe(normalizeForComparison('か'));
  });

  test('keeps Korean syllables intact', () => {
    expect(normalizeForComparison('안녕하세요.')).toBe('안녕하세요');
  });

  test('removes CJK and full-width punctuation', () => {
    expect(normalizeForComparison('你好,世界!。')).toBe('你好世界');
  });

  test('a punctuation-only string normalizes to nothing', () => {
    expect(normalizeForComparison(' — ')).toBe('');
  });
});

describe('tokenize', () => {
  test('splits spaced languages into words', () => {
    expect(tokenize('  Where is   the station? ', 'en')).toEqual(['Where', 'is', 'the', 'station?']);
  });

  test('splits Chinese and Japanese into characters, dropping spaces', () => {
    expect(tokenize('你好 世界', 'zh')).toEqual(['你', '好', '世', '界']);
    expect(tokenize('こんにちは', 'ja')).toHaveLength(5);
  });

  test('accepts regional codes such as zh-CN', () => {
    expect(isCharacterBased('zh-CN')).toBe(true);
    expect(isCharacterBased('ko')).toBe(false);
    expect(isCharacterBased(null)).toBe(false);
  });

  test('returns no tokens for blank text', () => {
    expect(tokenize('   ', 'en')).toEqual([]);
  });
});

describe('verdictFor', () => {
  test.each([
    [100, 'nailed'],
    [NAILED_IT_SCORE, 'nailed'],
    [NAILED_IT_SCORE - 1, 'almost'],
    [ALMOST_SCORE, 'almost'],
    [ALMOST_SCORE - 1, 'tryAgain'],
    [0, 'tryAgain'],
  ])('a score of %i is "%s"', (score, verdict) => {
    expect(verdictFor(score)).toBe(verdict);
  });
});

describe('scoreAttempt', () => {
  test('a perfect attempt scores 100 even when case, accents and punctuation differ', () => {
    const result = scoreAttempt('¿Dónde está la estación?', 'donde esta la estacion', 'es');

    expect(result.score).toBe(100);
    expect(result.verdict).toBe('nailed');
    expect(result.expected.every((t) => t.status === 'matched')).toBe(true);
  });

  test('one wrong word out of four scores 75 and marks only that word', () => {
    const result = scoreAttempt('Where is the station', 'Where is the nation', 'en');

    expect(result.score).toBe(75);
    expect(result.verdict).toBe('almost');
    expect(statuses(result.expected)).toEqual(['Where:matched', 'is:matched', 'the:matched', 'station:missed']);
    expect(statuses(result.heard)).toEqual(['Where:matched', 'is:matched', 'the:matched', 'nation:extra']);
  });

  test('a skipped word in the middle does not throw off the words after it', () => {
    const result = scoreAttempt('I would like a coffee please', 'I would like coffee please', 'en');

    expect(statuses(result.expected)).toEqual([
      'I:matched',
      'would:matched',
      'like:matched',
      'a:missed',
      'coffee:matched',
      'please:matched',
    ]);
    expect(result.score).toBe(83);
  });

  test('extra words lower the score and are marked on the heard side', () => {
    const result = scoreAttempt('Good morning', 'um good morning everyone', 'en');

    expect(result.score).toBe(50);
    expect(statuses(result.heard)).toEqual(['um:extra', 'good:matched', 'morning:matched', 'everyone:extra']);
  });

  test('nothing heard scores 0 and every expected word is missed', () => {
    const result = scoreAttempt('Good morning', '', 'en');

    expect(result.score).toBe(0);
    expect(result.verdict).toBe('tryAgain');
    expect(statuses(result.expected)).toEqual(['Good:missed', 'morning:missed']);
    expect(result.heard).toEqual([]);
  });

  test('a completely different phrase scores 0', () => {
    expect(scoreAttempt('Good morning', 'see you tomorrow', 'en').score).toBe(0);
  });

  test('Chinese is compared character by character', () => {
    const result = scoreAttempt('你好世界', '你好世间', 'zh');

    expect(result.score).toBe(75);
    expect(statuses(result.expected)).toEqual(['你:matched', '好:matched', '世:matched', '界:missed']);
  });

  test('Japanese punctuation is shown but not scored', () => {
    const result = scoreAttempt('ありがとう。', 'ありがとう', 'ja');

    expect(result.score).toBe(100);
    expect(result.expected[result.expected.length - 1]).toEqual({ text: '。', status: 'neutral' });
  });

  test('a stand-alone dash is not counted as a missed word', () => {
    const result = scoreAttempt('Yes — of course', 'yes of course', 'en');

    expect(result.score).toBe(100);
    expect(statuses(result.expected)).toEqual(['Yes:matched', '—:neutral', 'of:matched', 'course:matched']);
  });

  test('a repeated word only matches as many times as it was said', () => {
    const result = scoreAttempt('very very good', 'very good', 'en');

    expect(result.expected.filter((t) => t.status === 'matched')).toHaveLength(2);
    expect(result.score).toBe(67);
  });

  test('an empty expected phrase scores 0 rather than dividing by zero', () => {
    expect(scoreAttempt('', '', 'en').score).toBe(0);
  });
});

describe('wordForSpeech', () => {
  test('drops punctuation around a word but keeps accents and inner apostrophes', () => {
    expect(wordForSpeech('¿Dónde')).toBe('Dónde');
    expect(wordForSpeech('estación?')).toBe('estación');
    expect(wordForSpeech("don't,")).toBe("don't");
  });

  test('punctuation alone leaves nothing to say', () => {
    expect(wordForSpeech('—')).toBe('');
  });
});
