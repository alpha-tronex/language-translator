import {
  addPhrase,
  currentStreak,
  dayKey,
  EMPTY_PRACTICE_DATA,
  findSaved,
  masteryOf,
  MAX_SAVED_PHRASES,
  NewPhrase,
  parsePracticeData,
  practicedToday,
  PracticeData,
  recordAttempt,
  removePhrase,
} from '../practiceList';

/** Local noon on a given day, so tests don't depend on the machine's time zone. */
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const NOW = at(2026, 10, 2);

const station: NewPhrase = {
  sourceText: 'Where is the station?',
  sourceLang: 'en',
  translation: '¿Dónde está la estación?',
  targetLang: 'es',
};
const thanks: NewPhrase = { sourceText: 'Thank you', sourceLang: 'en', translation: 'Gracias', targetLang: 'es' };

const withStation = addPhrase(EMPTY_PRACTICE_DATA, station, 'id-1', NOW);

describe('addPhrase', () => {
  test('saves a starred phrase with no practice history yet', () => {
    expect(withStation.phrases).toEqual([
      {
        id: 'id-1',
        ...station,
        createdAt: NOW,
        favorite: true,
        bestScore: null,
        attemptCount: 0,
        nailedCount: 0,
        lastPracticedAt: null,
      },
    ]);
  });

  test('puts the newest phrase first', () => {
    const data = addPhrase(withStation, thanks, 'id-2', NOW + 1);

    expect(data.phrases.map((p) => p.id)).toEqual(['id-2', 'id-1']);
  });

  test('saving the same translation twice changes nothing', () => {
    expect(addPhrase(withStation, { ...station, sourceText: 'said differently' }, 'id-9', NOW)).toBe(withStation);
  });

  test('the same words in another target language are a different phrase', () => {
    const data = addPhrase(withStation, { ...station, targetLang: 'fr' }, 'id-2', NOW);

    expect(data.phrases).toHaveLength(2);
  });

  test('keeps the scores of attempts made before the phrase was starred', () => {
    const data = addPhrase(EMPTY_PRACTICE_DATA, { ...station, scores: [50, 90, 100] }, 'id-1', NOW);

    expect(data.phrases[0]).toMatchObject({ bestScore: 100, attemptCount: 3, nailedCount: 2, lastPracticedAt: NOW });
  });

  test('ignores an empty translation', () => {
    expect(addPhrase(EMPTY_PRACTICE_DATA, { ...station, translation: '  ' }, 'id-1', NOW)).toBe(EMPTY_PRACTICE_DATA);
  });

  test('drops the oldest phrase once the list is full', () => {
    let data: PracticeData = EMPTY_PRACTICE_DATA;
    for (let i = 0; i <= MAX_SAVED_PHRASES; i++) {
      data = addPhrase(data, { ...station, translation: `frase ${i}` }, `id-${i}`, NOW + i);
    }

    expect(data.phrases).toHaveLength(MAX_SAVED_PHRASES);
    expect(data.phrases[0].id).toBe(`id-${MAX_SAVED_PHRASES}`);
    expect(data.phrases.some((p) => p.id === 'id-0')).toBe(false);
  });
});

describe('findSaved and removePhrase', () => {
  test('finds a phrase by translation and target language', () => {
    expect(findSaved(withStation, { translation: '¿Dónde está la estación?', targetLang: 'es' })?.id).toBe('id-1');
    expect(findSaved(withStation, { translation: '¿Dónde está la estación?', targetLang: 'fr' })).toBeUndefined();
    expect(findSaved(withStation, null)).toBeUndefined();
  });

  test('removes only the phrase with that id', () => {
    const two = addPhrase(withStation, thanks, 'id-2', NOW);

    expect(removePhrase(two, 'id-1').phrases.map((p) => p.id)).toEqual(['id-2']);
    expect(removePhrase(two, 'nope').phrases).toHaveLength(2);
  });
});

describe('recordAttempt', () => {
  test('updates best score, attempts and last practiced on a saved phrase', () => {
    const once = recordAttempt(withStation, station, 60, NOW);
    const twice = recordAttempt(once, station, 40, NOW + 1000);

    expect(once.phrases[0]).toMatchObject({ bestScore: 60, attemptCount: 1, nailedCount: 0, lastPracticedAt: NOW });
    expect(twice.phrases[0]).toMatchObject({ bestScore: 60, attemptCount: 2, lastPracticedAt: NOW + 1000 });
  });

  test('counts today toward the streak even when the phrase is not saved', () => {
    const data = recordAttempt(EMPTY_PRACTICE_DATA, station, 70, NOW);

    expect(data.phrases).toEqual([]);
    expect(data.practiceDays).toEqual(['2026-10-02']);
  });

  test('a second attempt on the same day does not add the day twice', () => {
    const data = recordAttempt(recordAttempt(withStation, station, 70, NOW), station, 80, NOW + 1000);

    expect(data.practiceDays).toEqual(['2026-10-02']);
  });

  test('leaves other phrases untouched', () => {
    const two = addPhrase(withStation, thanks, 'id-2', NOW);

    expect(recordAttempt(two, thanks, 90, NOW).phrases.find((p) => p.id === 'id-1')).toBe(two.phrases[1]);
  });
});

