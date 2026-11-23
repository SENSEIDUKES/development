import FocusLock from 'react-focus-lock';
import { memo, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronRight, Plus, RefreshCw, Tag, Wand2, X } from 'lucide-react';
import { LibrarySearchIcon as SENSearchIcon } from '@seihouse/ui/sen';
import {
  CatalogTagChip, CategoryColorDot, handleRadioGroupKeyDown, radioGroupTabIndex, searchStoryTags, STORY_TAG_LIMIT, suggestStoryTags,
  type StoryStyle, type StoryTagMeaning, type StoryTagMetadata,
} from '@seihouse/sen/story-seed';
import { NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import {
  CATEGORY_COLORS, findStoryTagNiche, getTagMetadata, normalizeStoryTagIdentity, STORY_TAG_CATALOG, storyTagNicheEntries,
  type StoryTagCategory,
} from '../../constants';
import { updateStoryTags, type UpdateSeed } from '../../seedState';

const TAG_LIMIT = STORY_TAG_LIMIT;
const FAMILIES = Object.keys(CATEGORY_COLORS) as StoryTagCategory[];
/** The browse sheet's scopes: the story's own genre, every tag, or one family. */
const GENRE_SCOPE = 'genre';
const ALL_SCOPE = 'all';

export interface OriginTagEditorProps {
  premise: string;
  genre?: string;
  storyTags: string[];
  selectedStyle?: StoryStyle;
  meaning?: StoryTagMeaning;
  /** What is typed into tag search; the parent fingerprints a described phrase. */
  search: string;
  onSearchChange: (search: string) => void;
  updateSeed: UpdateSeed;
  addTag: (tag: string) => boolean;
  tagLimitError: string | null;
  setTagLimitError: Dispatch<SetStateAction<string | null>>;
}

/** One search result: a full-width row, easy to hit with a thumb. */
const TagRow = ({ entry, selected, onToggle }: { entry: StoryTagMetadata; selected: boolean; onToggle: (tag: string) => void }) => (
  <button type="button" aria-pressed={selected} onClick={() => onToggle(entry.label)}
    className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-start font-sans text-sm transition-colors ${selected ? 'bg-portal/10 text-portal' : 'text-neutral-200 hover:bg-white/5'}`}>
    <CategoryColorDot color={entry.color} />
    <span className="min-w-0 flex-1 truncate">{entry.label}</span>
    <span className="shrink-0 truncate font-sans text-[11px] text-neutral-400">{entry.category}</span>
    {selected ? <Check size={16} aria-hidden="true" className="shrink-0" /> : <Plus size={16} aria-hidden="true" className="shrink-0 text-neutral-400" />}
  </button>
);

/**
 * Story Tags on Origin, built for a phone (SENSEI, 2026-11-22). The page holds
 * only what a thumb needs: the creator's tags, one search box that finds a tag
 * by name or by what it means and adds the creator's own, and the engine's
 * suggestions, all visible at once. Every other tag waits in a full-height
 * sheet with its own Done, so nothing scrolls inside a box on the page.
 */
export const OriginTagEditor = memo(({
  premise, genre, storyTags, selectedStyle, meaning, search, onSearchChange, updateSeed, addTag, tagLimitError, setTagLimitError,
}: OriginTagEditorProps) => {
  const [browseOpen, setBrowseOpen] = useState(false);
  // Suggestions the creator passed over by asking for more; a new story direction starts over.
  const [passedOver, setPassedOver] = useState<string[]>([]);
  useEffect(() => setPassedOver([]), [premise, genre, selectedStyle]);
  const suggestions = useMemo(
    () => suggestStoryTags({ synopsis: premise, genre, style: selectedStyle, picked: storyTags, skip: passedOver, meaning }),
    [premise, genre, selectedStyle, storyTags, passedOver, meaning],
  );
  // Asking for more sets the shown ones aside; once every tag with a case has been shown, the round starts again.
  const moreSuggestions = () => setPassedOver(previous => suggestions.length
    ? [...previous, ...suggestions.map(entry => entry.label)]
    : []);

  const selected = useMemo(() => new Set(storyTags.map(normalizeStoryTagIdentity)), [storyTags]);
  const isSelected = (tag: string) => selected.has(normalizeStoryTagIdentity(tag));
  const toggleTag = (tag: string) => {
    if (isSelected(tag)) {
      setTagLimitError(null);
      updateSeed(updateStoryTags(previous => previous.filter(existing => normalizeStoryTagIdentity(existing) !== normalizeStoryTagIdentity(tag))));
    } else addTag(tag);
  };

  const query = search.trim();
  const results = useMemo(() => searchStoryTags({ query, meaning }), [query, meaning]);
  const ownTag = query.replace(/^\s*,|,\s*$/g, '').trim();
  // The creator's own wording becomes a tag when no catalog tag has that name and it is not already theirs.
  const canAddOwn = Boolean(ownTag) && !getTagMetadata(ownTag) && !isSelected(ownTag);
  const addOwnTag = () => { if (addTag(ownTag)) onSearchChange(''); };

  return (
    <section className="glass-panel space-y-3 p-4 sm:p-5" aria-labelledby="origin-tags-title">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p id="origin-tags-title" className="flex items-center gap-2 font-sc text-[11px] font-bold uppercase tracking-widest text-signal"><Tag size={13} className="text-[#CDB271]" aria-hidden="true" />Tags</p>
          <p className="mt-1 font-sans text-xs text-neutral-400">Required — choose at least one. The writer reads your tags every chapter.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 font-sans text-[11px] text-neutral-400">
          <span title="Recommended: 4–8 tags.">{storyTags.length} / {TAG_LIMIT}</span>
          {storyTags.length > 0 && <button type="button" onClick={() => { setTagLimitError(null); updateSeed(updateStoryTags(() => [])); }} className="story-seed-compact-hit-target font-sc text-[10px] uppercase tracking-widest text-neutral-400 transition-colors hover:text-red-300">Clear all</button>}
        </div>
      </div>

      {storyTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Your tags">
          {storyTags.map(tag => {
            const metadata = getTagMetadata(tag);
            return (
              <button key={tag} type="button" onClick={() => toggleTag(tag)} aria-label={`Remove tag ${tag}`}
                className="glass-chip story-seed-touch-target animate-fadeIn px-2.5 py-1 font-sans text-xs transition-colors hover:border-red-300/40">
                {metadata && <CategoryColorDot color={metadata.color} />}
                {/* A catalog tag reads in the creator's language; their own wording is never translated. */}
                <span className="font-semibold" data-no-interface-translate={metadata ? undefined : ''}>{tag}</span>
                <X size={12} aria-hidden="true" className="text-neutral-400" />
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {tagLimitError && <motion.p id="tag-limit-error" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="rounded border border-[#8B0000]/30 bg-[#8B0000]/10 px-3 py-2 font-sans text-xs text-red-400">{tagLimitError}</motion.p>}
      </AnimatePresence>

      <LibraryTextBox id="celestial-tag-search-input" size="compact" icon={SENSearchIcon} value={search} onChange={onSearchChange}
        onKeyDown={event => { if (event.key === 'Enter' && canAddOwn && results.length === 0) { event.preventDefault(); addOwnTag(); } }}
        placeholder="Search, describe, or add your own tag" aria-label="Search story tags" aria-controls="origin-tag-results" />

      {query ? (
        <div id="origin-tag-results" role="group" aria-label="Matching tags" className="space-y-0.5">
          {results.map(entry => <TagRow key={entry.label} entry={entry} selected={isSelected(entry.label)} onToggle={toggleTag} />)}
          {canAddOwn && (
            <button type="button" id="custom-tag-add" onClick={addOwnTag}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-lg border border-dashed border-portal/40 px-2.5 text-start font-sans text-sm text-portal transition-colors hover:bg-portal/10">
              <Plus size={16} aria-hidden="true" className="shrink-0" />
              <span className="min-w-0 flex-1 truncate">{`Add “${ownTag}” as your own tag`}</span>
            </button>
          )}
          {results.length === 0 && !canAddOwn && <p className="py-2 font-sans text-xs text-neutral-400">No tag matches that yet.</p>}
        </div>
      ) : (
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1.5 font-sc text-[10px] font-bold uppercase tracking-widest text-neutral-300"><Wand2 size={12} className="shrink-0 text-[#CDB271]" aria-hidden="true" />Suggested
              <span className="min-w-0 truncate font-sans text-[11px] font-normal normal-case tracking-normal text-neutral-400">· {premise.trim() ? 'for your synopsis and genre' : genre ? 'for your genre' : 'choose a genre or write a synopsis'}</span>
            </p>
            {(suggestions.length > 0 || passedOver.length > 0) && (
              <button type="button" onClick={moreSuggestions} aria-label="Show more tag suggestions"
                className="story-seed-touch-target inline-flex min-h-[2.75rem] shrink-0 items-center gap-1.5 rounded-full border border-portal/40 bg-portal/10 px-3 font-sc text-[10px] font-bold uppercase tracking-widest text-portal transition-colors hover:border-portal hover:bg-portal/20">
                <RefreshCw size={12} aria-hidden="true" />More tags
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5" id="style-suggested-tags" aria-live="polite">
            {suggestions.length === 0 && <p className="font-sans text-xs text-neutral-400">{passedOver.length ? 'That is every suggestion. Tap More tags to see them again, or browse all tags.' : 'Choose a genre or write your synopsis, or browse all tags.'}</p>}
            {suggestions.map(entry => <CatalogTagChip key={entry.label} entry={entry} selected={false} onToggle={toggleTag} />)}
          </div>
        </div>
      )}

      <button type="button" aria-haspopup="dialog" aria-expanded={browseOpen} onClick={() => setBrowseOpen(true)} id="origin-tag-browse"
        className="story-seed-touch-target flex min-h-11 w-full items-center justify-between gap-2 border-t border-neutral-800/80 pt-3 font-sc text-[10px] font-bold uppercase tracking-widest text-[#CDB271] transition-colors hover:text-[#E3C878]">
        <span>Browse all tags<span className="ms-2 font-sans text-[11px] font-normal normal-case tracking-normal text-neutral-400">{STORY_TAG_CATALOG.length} by genre and family</span></span>
        <ChevronRight size={14} aria-hidden="true" className="rtl:-scale-x-100" />
      </button>

      <TagBrowserSheet open={browseOpen} onClose={() => setBrowseOpen(false)} genre={genre} storyTags={storyTags} isSelected={isSelected} onToggle={toggleTag} tagLimitError={tagLimitError} />
    </section>
  );
});

OriginTagEditor.displayName = 'OriginTagEditor';

/**
 * Every tag, in a sheet that fills a phone: a row of scopes to swipe (the
 * story's genre, all tags, each family), one list that scrolls, and the count
 * with Done pinned in the thumb's reach.
 */
const TagBrowserSheet = ({ open, onClose, genre, storyTags, isSelected, onToggle, tagLimitError }: {
  open: boolean;
  onClose: () => void;
  genre?: string;
  storyTags: string[];
  isSelected: (tag: string) => boolean;
  onToggle: (tag: string) => void;
  tagLimitError: string | null;
}) => {
  const niche = findStoryTagNiche(genre);
  const [scope, setScope] = useState<string>(niche ? GENRE_SCOPE : ALL_SCOPE);
  // Opening the sheet starts on the story's own genre, when it has starter tags.
  useEffect(() => { if (open) setScope(niche ? GENRE_SCOPE : ALL_SCOPE); }, [open, niche]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const scopes = useMemo(() => [
    ...(niche ? [{ id: GENRE_SCOPE, label: niche.label, count: niche.tags.length, family: undefined as StoryTagCategory | undefined }] : []),
    { id: ALL_SCOPE, label: 'All tags', count: STORY_TAG_CATALOG.length, family: undefined as StoryTagCategory | undefined },
    ...FAMILIES.map(family => ({ id: family, label: family, count: STORY_TAG_CATALOG.filter(entry => entry.category === family).length, family })),
  ], [niche]);
  const entries = useMemo(() => scope === GENRE_SCOPE && niche ? storyTagNicheEntries(niche)
    : scope === ALL_SCOPE ? STORY_TAG_CATALOG
      : STORY_TAG_CATALOG.filter(entry => entry.category === scope), [scope, niche]);
  // The genre's tags keep its own order of families; everything else follows the catalog's.
  const groups = useMemo(() => [...new Set(entries.map(entry => entry.category))]
    .map(family => ({ family, entries: entries.filter(entry => entry.category === family) })), [entries]);

  const scopeRow = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    scopeRow.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    list.current?.scrollTo?.({ top: 0 });
  }, [open, scope]);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div key="tag-browser" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
          <FocusLock returnFocus className="contents">
            <motion.div role="dialog" aria-modal="true" aria-label="All story tags" id="origin-tag-browser"
              initial={{ y: 32, opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative z-10 flex h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.75rem] border border-[rgba(150,166,220,0.28)] bg-[#080b18] text-start font-sans sm:h-[min(44rem,88vh)] sm:rounded-3xl">
              <div className="shrink-0 px-4 pt-2 sm:px-6 sm:pt-4">
                <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
                <div className="flex items-center gap-3">
                  <h2 className="min-w-0 flex-1 font-sc text-sm font-bold uppercase tracking-widest text-signal">All tags</h2>
                  <button type="button" onClick={onClose} aria-label="Close tags"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-white/5 hover:text-signal"><X size={18} aria-hidden="true" /></button>
                </div>
                <div ref={scopeRow} role="radiogroup" aria-label="Tag groups" id="tag-categories"
                  className="scrollbar-thin -mx-4 mt-1 flex snap-x gap-1.5 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6">
                  {scopes.map((option, index) => {
                    const chosen = option.id === scope;
                    return (
                      <button key={option.id} type="button" role="radio" aria-checked={chosen} tabIndex={radioGroupTabIndex(chosen, true, index)}
                        onKeyDown={handleRadioGroupKeyDown} onClick={() => setScope(option.id)}
                        className={`inline-flex min-h-11 shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 font-sc text-[10px] font-bold uppercase tracking-[0.14em] transition-all ${chosen ? 'border-portal/60 bg-portal/10 text-portal shadow-[0_0_10px_rgba(4,172,255,0.18)]' : 'border-[rgba(150,166,220,0.22)] bg-[#0d1126]/60 text-neutral-300 hover:border-[rgba(150,166,220,0.45)] hover:text-signal'}`}>
                        {option.family && <CategoryColorDot color={CATEGORY_COLORS[option.family]} />}{option.label}
                        <span className="font-sans text-[10px] font-normal tracking-normal text-neutral-400">{option.count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div ref={list} id="filtered-tags-list" className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain border-t border-neutral-800/80 px-4 py-3 sm:px-6">
                {groups.map(({ family, entries: tags }) => (
                  <div key={family} role="group" aria-label={family}>
                    <p className="mb-2 flex items-center gap-1.5 font-sc text-[10px] font-bold uppercase tracking-widest text-neutral-300"><CategoryColorDot color={CATEGORY_COLORS[family]} />{family}</p>
                    <div className="flex flex-wrap content-start gap-1.5">
                      {tags.map(entry => <CatalogTagChip key={entry.label} entry={entry} selected={isSelected(entry.label)} onToggle={onToggle} />)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="shrink-0 border-t border-neutral-800/80 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                {tagLimitError && <p role="alert" className="mb-2 font-sans text-xs text-red-400">{tagLimitError}</p>}
                <div className="flex items-center gap-3">
                  <p className="min-w-0 flex-1 font-sans text-xs text-neutral-300" aria-live="polite">{`${storyTags.length} / ${TAG_LIMIT} chosen`}</p>
                  <button type="button" onClick={onClose}
                    className="min-h-11 rounded-xl border border-portal/50 bg-portal/10 px-6 font-sc text-[11px] font-bold uppercase tracking-widest text-portal transition-colors hover:border-portal hover:bg-portal/20">Done</button>
                </div>
              </div>
            </motion.div>
          </FocusLock>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
