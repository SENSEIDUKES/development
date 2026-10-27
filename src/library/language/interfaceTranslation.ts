import { useLayoutEffect, useEffect, useRef } from 'react';
import { DEFAULT_SEN_LANGUAGE_CODE, getSenTextDirection, normalizeSenLanguageCode, type SenLanguageCode } from '@seihouse/sen/contracts';
import type { LanguageFormatters } from './types';
import { getLoadedLanguagePack, loadAllLanguagePacks, loadLanguagePack } from './localeLoader';

export { getLoadedLanguagePack, loadAllLanguagePacks, loadLanguagePack };

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface DynamicPattern {
  pattern: RegExp;
  apply: (formatters: LanguageFormatters, ...groups: string[]) => string;
}

const DYNAMIC_PATTERNS: readonly DynamicPattern[] = [
  {
    pattern: /^([\d,.\s]+)\s+DAO XP earned$/,
    apply: (f, n) => f.daoXpEarned(n),
  },
  {
    pattern: /^Saved on device:\s*(.+)$/,
    apply: (f, t) => f.savedOnDevice(t),
  },
  {
    pattern: /^Current Familiar:\s*(.+)$/,
    apply: (f, name) => f.currentFamiliar(name),
  },
  {
    pattern: /^Select\s+(.+)$/,
    apply: (f, name) => f.selectItem(name),
  },
  {
    pattern: /^([\d,.\s]+)\s+to spend$/,
    apply: (f, n) => f.toSpend(n),
  },
  {
    pattern: /^(\d+)\s+Day Streak$/,
    apply: (f, n) => f.dayStreak(n),
  },
  {
    pattern: /^([\d,.\s]+)\s+sealed scrolls?$/,
    apply: (f, n) => f.sealedScrolls(n),
  },
];

/**
 * Translates an interface string into the target `SenLanguageCode`, preserving
 * leading and trailing whitespace. Returns the input unchanged for `'en'`, when
 * the target language pack is not yet loaded, or when the text is not a known
 * interface phrase.
 */
export function translateInterfaceText(raw: string, language?: SenLanguageCode): string {
  const code = normalizeSenLanguageCode(language);
  if (code === DEFAULT_SEN_LANGUAGE_CODE || !raw) return raw;
  const pack = getLoadedLanguagePack(code);
  if (!pack) return raw;

  const trimmed = raw.trim();
  if (!trimmed) return raw;

  let translatedCore: string | undefined =
    pack.strings[trimmed] ?? pack.lowercaseLookup.get(trimmed.toLowerCase());
  if (!translatedCore && Object.prototype.hasOwnProperty.call(PHRASE_FALLBACKS, trimmed)) {
    const fallback = PHRASE_FALLBACKS[trimmed];
    translatedCore = pack.strings[fallback] ?? pack.lowercaseLookup.get(fallback.toLowerCase());
  }

  if (!translatedCore) {
    for (const { pattern, apply } of DYNAMIC_PATTERNS) {
      const match = pattern.exec(trimmed);
      if (match) {
        translatedCore = apply(pack.formatters, ...match.slice(1));
        break;
      }
    }
  }

  if (!translatedCore || translatedCore === trimmed) return raw;
  const leading = raw.slice(0, raw.indexOf(trimmed));
  const trailing = raw.slice(raw.indexOf(trimmed) + trimmed.length);
  return `${leading}${translatedCore}${trailing}`;
}

const PHRASE_FALLBACKS: Readonly<Record<string, string>> = {
  Preferences: 'Settings',
  'Preferred Language': 'Language',
};

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE']);
const LANGUAGE_SELECT_IDS = new Set([
  'cave-interface-language',
  'cave-reading-language',
  'header-preferred-language',
  'story-original-language',
  'story-seed-language',
  'world-settings-reading-language',
]);
const LANGUAGE_SELECT_NAMES = new Set(['interfaceLanguage', 'defaultReadingLanguage']);
const EXCLUDED_CONTENT_CLASSES = [
  'world-card-caption-title',
  'world-card-caption-creator',
  'world-card-cover-title',
  'world-card-info-title',
  'world-card-info-creator',
  'world-card-info-synopsis',
  'cave-home-bio',
] as const;

const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'aria-label', 'title'] as const;
type TranslatableAttribute = (typeof TRANSLATABLE_ATTRIBUTES)[number];

