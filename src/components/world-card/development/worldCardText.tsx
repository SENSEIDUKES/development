import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';

/**
 * How a world's words meet a reader in another language. Every card follows three rules:
 *
 * - The creator's name is never translated. It is identity, shown as the creator wrote it.
 * - The title shows in the reader's language only when the world has a real translation of it
 *   (the creator's own, or one made for reading). Otherwise it stays in its original language,
 *   with a small language tag so the reader knows the story is in another language. A card
 *   never machine-translates a title.
 * - The details (genre, chapters, status) are interface words, so the interface translates them.
 *
 * Titles and names are marked as the author's words, so the interface translator never rewrites
 * them even when they match an interface phrase ("Fantasy", "Rankings"), and each carries its
 * own language so the page sets its lettering correctly (no capitals or wide spacing for
 * scripts without them, joined Arabic letters, room for marks).
 */

/** The reader's language for card text. Without a provider, titles show as written. */
const WorldCardReaderLanguage = createContext<string | undefined>(undefined);

export function WorldCardLanguageProvider({ language, children }: { language?: string; children: ReactNode }) {
  return <WorldCardReaderLanguage.Provider value={language}>{children}</WorldCardReaderLanguage.Provider>;
}

/**
 * The page's interface language, as the interface translator sets it on the document, so cards
 * follow the reader's language wherever the translator runs, with no provider in the host.
 */
function subscribePageLanguage(onChange: () => void) {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return () => {};
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-interface-language'] });
  return () => observer.disconnect();
}
const pageLanguage = () => typeof document === 'undefined' ? undefined : document.documentElement.dataset.interfaceLanguage || undefined;

/** The reader's language: a provider's (the Workshop's switcher), else the page's interface language. */
export function useWorldCardReaderLanguage() {
  const provided = useContext(WorldCardReaderLanguage);
  const page = useSyncExternalStore(subscribePageLanguage, pageLanguage, () => undefined);
  return provided ?? page;
}

/** The language's primary subtag, lowercase: `zh-CN` → `zh`. */
const base = (code?: string) => code?.trim().toLowerCase().split(/[-_]/)[0] || undefined;

/** The short tag a card shows for a story in another language: `ja` → `JA`, `zh-TW` → `ZH`. */
export function languageTag(code: string) {
  return base(code)!.toUpperCase();
}

export type WorldTextWorld = Pick<HomeWorld, 'title' | 'originalLanguage' | 'titleTranslations'>;

export interface WorldTitleText {
  text: string;
  /** The language the shown text is in, when known. */
  lang?: string;
  /** Set when the title shows in a language other than the reader's: its short tag. */
  foreignTag?: string;
  /** The language's full code behind the tag, for an accessible name. */
  foreignLanguage?: string;
}

/** Which title a reader sees: their own language's real translation, or the original. */
export function resolveWorldTitle(world: WorldTextWorld, readerLanguage?: string): WorldTitleText {
  const original = world.originalLanguage?.trim() || undefined;
  const reader = readerLanguage?.trim() || undefined;
  if (!reader || !original || base(original) === base(reader)) return { text: world.title, lang: original };
  const translations = world.titleTranslations ?? {};
  const key = Object.keys(translations).find(code => code === reader)
    ?? Object.keys(translations).find(code => base(code) === base(reader));
  const translated = key ? translations[key]?.trim() : undefined;
  if (translated) return { text: translated, lang: key };
  return { text: world.title, lang: original, foreignTag: languageTag(original), foreignLanguage: original };
}

export function useWorldTitle(world: WorldTextWorld) {
  return resolveWorldTitle(world, useWorldCardReaderLanguage());
}

/** The creator name's language, for any world shape that may carry it. */
export function creatorLanguageOf(world: object): string | undefined {
  return 'creatorLanguage' in world && typeof world.creatorLanguage === 'string' ? world.creatorLanguage : undefined;
}

/** The attributes that mark a creator's words: never translated, in their own language. */
export function authorText(lang?: string) {
  return { 'data-no-interface-translate': '', ...(lang?.trim() ? { lang: lang.trim() } : {}) };
}

/** The small tag beside a story's details when its title is in another language. */
export function WorldLanguageTag({ title }: { title: WorldTitleText }) {
  if (!title.foreignTag) return null;
  let name = title.foreignLanguage;
  try { name = new Intl.DisplayNames(undefined, { type: 'language' }).of(title.foreignLanguage!) ?? name; } catch { /* keep the code */ }
  return <abbr className="world-card-language-tag" title={name} aria-label={`In ${name}`} data-no-interface-translate="">{title.foreignTag}</abbr>;
}
