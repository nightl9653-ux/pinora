/** UI and clue locales. Same daily places worldwide; missing strings fall back to English. */
export const LOCALES = [
  "en",
  "zh-Hans",
  "zh-Hant",
  "es",
  "pt-BR",
  "pt-PT",
  "fr",
  "de",
  "ja",
  "ko",
  "it",
  "ru",
  "ar",
  "hi",
  "id",
  "ms",
  "tr",
  "vi",
  "th",
  "pl",
  "nl",
  "sv",
  "da",
  "nb",
  "fi",
  "cs",
  "sk",
  "hu",
  "ro",
  "uk",
  "el",
  "he",
  "tl",
  "bn",
  "ta",
  "te",
  "mr",
  "gu",
  "kn",
  "ml",
  "pa",
  "ur",
  "fa",
  "sw",
  "am",
  "ha",
  "yo",
  "az",
  "ka",
  "hy",
  "kk",
  "uz",
  "mn",
  "ne",
  "si",
  "km",
  "my",
  "ca",
  "eu",
  "gl",
  "cy",
  "ga",
  "is",
  "lt",
  "lv",
  "et",
  "sl",
  "hr",
  "sr",
  "bg",
  "sq",
  "mk",
  "be",
  "af",
  "zu",
  "mi",
  "eo",
] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * Languages shown in the UI picker. Keep this short so every option is actually playable.
 * Full LOCALES stays for templates / future expansion; missing copy falls back to English.
 */
export const PICKER_LOCALES = [
  "en",
  "zh-Hans",
  "zh-Hant",
  "es",
  "pt-BR",
  "fr",
  "de",
  "ja",
  "ko",
  "it",
  "ru",
  "id",
  "ar",
  "hi",
  "tr",
  "vi",
  "th",
  "pl",
  "nl",
  "uk",
  "he",
  "ms",
] as const satisfies readonly Locale[];

export type PickerLocale = (typeof PICKER_LOCALES)[number];

/** English required; other locales optional and fall back with `t()`. */
export type L10n = { en: string } & Partial<Record<Locale, string>>;

export const CATEGORIES = ["food", "film", "music", "city", "history"] as const;
export type Category = (typeof CATEGORIES)[number];
export type Kind = "food" | "film" | "music" | "nickname" | "landmark" | "history";
export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type Continent = "AF" | "AS" | "EU" | "NA" | "OC" | "SA";

/** Hand-authored pack used by the first languages in the question bank. */
export function L(
  en: string,
  zhHans: string,
  zhHant: string,
  es: string,
  pt: string,
  fr: string,
  de: string,
  ja: string,
  ko: string,
): L10n {
  return {
    en,
    "zh-Hans": zhHans,
    "zh-Hant": zhHant,
    es,
    "pt-BR": pt,
    "pt-PT": pt,
    fr,
    de,
    ja,
    ko,
  };
}

export function t(bag: L10n, locale: Locale): string {
  return bag[locale] ?? bag.en;
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isPickerLocale(value: string): value is PickerLocale {
  return (PICKER_LOCALES as readonly string[]).includes(value);
}

export function intlTag(locale: Locale): string {
  if (locale === "zh-Hans") return "zh-CN";
  if (locale === "zh-Hant") return "zh-TW";
  if (locale === "pt-BR") return "pt-BR";
  if (locale === "pt-PT") return "pt-PT";
  return locale;
}

export const RTL = new Set<Locale>(["ar", "he", "fa", "ur"]);