function hasExcludedContentClass(element: Element): boolean {
  const classList = element.classList;
  if (!classList || classList.length === 0) return false;
  for (const className of EXCLUDED_CONTENT_CLASSES) {
    if (classList.contains(className)) return true;
  }
  return false;
}

function isExcludedElement(element: Element): boolean {
  const tag = element.tagName;
  if (SKIP_TAGS.has(tag)) return true;
  if (
    element.hasAttribute('data-chapter-number') ||
    element.hasAttribute('data-sen-text-block') ||
    element.hasAttribute('data-read-aloud-title') ||
    element.hasAttribute('data-no-interface-translate') ||
    element.hasAttribute('data-cave-bio') ||
    element.hasAttribute('data-cave-full-bio') ||
    element.hasAttribute('data-cave-username') ||
    element.hasAttribute('data-story-blueprint') ||
    element.getAttribute('data-testid') === 'prose-chapter-body' ||
    hasExcludedContentClass(element)
  ) {
    return true;
  }
  if (tag === 'SELECT') {
    const id = element.id;
    const name = element.getAttribute('name');
    if ((id && LANGUAGE_SELECT_IDS.has(id)) || (name && LANGUAGE_SELECT_NAMES.has(name))) {
      return true;
    }
  }
  return false;
}

function isInsideExcludedSubtree(node: Node): boolean {
  let current: Element | null = node instanceof Element ? node : node.parentElement;
  while (current) {
    if (isExcludedElement(current)) return true;
    current = current.parentElement;
  }
  return false;
}

const trackedTextNodes = new WeakMap<Text, { raw: string; translated: string }>();
const trackedAttributes = new WeakMap<
  Element,
  Partial<Record<TranslatableAttribute, { raw: string; translated: string }>>
>();

let activeLanguage: SenLanguageCode = DEFAULT_SEN_LANGUAGE_CODE;
let observer: MutationObserver | null = null;
const registrations = new Map<symbol, { language: SenLanguageCode; preview: boolean }>();

function applyTextNode(node: Text, lang: SenLanguageCode) {
  const current = node.data;
  if (!current || !current.trim()) return;
  const tracked = trackedTextNodes.get(node);
  const raw = tracked && current === tracked.translated ? tracked.raw : current;

  if (lang === DEFAULT_SEN_LANGUAGE_CODE) {
    if (tracked && current === tracked.translated && current !== tracked.raw) {
      node.data = tracked.raw;
    }
    trackedTextNodes.delete(node);
    return;
  }

  const next = translateInterfaceText(raw, lang);
  if (next !== raw) {
    trackedTextNodes.set(node, { raw, translated: next });
    if (current !== next) node.data = next;
  } else if (tracked && current === tracked.translated && current !== raw) {
    node.data = raw;
    trackedTextNodes.delete(node);
  }
}

function applyElementAttribute(element: Element, attr: TranslatableAttribute, lang: SenLanguageCode) {
  const current = element.getAttribute(attr);
  if (!current || !current.trim()) return;
  const record = trackedAttributes.get(element);
  const tracked = record?.[attr];
  const raw = tracked && current === tracked.translated ? tracked.raw : current;

  if (lang === DEFAULT_SEN_LANGUAGE_CODE) {
    if (tracked && current === tracked.translated && current !== tracked.raw) {
      element.setAttribute(attr, tracked.raw);
    }
    if (record) {
      delete record[attr];
    }
    return;
  }

  const next = translateInterfaceText(raw, lang);
  if (next !== raw) {
    const updated = record ?? {};
    updated[attr] = { raw, translated: next };
    trackedAttributes.set(element, updated);
    if (current !== next) element.setAttribute(attr, next);
  } else if (tracked && current === tracked.translated && current !== raw) {
    element.setAttribute(attr, raw);
    if (record) {
      delete record[attr];
    }
  }
}

function applyElementAttributes(element: Element, lang: SenLanguageCode) {
  if (element.hasAttribute('data-no-interface-translate-attrs')) return;
  for (const attr of TRANSLATABLE_ATTRIBUTES) {
    if (element.hasAttribute(attr)) {
      applyElementAttribute(element, attr, lang);
    }
  }
}

