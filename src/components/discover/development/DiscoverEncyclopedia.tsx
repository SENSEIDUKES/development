import { useEffect, useId, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowUpRight, BookOpen, Search } from 'lucide-react';
import {
  CHAPTER_WRITING_STYLE_OPTIONS, getSenTextDirection, normalizeChapterWritingStyle, normalizeSenLanguageCode,
  resolveReadingLanguageCode, SEN_LANGUAGES, type ChapterWritingStyle, type SenLanguageCode,
} from '@seihouse/sen/contracts';
import { findLoreTerm, isLoreCategory, LORE_CATEGORIES, LORE_TERMS, searchLore, type LoreCategory } from '../shared/loreCatalogue';
import { ENGLISH_LORE, LORE_ACCESSIBLE_ENGLISH, type LoreLocale, type LoreTermId } from '../shared/loreEnglish';
import './encyclopedia.css';

export interface DiscoverLoreLocation { term?: string; query?: string; category?: LoreCategory }
export interface DiscoverEncyclopediaProps {
  location: DiscoverLoreLocation;
  hrefFor: (location?: DiscoverLoreLocation) => string;
  onNavigate: (location?: DiscoverLoreLocation, replace?: boolean) => void;
  readingLanguage?: SenLanguageCode;
  interfaceLanguage?: SenLanguageCode;
  readingMode?: ChapterWritingStyle;
}

function useLoreLocale(language: SenLanguageCode) {
  const [loaded, setLoaded] = useState<{ language: SenLanguageCode; locale: LoreLocale }>();
  const [failed, setFailed] = useState<SenLanguageCode>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (language === 'en') return;
    let active = true;
    setFailed(undefined);
    import('../shared/loreLocales').then(module => module.loadLoreLocale(language)).then(locale => {
      if (active) setLoaded({ language, locale });
    }).catch(() => { if (active) setFailed(language); });
    return () => { active = false; };
  }, [language, attempt]);
  return {
    locale: language === 'en' ? ENGLISH_LORE : loaded?.language === language ? loaded.locale : undefined,
    failed: failed === language,
    retry: () => setAttempt(value => value + 1),
  };
}

function followLink(event: MouseEvent<HTMLAnchorElement>, navigate: () => void) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate();
}

/** The small doorway in the existing Discover shelves. */
export function DiscoverEncyclopediaEntry({ href, onOpen, language = 'en' }: {
  href: string; onOpen: () => void; language?: SenLanguageCode;
}) {
  const { locale } = useLoreLocale(normalizeSenLanguageCode(language));
  const copy = locale ?? ENGLISH_LORE;
  return <a href={href} onClick={event => followLink(event, onOpen)} className="discover-encyclopedia-entry"
    data-no-interface-translate lang={locale ? language : 'en'} dir={getSenTextDirection(locale ? language : 'en')}>
    <BookOpen aria-hidden="true" size={27} />
    <span><strong>{copy.labels.title}</strong><span>{copy.labels.intro}</span></span>
    <ArrowUpRight aria-hidden="true" size={22} />
  </a>;
}

