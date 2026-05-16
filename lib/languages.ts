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