describe('masteryOf', () => {
  test('new until the first attempt', () => {
    expect(masteryOf(withStation.phrases[0])).toBe('new');
  });

  test('practicing after any attempt, including one "Nailed it"', () => {
    expect(masteryOf(recordAttempt(withStation, station, 30, NOW).phrases[0])).toBe('practicing');
    expect(masteryOf(recordAttempt(withStation, station, 85, NOW).phrases[0])).toBe('practicing');
  });

  test('mastered after scoring 85 or more twice: once could be luck', () => {
    const data = recordAttempt(recordAttempt(withStation, station, 85, NOW), station, 100, NOW);

    expect(masteryOf(data.phrases[0])).toBe('mastered');
  });

  test('84 does not count toward mastery', () => {
    const data = recordAttempt(recordAttempt(withStation, station, 84, NOW), station, 84, NOW);

    expect(masteryOf(data.phrases[0])).toBe('practicing');
  });
});

describe('streak', () => {
  test('dayKey uses the local calendar day, zero-padded', () => {
    expect(dayKey(at(2026, 1, 5, 23))).toBe('2026-01-05');
    expect(dayKey(at(2026, 1, 6, 0))).toBe('2026-01-06');
  });

  test('no practice, no streak', () => {
    expect(currentStreak([], NOW)).toBe(0);
  });

  test('counts consecutive days ending today', () => {
    expect(currentStreak(['2026-09-30', '2026-10-01', '2026-10-02'], NOW)).toBe(3);
  });

  test('is still alive today if the last practice was yesterday', () => {
    expect(currentStreak(['2026-09-30', '2026-10-01'], NOW)).toBe(2);
    expect(practicedToday(['2026-09-30', '2026-10-01'], NOW)).toBe(false);
  });

  test('is lost after a full day without practice', () => {
    expect(currentStreak(['2026-09-29', '2026-09-30'], NOW)).toBe(0);
  });

  test('a gap ends the count', () => {
    expect(currentStreak(['2026-09-28', '2026-09-30', '2026-10-01', '2026-10-02'], NOW)).toBe(3);
  });

  test('crosses month and year boundaries', () => {
    expect(currentStreak(['2025-12-31', '2026-01-01'], at(2026, 1, 1))).toBe(2);
  });

  test('works late at night and just after midnight', () => {
    expect(currentStreak(['2026-10-02'], at(2026, 10, 2, 23))).toBe(1);
    expect(currentStreak(['2026-10-02'], at(2026, 10, 3, 0))).toBe(1);
  });
});

describe('parsePracticeData', () => {
  test('round-trips what was saved', () => {
    const data = recordAttempt(withStation, station, 90, NOW);

    expect(parsePracticeData(JSON.stringify(data))).toEqual(data);
  });

  test.each([[null], [''], ['not json'], ['null'], ['42'], ['{"phrases":"nope"}']])(
    'returns an empty list for %p instead of crashing on launch',
    (json) => {
      expect(parsePracticeData(json)).toEqual(EMPTY_PRACTICE_DATA);
    }
  );

  test('drops malformed phrases and days but keeps the good ones', () => {
    const json = JSON.stringify({
      phrases: [withStation.phrases[0], { id: 'x' }, null, 'text', { id: 'y', translation: '', targetLang: 'es' }],
      practiceDays: ['2026-10-02', 'yesterday', 7],
    });

    expect(parsePracticeData(json)).toEqual({ phrases: withStation.phrases, practiceDays: ['2026-10-02'] });
  });

  test('fills in defaults for fields a later version might omit or corrupt', () => {
    const json = JSON.stringify({ phrases: [{ id: 'a', translation: 'Hola', targetLang: 'es', bestScore: 250, attemptCount: -1 }] });

    expect(parsePracticeData(json).phrases[0]).toEqual({
      id: 'a',
      sourceText: '',
      sourceLang: 'auto',
      translation: 'Hola',
      targetLang: 'es',
      createdAt: 0,
      favorite: true,
      bestScore: 100,
      attemptCount: 0,
      nailedCount: 0,
      lastPracticedAt: null,
    });
  });
});
