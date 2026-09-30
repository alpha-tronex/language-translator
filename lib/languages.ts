export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ar' | 'ja' | 'ko';

export type Language = {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
  rtl?: boolean;
};

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', label: 'English',  nativeLabel: 'English'   },
  { code: 'es', label: 'Spanish',  nativeLabel: 'Español'   },
  { code: 'fr', label: 'French',   nativeLabel: 'Français'  },
  { code: 'de', label: 'German',   nativeLabel: 'Deutsch'   },
  { code: 'zh', label: 'Mandarin', nativeLabel: '中文'      },
  { code: 'ar', label: 'Arabic',   nativeLabel: 'العربية', rtl: true },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語'             },
  { code: 'ko', label: 'Korean',   nativeLabel: '한국어'             },
];

/** "From" can also be auto-detect; "To" must be a real language. */
export type SourceLanguageCode = LanguageCode | 'auto';
export type SourceLanguage = Omit<Language, 'code'> & { code: SourceLanguageCode };

export const AUTO_DETECT: SourceLanguage = {
  code: 'auto',
  label: 'Auto-detect',
  nativeLabel: 'Detect my language',
};

/**
 * Finds a supported language by code, accepting the forms speech models
 * return ("FR", "zh-cn", "pt_BR" → base code). Undefined if unsupported.
 */
export function findLanguage(code: string | null | undefined): Language | undefined {
  const base = code?.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.find((l) => l.code === base);
}
