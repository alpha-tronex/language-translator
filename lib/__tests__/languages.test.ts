import { SUPPORTED_LANGUAGES } from '../languages';

describe('SUPPORTED_LANGUAGES', () => {
  test('has unique language codes (they are used as React keys and API values)', () => {
    const codes = SUPPORTED_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  test('gives every language an English label and a native label', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(lang.label.trim()).not.toBe('');
      expect(lang.nativeLabel.trim()).not.toBe('');
    }
  });

  test('marks Arabic, and only Arabic, as right-to-left', () => {
    expect(SUPPORTED_LANGUAGES.filter((l) => l.rtl).map((l) => l.code)).toEqual(['ar']);
  });
});