function walkNode(node: Node, lang: SenLanguageCode) {
  const type = node.nodeType;
  if (type === Node.TEXT_NODE) {
    applyTextNode(node as Text, lang);
    return;
  }
  if (type === Node.ELEMENT_NODE) {
    const element = node as Element;
    if (isExcludedElement(element)) return;
    applyElementAttributes(element, lang);
  }
  let child = node.firstChild;
  while (child) {
    walkNode(child, lang);
    child = child.nextSibling;
  }
}

function translateSubtree(root: Node, lang: SenLanguageCode) {
  if (typeof document === 'undefined') return;
  try {
    if (root.nodeType === Node.TEXT_NODE) {
      if (!isInsideExcludedSubtree(root)) applyTextNode(root as Text, lang);
      return;
    }
    if (root.nodeType === Node.ELEMENT_NODE && isInsideExcludedSubtree(root)) {
      return;
    }
    walkNode(root, lang);
  } finally {
    observer?.takeRecords();
  }
}

function resolveDesiredLanguage(): SenLanguageCode {
  let chosen: SenLanguageCode = DEFAULT_SEN_LANGUAGE_CODE;
  for (const entry of registrations.values()) {
    if (entry.preview) return entry.language;
    chosen = entry.language;
  }
  return chosen;
}

function syncActiveLanguage() {
  if (typeof document === 'undefined' || !document.body) return;
  const nextLanguage = resolveDesiredLanguage();
  const changed = nextLanguage !== activeLanguage;
  activeLanguage = nextLanguage;
  document.documentElement.lang = activeLanguage;
  document.documentElement.dir = getSenTextDirection(activeLanguage);
  document.documentElement.dataset.interfaceLanguage = activeLanguage;

  if (activeLanguage === DEFAULT_SEN_LANGUAGE_CODE) {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (changed) translateSubtree(document.body, DEFAULT_SEN_LANGUAGE_CODE);
    return;
  }

  const loaded = getLoadedLanguagePack(activeLanguage);
  if (!loaded) {
    const requestedLanguage = activeLanguage;
    void loadLanguagePack(requestedLanguage)
      .then(() => {
        if (resolveDesiredLanguage() === requestedLanguage) {
          syncActiveLanguage();
        }
      })
      .catch(() => {
        // Keep current DOM text if the dynamic locale chunk fails to load.
      });
    return;
  }

  translateSubtree(document.body, activeLanguage);

  if (!observer && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(mutations => {
      if (activeLanguage === DEFAULT_SEN_LANGUAGE_CODE || !getLoadedLanguagePack(activeLanguage)) return;
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          translateSubtree(mutation.target, activeLanguage);
        } else if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => translateSubtree(node, activeLanguage));
        } else if (
          mutation.type === 'attributes' &&
          mutation.target.nodeType === Node.ELEMENT_NODE &&
          mutation.attributeName
        ) {
          const element = mutation.target as Element;
          if (!element.hasAttribute('data-no-interface-translate-attrs') && !isInsideExcludedSubtree(element)) {
            try {
              applyElementAttribute(element, mutation.attributeName as TranslatableAttribute, activeLanguage);
            } finally {
              observer?.takeRecords();
            }
          }
        }
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...TRANSLATABLE_ATTRIBUTES],
    });
  }
}

/**
 * Applies the selected `SenLanguageCode` across the application interface,
 * loading the language pack on demand when a non-English language is selected
 * or previewed, and restores the original English text immediately when
 * reverted or switched back to `'en'`.
 */
const HEADER_FALLBACK_ID = Symbol('header-fallback-language');

export function getActiveInterfaceLanguage(): SenLanguageCode {
  return activeLanguage;
}

export function setFallbackInterfaceLanguage(language: SenLanguageCode): void {
  registrations.set(HEADER_FALLBACK_ID, { language: normalizeSenLanguageCode(language), preview: false });
  syncActiveLanguage();
}

export function useInterfaceLanguageTranslation(language?: SenLanguageCode, preview = false): void {
  const idRef = useRef<symbol | null>(null);
  if (!idRef.current) idRef.current = Symbol('interface-language');
  const normalized = normalizeSenLanguageCode(language);

  useIsomorphicLayoutEffect(() => {
    registrations.delete(HEADER_FALLBACK_ID);
    registrations.set(idRef.current!, { language: normalized, preview });
    syncActiveLanguage();
  }, [normalized, preview]);

  useIsomorphicLayoutEffect(() => {
    const id = idRef.current!;
    return () => {
      registrations.delete(id);
      syncActiveLanguage();
    };
  }, []);
}