/** A global, curated reference within Discover. All navigation stays in the host's Discover route. */
export function DiscoverEncyclopedia({ location, hrefFor, onNavigate, readingLanguage, interfaceLanguage = 'en', readingMode = 'Standard' }: DiscoverEncyclopediaProps) {
  const ids = useId();
  const surface = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [chosenLanguage, setChosenLanguage] = useState<SenLanguageCode>();
  const [chosenMode, setChosenMode] = useState<ChapterWritingStyle>();
  const language = chosenLanguage ?? resolveReadingLanguageCode({ defaultReadingLanguage: readingLanguage, interfaceLanguage });
  const mode = chosenMode ?? normalizeChapterWritingStyle(readingMode);
  const ui = useLoreLocale(normalizeSenLanguageCode(interfaceLanguage));
  const content = useLoreLocale(language);
  const labels = (ui.locale ?? ENGLISH_LORE).labels;
  const uiCode = ui.locale ? interfaceLanguage : 'en';
  const copy = content.locale ?? ENGLISH_LORE;
  const contentCode = content.locale ? language : 'en';
  const category = isLoreCategory(location.category) ? location.category : undefined;
  const term = location.term ? findLoreTerm(location.term) : undefined;
  // Localized definitions are already authored in concise, literal language.
  // English additionally has a direct-prose edition. Modes never discard facts.
  const meaning = term ? contentCode === 'en' && mode !== 'Standard'
    ? LORE_ACCESSIBLE_ENGLISH[term.id as LoreTermId] : copy.terms[term.id as LoreTermId][1] : '';
  const translations = useMemo(() => Object.fromEntries(Object.entries(copy.terms).map(([id, [name, meaning]]) => [id, { name, meaning }])), [copy]);
  const matches = searchLore(location.query ?? '', category, translations);
  const directoryLocation = { query: location.query, category };
  const link = (next: DiscoverLoreLocation | undefined, children: ReactNode, className?: string) =>
    <a href={hrefFor(next)} className={className} onClick={event => followLink(event, () => onNavigate(next))}>{children}</a>;
  useEffect(() => {
    // The Library shell scrolls its main panel, not the window. Scope article
    // navigation to this surface so opening a result starts at its heading.
    surface.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
  }, [location.term]);

  const modeLabels: Record<ChapterWritingStyle, string> = {
    Standard: labels.standard, 'Clear Reading': labels.clear, 'Easy Read': labels.easy, 'Literal Reading': labels.literalMode,
  };
  return <div ref={surface} data-discover data-encyclopedia data-no-interface-translate className="discover encyclopedia" lang={uiCode} dir={getSenTextDirection(uiCode)}>
    <nav aria-label={labels.directory} className="encyclopedia-breadcrumb">
      {link(undefined, <><ArrowLeft aria-hidden="true" size={16} />{labels.back}</>)}
      {location.term && <><span aria-hidden="true">/</span>{link(directoryLocation, labels.directory)}</>}
    </nav>
    <header className="encyclopedia-header">
      <p className="discover-eyebrow">SEIHouse · {labels.directory}</p>
      <h1 ref={heading} tabIndex={-1} className="font-display">{term ? <bdi lang={contentCode}>{copy.terms[term.id as LoreTermId][0]}</bdi> : labels.title}</h1>
      <p>{location.term ? labels.scope : labels.intro}</p>
    </header>
    <div className="encyclopedia-preferences">
      <label>{labels.language}<select value={language} onChange={event => setChosenLanguage(normalizeSenLanguageCode(event.target.value))}>
        {SEN_LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}
      </select></label>
      <label>{labels.mode}<select value={mode} onChange={event => setChosenMode(normalizeChapterWritingStyle(event.target.value))}>
        {CHAPTER_WRITING_STYLE_OPTIONS.map(value => <option key={value} value={value}>{modeLabels[value]}</option>)}
      </select></label>
    </div>
    {(!content.locale || !ui.locale) && <p role="status" lang="en" dir="ltr" className="encyclopedia-load-status">
      {content.failed || ui.failed ? <>The language text could not load. Showing English where needed. <button type="button" onClick={() => { content.retry(); ui.retry(); }}>Retry</button></> : 'Loading language…'}
    </p>}
    {location.term ? term ? <article className="encyclopedia-article" aria-label={copy.terms[term.id as LoreTermId][0]}>
      <aside className="encyclopedia-facts">
        <p className="encyclopedia-category" lang={contentCode} dir={getSenTextDirection(contentCode)}>{copy.categories[term.category][0]}</p>
        <h2>{labels.original}</h2>
        {term.script && <p className="encyclopedia-script" lang={term.originalLanguage} dir="ltr">{term.script}</p>}
        {term.pronunciation && <p className="encyclopedia-pronunciation" lang={term.originalLanguage === 'ko' ? 'ko-Latn' : term.originalLanguage === 'en' ? 'en-fonipa' : 'zh-Latn-pinyin'} dir="ltr">{term.pronunciation}</p>}
        <p lang="en" dir="ltr">{term.name}</p>
        <h2>{labels.aliases}</h2>
        <ul className="encyclopedia-aliases">{term.aliases.map(alias => <li key={alias}><bdi>{alias}</bdi></li>)}</ul>
      </aside>
      <div className="encyclopedia-prose" data-reading-mode={mode}>
        <section aria-labelledby={`${ids}-meaning`}>
          <h2 id={`${ids}-meaning`}>{labels.meaning}</h2>
          {mode === 'Literal Reading' && <p className="encyclopedia-reading-note">{labels.literal}</p>}
          <div lang={contentCode} dir={getSenTextDirection(contentCode)}>
            {mode !== 'Standard'
              ? Array.from(new Intl.Segmenter(contentCode, { granularity: 'sentence' }).segment(meaning), part => <p key={part.index}>{part.segment}</p>)
              : <p>{meaning}</p>}
          </div>
        </section>
        <section aria-labelledby={`${ids}-context`}>
          <h2 id={`${ids}-context`}>{labels.context}</h2>
          <p lang={contentCode} dir={getSenTextDirection(contentCode)}>{copy.categories[term.category][1]}</p>
        </section>
        <section aria-labelledby={`${ids}-related`}>
          <h2 id={`${ids}-related`}>{labels.related}</h2>
          <ul className="encyclopedia-related" lang={contentCode} dir={getSenTextDirection(contentCode)}>
            {term.related.map(id => <li key={id}>{link({ ...directoryLocation, term: id }, copy.terms[id as LoreTermId][0])}</li>)}
          </ul>
        </section>
        <section aria-labelledby={`${ids}-sources`}>
          <h2 id={`${ids}-sources`}>{labels.sources}</h2>
          <ul className="encyclopedia-related" lang="en" dir="ltr">
            {term.dictionary && <li><a href={`https://en.wiktionary.org/wiki/${encodeURIComponent(term.dictionary)}`} target="_blank" rel="noreferrer">Wiktionary · <bdi>{term.dictionary}</bdi></a></li>}
            {term.id === 'progression-fantasy'
              ? <li><a href="https://andrewkrowe.wordpress.com/2019/02/26/progression-fantasy-a-new-subgenre-concept/" target="_blank" rel="noreferrer">Andrew Rowe · Progression Fantasy</a></li>
              : <li><a href="https://www.wuxiaworld.com/page/general-glossary-of-terms" target="_blank" rel="noreferrer">Wuxiaworld · Genre glossary</a></li>}
          </ul>
        </section>
      </div>
    </article> : <div className="encyclopedia-empty"><p>{labels.missing}</p>{link(directoryLocation, labels.directory)}</div> : <>
      <label className="discover-search encyclopedia-search"><Search aria-hidden="true" size={20} /><span className="sr-only">{labels.search}</span>
        <input type="search" value={location.query ?? ''} onChange={event => onNavigate({ ...directoryLocation, query: event.target.value }, true)} placeholder={labels.search} />
      </label>
      <div className="encyclopedia-directory">
        <nav className="encyclopedia-categories" aria-label={labels.all} lang={contentCode} dir={getSenTextDirection(contentCode)}>
          <button type="button" lang={uiCode} dir={getSenTextDirection(uiCode)} aria-pressed={!category} onClick={() => onNavigate({ query: location.query }, true)}>{labels.all}<span>{LORE_TERMS.length}</span></button>
          {LORE_CATEGORIES.map(value => <button type="button" key={value} aria-pressed={category === value}
            onClick={() => onNavigate({ query: location.query, category: value }, true)}>{copy.categories[value][0]}<span>{LORE_TERMS.filter(entry => entry.category === value).length}</span></button>)}
        </nav>
        <section className="encyclopedia-results" aria-labelledby={`${ids}-results`}>
          <div className="encyclopedia-results-head"><h2 id={`${ids}-results`} lang={category ? contentCode : uiCode} dir={getSenTextDirection(category ? contentCode : uiCode)}>{category ? copy.categories[category][0] : labels.all}</h2><p role="status">{labels.results}: {matches.length}</p></div>
          {matches.length === 0 ? <div className="encyclopedia-empty"><p>{labels.empty}</p><button type="button" onClick={() => onNavigate({}, true)}>{labels.reset}</button></div>
            : <ul lang={contentCode} dir={getSenTextDirection(contentCode)}>{matches.map(entry => <li key={entry.id}>
              {link({ ...directoryLocation, term: entry.id }, <>
                <span className="encyclopedia-result-title">{copy.terms[entry.id as LoreTermId][0]}<bdi lang={entry.originalLanguage}>{entry.script}</bdi></span>
                <span className="encyclopedia-result-meaning">{copy.terms[entry.id as LoreTermId][1]}</span>
                <span className="encyclopedia-result-aliases"><bdi lang="en">{entry.name} · {entry.aliases.slice(0, 3).join(' · ')}</bdi></span>
              </>, 'encyclopedia-result')}
            </li>)}</ul>}
        </section>
      </div>
      <p className="encyclopedia-scope">{labels.scope}</p>
    </>}
  </div>;
}
