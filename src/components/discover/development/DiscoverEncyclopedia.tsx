import { useEffect, useId, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import {
  CHAPTER_WRITING_STYLE_OPTIONS, getSenTextDirection, normalizeChapterWritingStyle, normalizeSenLanguageCode,
  resolveReadingLanguageCode, SEN_LANGUAGES, type ChapterWritingStyle, type SenLanguageCode,
} from '@seihouse/sen/contracts';
import { isLoreCategory, loadLoreCatalogue, loreCopyLine, LORE_CATEGORIES, LORE_TERMS, searchLore, type LoreCategory, type LoreRenderings, type LoreTerm } from '../shared/loreCatalogue';
import { ENGLISH_LORE, LORE_ACCESSIBLE_ENGLISH, type LoreLabels, type LoreLocale, type LoreTermId } from '../shared/loreEnglish';
import './encyclopedia.css';

export interface DiscoverLoreLocation { term?: string; query?: string; category?: LoreCategory }
export interface DiscoverEncyclopediaProps {
  location: DiscoverLoreLocation;
  hrefFor: (location?: DiscoverLoreLocation) => string;
  onNavigate: (location?: DiscoverLoreLocation, replace?: boolean) => void;
  readingLanguage?: SenLanguageCode;
  interfaceLanguage?: SenLanguageCode;
  readingMode?: ChapterWritingStyle;
  embedded?: boolean;
  updatesOnly?: boolean;
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

/** The full reference arrives after Lore opens; until then the curated core is shown. */
function useLoreCatalogue() {
  const [terms, setTerms] = useState<readonly LoreTerm[]>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(false);
    loadLoreCatalogue().then(value => { if (active) setTerms(value); }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [attempt]);
  return { terms, failed, retry: () => setAttempt(value => value + 1) };
}

function useLoreRenderings(language: SenLanguageCode) {
  const [loaded, setLoaded] = useState<{ language: SenLanguageCode; renderings: LoreRenderings }>();
  const [failed, setFailed] = useState<SenLanguageCode>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setFailed(undefined);
    import('../shared/loreLocales').then(module => module.loadLoreRenderings(language)).then(renderings => {
      if (active) setLoaded({ language, renderings });
    }).catch(() => { if (active) setFailed(language); });
    return () => { active = false; };
  }, [language, attempt]);
  return {
    renderings: loaded?.language === language ? loaded.renderings : undefined,
    failed: failed === language,
    retry: () => setAttempt(value => value + 1),
  };
}

/** The only control on a term: copy a line a translation skill can use. */
function CopyButton({ text, labels, name }: { text: string; labels: LoreLabels; name: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);
  const copy = () => {
    const write = navigator.clipboard?.writeText(text);
    if (!write) { setState('failed'); return; }
    write.then(() => setState('copied'), () => setState('failed'));
  };
  return <button type="button" className="encyclopedia-copy" data-state={state} aria-label={state === 'idle' ? `${labels.copy}: ${name}` : undefined} onClick={copy}>
    <span aria-live="polite">{state === 'copied' ? labels.copied : state === 'failed' ? labels.copyFailed : labels.copy}</span>
  </button>;
}

function followLink(event: MouseEvent<HTMLAnchorElement>, navigate: () => void) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigate();
}

