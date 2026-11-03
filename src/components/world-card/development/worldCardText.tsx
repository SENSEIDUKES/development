import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type PointerEvent, type ReactNode } from 'react';
import type { HomeWorld } from '../../light-novels-home/shared/homeContracts';

/**
 * How a world's words meet a reader in another language. Every card follows three rules:
 *
 * - The creator's name is never translated. It is identity, shown as the creator wrote it.
 * - The title shows in the reader's language only when the world has a real translation of it
 *   (the creator's own, or one made for reading). Otherwise it stays in its original language.
 *   The card stays clean: the language appears only in a small pop-up when the reader hovers the
 *   title (or holds a finger on it), and in the card's accessible name. A card never
 *   machine-translates a title.
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
  if (!reader || !original) return { text: world.title, lang: original };
  // Only real translations count: a blank entry never hides a usable one.
  const translations = Object.entries(world.titleTranslations ?? {})
    .map(([code, text]) => [code, text?.trim()] as const).filter(([, text]) => Boolean(text));
  // The reader's exact language first (a zh-TW reader of a zh-CN world gets its zh-TW title),
  // then the original when it already shares the reader's base language, then any regional match.
  const exact = translations.find(([code]) => code.toLowerCase() === reader.toLowerCase());
  if (exact) return { text: exact[1]!, lang: exact[0] };
  if (base(original) === base(reader)) return { text: world.title, lang: original };
  const regional = translations.find(([code]) => base(code) === base(reader));
  if (regional) return { text: regional[1]!, lang: regional[0] };
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

/** A language's name, in the reader's language when the browser knows it: `ko` → "Korean". */
export function languageDisplayName(code: string, inLanguage?: string) {
  try { return new Intl.DisplayNames(inLanguage ? [inLanguage, 'en'] : undefined, { type: 'language' }).of(code) ?? code; } catch { return code; }
}

/** How long a finger rests on a title before its language shows, and how long it stays. */
const PEEK_HOLD_MS = 450;
const PEEK_SHOW_MS = 1800;

/**
 * The language pop-up for a title in another language. The host element (a card's caption, or
 * the whole Feature card) shows it while hovered or focused; a finger held on it for a moment
 * shows it on touch screens, and that hold does not also open the world. Nothing shows for a
 * title in the reader's own language.
 */
export function useLanguagePeek(title: WorldTitleText, placement: 'above' | 'top' = 'above') {
  const reader = useWorldCardReaderLanguage();
  const [held, setHeld] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  const peeked = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!title.foreignTag) return { hostProps: {}, peek: null, spokenLanguage: undefined };

  const name = languageDisplayName(title.foreignLanguage!, reader);
  const cancel = () => { clearTimeout(timer.current); start.current = null; };
  const hostProps = {
    'data-language-host': placement,
    'data-language-peek': held ? 'true' : undefined,
    onPointerDown: (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return;
      // A new press starts clean: a pop-up left from an earlier hold closes.
      peeked.current = false;
      setHeld(false);
      start.current = { x: event.clientX, y: event.clientY };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        peeked.current = true;
        setHeld(true);
        timer.current = setTimeout(() => setHeld(false), PEEK_SHOW_MS);
      }, PEEK_HOLD_MS);
    },
    // A finger that moves is scrolling, not holding.
    onPointerMove: (event: PointerEvent) => {
      if (start.current && Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10) cancel();
    },
    onPointerUp: () => { if (!peeked.current) cancel(); start.current = null; },
    onPointerCancel: cancel,
    // The hold that showed the language does not also open the world.
    onClickCapture: (event: { preventDefault(): void; stopPropagation(): void }) => {
      if (!peeked.current) return;
      peeked.current = false;
      event.preventDefault();
      event.stopPropagation();
    },
  };
  const peek = <span className="world-card-language-peek" aria-hidden="true" data-no-interface-translate="">
    <span className="world-card-language-peek-tag">{title.foreignTag}</span>{name}
  </span>;
  return { hostProps, peek, spokenLanguage: name };
}
