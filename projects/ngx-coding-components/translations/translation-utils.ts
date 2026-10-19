/** Translation trees contain nested namespaces or leaf values. */
export type TranslationMap = Record<string, unknown>;

const isTranslationMap = (value: unknown): value is TranslationMap => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

/** Preserve library defaults and recursively apply application overrides. */
export function mergeTranslations(base: TranslationMap, overrides: TranslationMap): TranslationMap {
  const entries = Object.entries(overrides).map(([key, value]) => [
    key,
    isTranslationMap(base[key]) && isTranslationMap(value) ?
      mergeTranslations(base[key], value) : value
  ]);
  return { ...base, ...Object.fromEntries(entries) };
}

/** Prefer an exact locale, its base language, then the configured fallback. */
export function selectTranslationsForLanguage(
  language: string,
  translationsByLanguage: Record<string, TranslationMap>,
  fallbackLanguage = 'de'
): TranslationMap {
  const normalized = language.trim().toLowerCase();
  const candidates = [normalized, normalized.split('-')[0], fallbackLanguage];
  const selected = candidates.find(candidate => (
    candidate && Object.prototype.hasOwnProperty.call(translationsByLanguage, candidate)
  ));
  return selected ? translationsByLanguage[selected] : {};
}