/** A global reference within Discover. All navigation stays in the host's Discover route. */
export function DiscoverEncyclopedia({ location, hrefFor, onNavigate, readingLanguage, interfaceLanguage = 'en', readingMode = 'Standard', embedded = false, updatesOnly = false }: DiscoverEncyclopediaProps) {
  const ids = useId();
  const Heading = embedded ? 'h2' : 'h1';
  const surface = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [chosenLanguage, setChosenLanguage] = useState<SenLanguageCode>();
  const [chosenMode, setChosenMode] = useState<ChapterWritingStyle>();
  const language = chosenLanguage ?? resolveReadingLanguageCode({ defaultReadingLanguage: readingLanguage, interfaceLanguage });
  const mode = chosenMode ?? normalizeChapterWritingStyle(readingMode);
  const ui = useLoreLocale(normalizeSenLanguageCode(interfaceLanguage));
  const content = useLoreLocale(language);
  const catalogue = useLoreCatalogue();
  const written = useLoreRenderings(language);
  const labels = (ui.locale ?? ENGLISH_LORE).labels;
  const uiCode = ui.locale ? interfaceLanguage : 'en';
  const copy = content.locale ?? ENGLISH_LORE;
  const contentCode = content.locale ? language : 'en';
  const terms = catalogue.terms ?? LORE_TERMS;
  const byId = useMemo(() => new Map(terms.map(entry => [entry.id, entry])), [terms]);
  const category = isLoreCategory(location.category) ? location.category : undefined;
  const term = location.term ? byId.get(location.term) : undefined;
  const curated = (entry: LoreTerm) => Object.hasOwn(copy.terms, entry.id) ? copy.terms[entry.id as LoreTermId] : undefined;
  /** How the term is written in the reading language, once that language's glossary column has arrived. */
  const writeAs = (entry: LoreTerm): { text: string; note?: string; lang: string } | undefined => {
    if (!written.renderings) return undefined;
    const [text, note] = written.renderings[entry.id] ?? [];
    if (text) return { text, note, lang: language };
    if (language === 'en') return { text: entry.name, lang: 'en' };
    const local = curated(entry);
    return local && contentCode === language ? { text: local[0], lang: contentCode } : undefined;
  };
  const title = (entry: LoreTerm) => {
    const local = curated(entry);
    if (local) return { text: local[0], lang: contentCode };
    const rendering = writeAs(entry);
    return rendering ?? { text: entry.name, lang: 'en' };
  };
  const meaningOf = (entry: LoreTerm) => {
    const local = curated(entry);
    // Localized definitions are already authored in concise, literal language.
    // English additionally has a direct-prose edition. Modes never discard facts.
    if (local) return { text: contentCode === 'en' && mode !== 'Standard' ? LORE_ACCESSIBLE_ENGLISH[entry.id as LoreTermId] : local[1], lang: contentCode };
    return { text: entry.meaning ?? '', lang: 'en' };
  };
  const copyLine = (entry: LoreTerm) => {
    const rendering = writeAs(entry);
    return rendering ? loreCopyLine(entry.name, rendering.text, rendering.note) : undefined;
  };
  const localNames = useMemo(() => Object.fromEntries(terms.map(entry => [entry.id, [
    ...(Object.hasOwn(copy.terms, entry.id) ? [copy.terms[entry.id as LoreTermId][0]] : []),
    ...(written.renderings?.[entry.id]?.[0] ? [written.renderings[entry.id][0]] : []),
  ]])), [terms, copy, written.renderings]);
  const matches = searchLore(location.query ?? '', category, localNames, terms);
  const directoryLocation = { query: location.query, category };
  const link = (next: DiscoverLoreLocation | undefined, children: ReactNode, className?: string) =>
    <a href={hrefFor(next)} className={className} onClick={event => followLink(event, () => onNavigate(next))}>{children}</a>;
  useEffect(() => {
    // The Library shell scrolls its main panel, not the window. Scope article
    // navigation to this surface so opening a result starts at its heading.
    if (!embedded || location.term) surface.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    heading.current?.focus({ preventScroll: true });
  }, [location.term, embedded]);

  const modeLabels: Record<ChapterWritingStyle, string> = {
    Standard: labels.standard, 'Clear Reading': labels.clear, 'Easy Read': labels.easy, 'Literal Reading': labels.literalMode,
  };
  const articleTitle = term && title(term);
  const meaning = term && meaningOf(term);
  const rendering = term && writeAs(term);
  const allLines = matches.map(copyLine).filter(Boolean).join('\n');
  const loading = !content.locale || !ui.locale || !catalogue.terms || !written.renderings;
  const failed = content.failed || ui.failed || catalogue.failed || written.failed;
  return <div ref={surface} data-discover data-encyclopedia data-no-interface-translate className={`discover encyclopedia${embedded ? ' encyclopedia--embedded' : ''}`} lang={uiCode} dir={getSenTextDirection(uiCode)}>
    {(!embedded || location.term) && <nav aria-label={labels.directory} className="encyclopedia-breadcrumb">
      {link(undefined, <><ArrowLeft aria-hidden="true" size={16} />{labels.back}</>)}
      {location.term && <><span aria-hidden="true">/</span>{link(directoryLocation, labels.directory)}</>}
    </nav>}
    <header className="encyclopedia-header">
      {!embedded && <p className="discover-eyebrow">SEIHouse · {labels.directory}</p>}
      <Heading ref={heading} tabIndex={-1} className="font-display">{articleTitle ? <bdi lang={articleTitle.lang}>{articleTitle.text}</bdi> : labels.title}</Heading>
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
    {loading && <p role="status" lang="en" dir="ltr" className="encyclopedia-load-status">
      {failed ? <>Some Lore text could not load. Showing what is available. <button type="button" onClick={() => { content.retry(); ui.retry(); catalogue.retry(); written.retry(); }}>Retry</button></> : 'Loading Lore…'}
    </p>}
    {location.term ? term && articleTitle && meaning ? <article className="encyclopedia-article" aria-label={articleTitle.text}>
      <aside className="encyclopedia-facts">
        <p className="encyclopedia-category" lang={contentCode} dir={getSenTextDirection(contentCode)}>{copy.categories[term.category]}</p>
        {(term.script || term.pronunciation) && <><h2>{labels.original}</h2>
          {term.script && <p className="encyclopedia-script" lang={term.originalLanguage} dir="ltr">{term.script}</p>}
          {term.pronunciation && <p className="encyclopedia-pronunciation" lang={term.originalLanguage === 'ko' ? 'ko-Latn' : term.originalLanguage === 'ja' ? 'ja-Latn' : term.originalLanguage === 'en' ? 'en-fonipa' : 'zh-Latn-pinyin'} dir="ltr">{term.pronunciation}</p>}
        </>}
        <p lang="en" dir="ltr">{term.name}</p>
        {term.aliases.length > 0 && <><h2>{labels.aliases}</h2>
          <ul className="encyclopedia-aliases">{term.aliases.map(alias => <li key={alias}><bdi>{alias}</bdi></li>)}</ul></>}
      </aside>
      <div className="encyclopedia-prose" data-reading-mode={mode}>
        <section aria-labelledby={`${ids}-meaning`}>
          <h2 id={`${ids}-meaning`}>{labels.meaning}</h2>
          {mode === 'Literal Reading' && meaning.lang === contentCode && Object.hasOwn(copy.terms, term.id) && <p className="encyclopedia-reading-note">{labels.literal}</p>}
          <div lang={meaning.lang} dir={getSenTextDirection(meaning.lang)}>
            {mode !== 'Standard'
              ? Array.from(new Intl.Segmenter(meaning.lang, { granularity: 'sentence' }).segment(meaning.text), part => <p key={part.index}>{part.segment}</p>)
              : <p>{meaning.text}</p>}
          </div>
        </section>
        {rendering && <section aria-labelledby={`${ids}-write`} className="encyclopedia-write-section">
          <h2 id={`${ids}-write`}>{labels.writeAs}</h2>
          <div className="encyclopedia-write encyclopedia-write--large">
            <bdi lang={rendering.lang} dir={getSenTextDirection(rendering.lang)}>{rendering.text}</bdi>
            <CopyButton text={copyLine(term)!} labels={labels} name={rendering.text} />
          </div>
          {rendering.note && <p className="encyclopedia-write-note" lang={rendering.lang} dir={getSenTextDirection(rendering.lang)}>{rendering.note}</p>}
        </section>}
        {term.related.some(id => byId.has(id)) && <section aria-labelledby={`${ids}-related`}>
          <h2 id={`${ids}-related`}>{labels.related}</h2>
          <ul className="encyclopedia-related">
            {term.related.flatMap(id => {
              const entry = byId.get(id);
              if (!entry) return [];
              const name = title(entry);
              return [<li key={id} lang={name.lang} dir={getSenTextDirection(name.lang)}>{link({ ...directoryLocation, term: id }, name.text)}</li>];
            })}
          </ul>
        </section>}
        {Object.hasOwn(copy.terms, term.id) && <section aria-labelledby={`${ids}-sources`}>
          <h2 id={`${ids}-sources`}>{labels.sources}</h2>
          <ul className="encyclopedia-related" lang="en" dir="ltr">
            {term.dictionary && <li><a href={`https://en.wiktionary.org/wiki/${encodeURIComponent(term.dictionary)}`} target="_blank" rel="noreferrer">Wiktionary · <bdi>{term.dictionary}</bdi></a></li>}
            {term.id === 'progression-fantasy'
              ? <li><a href="https://andrewkrowe.wordpress.com/2019/02/26/progression-fantasy-a-new-subgenre-concept/" target="_blank" rel="noreferrer">Andrew Rowe · Progression Fantasy</a></li>
              : <li><a href="https://www.wuxiaworld.com/page/general-glossary-of-terms" target="_blank" rel="noreferrer">Wuxiaworld · Genre glossary</a></li>}
          </ul>
        </section>}
      </div>
    </article> : catalogue.terms || catalogue.failed ? <div className="encyclopedia-empty"><p>{labels.missing}</p>{link(directoryLocation, labels.directory)}</div> : null : updatesOnly ? <div className="encyclopedia-empty" lang="en" dir="ltr">
      <h2>No followed Lore terms yet</h2><p>Term tracking is not available yet. Choose All to search the encyclopedia.</p>
    </div> : <>
      <label className="discover-search encyclopedia-search"><Search aria-hidden="true" size={20} /><span className="sr-only">{labels.search}</span>
        <input type="search" value={location.query ?? ''} onChange={event => onNavigate({ ...directoryLocation, query: event.target.value }, true)} placeholder={labels.search} />
      </label>
      <div className="encyclopedia-directory">
        <nav className="encyclopedia-categories" aria-label={labels.all} lang={contentCode} dir={getSenTextDirection(contentCode)}>
          <button type="button" lang={uiCode} dir={getSenTextDirection(uiCode)} aria-pressed={!category} onClick={() => onNavigate({ query: location.query }, true)}>{labels.all}<span>{terms.length}</span></button>
          {LORE_CATEGORIES.map(value => <button type="button" key={value} aria-pressed={category === value}
            onClick={() => onNavigate({ query: location.query, category: value }, true)}>{copy.categories[value]}<span>{terms.filter(entry => entry.category === value).length}</span></button>)}
        </nav>
        <section className="encyclopedia-results" aria-labelledby={`${ids}-results`}>
          <div className="encyclopedia-results-head">
            <div><h2 id={`${ids}-results`} lang={category ? contentCode : uiCode} dir={getSenTextDirection(category ? contentCode : uiCode)}>{category ? copy.categories[category] : labels.all}</h2><p role="status">{labels.results}: {matches.length}</p></div>
            {allLines && <CopyButton text={allLines} labels={{ ...labels, copy: labels.copyAll }} name={category ? copy.categories[category] : labels.all} />}
          </div>
          {matches.length === 0 ? <div className="encyclopedia-empty"><p>{labels.empty}</p><button type="button" onClick={() => onNavigate({}, true)}>{labels.reset}</button></div>
            : <ul>{matches.map(entry => {
              const name = title(entry);
              const summary = meaningOf(entry);
              const rendered = writeAs(entry);
              return <li key={entry.id} className="encyclopedia-entry">
                {link({ ...directoryLocation, term: entry.id }, <>
                  <span className="encyclopedia-result-title"><bdi lang={name.lang} dir={getSenTextDirection(name.lang)}>{name.text}</bdi>{entry.script && <bdi lang={entry.originalLanguage}>{entry.script}</bdi>}</span>
                  <span className="encyclopedia-result-meaning" lang={summary.lang} dir={getSenTextDirection(summary.lang)}>{summary.text}</span>
                  <span className="encyclopedia-result-aliases"><bdi lang="en">{[entry.name, ...entry.aliases.slice(0, 3)].join(' · ')}</bdi></span>
                </>, 'encyclopedia-result')}
                {rendered && <div className="encyclopedia-write">
                  <span lang={uiCode}>{labels.writeAs}</span>
                  <bdi lang={rendered.lang} dir={getSenTextDirection(rendered.lang)}>{rendered.text}</bdi>
                  <CopyButton text={copyLine(entry)!} labels={labels} name={rendered.text} />
                </div>}
              </li>;
            })}</ul>}
        </section>
      </div>
      <p className="encyclopedia-scope">{labels.scope}</p>
    </>}
  </div>;
}
