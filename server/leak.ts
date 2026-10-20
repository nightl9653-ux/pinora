import { LOCALES, t, type Locale } from "../src/game/locale";
import { renderClue } from "./clue";
import type { Place } from "./data/places";
import type { Fact } from "./data/types";

function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "");
}

function hasHan(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(text);
}

export function mentions(text: string, name: string): boolean {
  const token = name.trim();
  if (token.length < 2) return false;
  if (hasHan(token)) return text.includes(token);
  const source = fold(text);
  const needle = fold(token);
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const flags = needle.length >= 4 ? "iu" : "u";
  const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, flags);
  return pattern.test(source);
}

export function forbidden(place: Place): string[] {
  return [...Object.values(place.names), ...(place.aliases ?? [])]
    .map((name) => name.trim())
    .filter((name) => name.length >= 2);
}

export function clueMentionsPlace(fact: Fact, place: Place, locale: Locale): string | null {
  if (!fact.conceal) return null;
  const clue = renderClue(fact.kind, locale, t(fact.subject, locale));
  for (const name of forbidden(place)) {
    if (mentions(clue, name)) return name;
  }
  return null;
}

export function leakedLocales(fact: Fact, place: Place): string[] {
  return LOCALES.flatMap((locale) => {
    const name = clueMentionsPlace(fact, place, locale);
    return name ? [`${locale}:${name}`] : [];
  });
}
