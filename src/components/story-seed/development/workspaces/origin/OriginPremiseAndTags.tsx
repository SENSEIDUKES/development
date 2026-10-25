import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { ChevronDown, Feather, Sparkles, Tag, Wand2, X } from 'lucide-react';
import { LibrarySearchIcon as SENSearchIcon } from '@seihouse/library-ui';
import { AnimatePresence, motion } from 'motion/react';
import { STORY_PREMISE_MAX_LENGTH, STORY_TAG_LIMIT } from '@seihouse/sen/story-seed';
import { type StoryStyle } from '@seihouse/sen/story-seed';
import {
  CATEGORY_COLORS,
  CURATED_PREMISE_EXAMPLES,
  findStoryTagNiche,
  GENRE_PRESETS,
  getStoryTagNiches,
  getTagMetadata,
  STORY_TAG_COLOR_ACCENTS,
  normalizeStoryTagIdentity,
  STORY_TAG_CATALOG,
  STORY_TAG_NICHES,
  storyTagNicheEntries,
  type StoryTagCategory,
  type StoryTagCategoryColor,
  type StoryTagMetadata,
} from '../../constants';
import { recommendStoryTags } from '@seihouse/sen/story-seed';
import { updateStoryTags, type UpdateSeed } from '../../seedState';
import { NarrativeDragonCycleIcon as LibraryDragonCycleIcon, NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { workspaceCompactLabelClass } from '../SeedSectionFrame';
import { handleRadioGroupKeyDown, radioGroupTabIndex } from '../../radioGroupKeyboard';
import { GENRE_PATH_SIGILS } from './OriginGenrePicker';

const TAG_LIMIT = STORY_TAG_LIMIT;
const TAG_LIMIT_MESSAGE = `Fated limit reached. Only up to ${TAG_LIMIT} celestial tags can be woven into the universe.`;
const TAG_RECOMMENDED_COPY = 'Recommended: 4–8 tags.';
const SEARCH_RESULT_LIMIT = 24;
const ALL_CURATED_PREMISE_EXAMPLES = Object.values(CURATED_PREMISE_EXAMPLES).flat();

const TAG_COLOR_ACCENTS = STORY_TAG_COLOR_ACCENTS;

const CategoryColorDot = ({ color }: { color: StoryTagCategoryColor }) => (
  <span
    aria-hidden="true"
    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
    style={color === 'black'
      ? { backgroundColor: '#000000', boxShadow: '0 0 0 1px rgba(226, 232, 240, 0.45)' }
      : { backgroundColor: TAG_COLOR_ACCENTS[color] }}
  />
);

const categoryBorderStyle = (color: StoryTagCategoryColor): CSSProperties | undefined =>
  color === 'black' ? undefined : { borderColor: `${TAG_COLOR_ACCENTS[color]}4D` };

const tagChipClass = (selected: boolean) => selected
  ? 'border-portal bg-neutral-900 font-semibold text-portal shadow-[0_0_8px_rgba(4,172,255,0.15)]'
  : 'border-neutral-800/70 bg-[#0b0e1e]/50 text-neutral-400 hover:border-neutral-700 hover:text-signal';

/** A chip's hover title: its family, then the niches it belongs to. */
const tagChipTitle = (entry: StoryTagMetadata) => {
  const niches = getStoryTagNiches(entry.label).map(niche => niche.label);
  return niches.length ? `${entry.category} · In: ${niches.join(', ')}` : entry.category;
};

const CatalogTagChip = ({ entry, selected, onToggle, className = '' }: {
  entry: StoryTagMetadata;
  selected: boolean;
  onToggle: (tag: string) => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={() => onToggle(entry.label)}
    title={tagChipTitle(entry)}
    style={selected ? undefined : categoryBorderStyle(entry.color)}
    className={`story-seed-touch-target flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${tagChipClass(selected)} ${className}`}
  >
    <CategoryColorDot color={entry.color} />
    {selected ? '✓' : '+'} {entry.label}
  </button>
);

const matchesTagSearch = (entry: StoryTagMetadata, query: string) =>
  entry.label.toLowerCase().includes(query)
  || entry.category.toLowerCase().includes(query)
  || entry.aliases.some(alias => alias.toLowerCase().includes(query));

/** The browser's niche choice: one genre path's niche, or every tag. */
const ALL_TAGS = 'all';
const FAMILY_ORDER = Object.keys(CATEGORY_COLORS) as StoryTagCategory[];
const NICHE_OPTIONS = [
  { id: ALL_TAGS, label: 'All tags', count: STORY_TAG_CATALOG.length },
  ...STORY_TAG_NICHES.map(niche => ({ id: niche.id, label: niche.label, count: niche.tags.length })),
];
const PRESET_NAMES = new Map(GENRE_PRESETS.map(preset => [preset.id, preset.name]));
const nicheIdForGenre = (genre: string | undefined) => findStoryTagNiche(genre)?.id ?? ALL_TAGS;

interface OriginPremiseAndTagsProps {
  premise: string;
  genre?: string;
  storyTags: string[];
  selectedStyle?: StoryStyle;
  onPremiseChange: (premise: string) => void;
  updateSeed: UpdateSeed;
  beforeTags?: ReactNode;
}

export const OriginPremiseAndTags = ({
  premise,
  genre,
  storyTags,
  selectedStyle,
  onPremiseChange,
  updateSeed,
  beforeTags,
}: OriginPremiseAndTagsProps) => {
  const [dismissedGhostKey, setDismissedGhostKey] = useState<string | null>(null);
  const [tagLimitError, setTagLimitError] = useState<string | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const [cycleRotation, setCycleRotation] = useState(0);
  const premiseBank = selectedStyle
    ? CURATED_PREMISE_EXAMPLES[selectedStyle]
    : ALL_CURATED_PREMISE_EXAMPLES;
  const premiseExample = premiseBank[exampleIndex % premiseBank.length];
  const ghostSuggestionCandidate = useMemo(
    () => premise.trim() && storyTags.length < TAG_LIMIT
      ? recommendStoryTags({ premise, genre, style: selectedStyle }, storyTags, 1)[0]?.label ?? null
      : null,
    [premise, genre, selectedStyle, storyTags],
  );
  const ghostSuggestionKey = ghostSuggestionCandidate
    ? `${premise}\u0000${ghostSuggestionCandidate}`
    : null;
  const ghostSuggestion = ghostSuggestionKey === dismissedGhostKey
    ? null
    : ghostSuggestionCandidate;

  useEffect(() => setExampleIndex(0), [selectedStyle]);
  useEffect(() => setDismissedGhostKey(null), [storyTags]);

  const handleCyclePremise = useCallback(() => {
    setExampleIndex(index => (index + 1) % premiseBank.length);
    setCycleRotation(rotation => rotation + 360);
  }, [premiseBank.length]);

  const addTag = useCallback((tag: string) => {
    if (storyTags.some(existing => normalizeStoryTagIdentity(existing) === normalizeStoryTagIdentity(tag))) return false;
    if (storyTags.length >= TAG_LIMIT) {
      setTagLimitError(TAG_LIMIT_MESSAGE);
      return false;
    }
    setTagLimitError(null);
    updateSeed(updateStoryTags(previous => [...previous, tag]));
    return true;
  }, [storyTags, updateSeed]);

  return (
    <>
      <LibraryTextArea
        id="core-premise-input"
        label="Synopsis"
        icon={Feather}
        required
        maxLength={STORY_PREMISE_MAX_LENGTH}
        value={premise}
        onChange={value => {
          setDismissedGhostKey(null);
          onPremiseChange(value);
        }}
        rows={6}
        placeholder={premiseExample}
        helpText={premise.trim() ? undefined : 'Example shown as ghost text — use the dragon to view another.'}
        rightElement={premise.trim() ? undefined : (
          <button
            type="button"
            onClick={handleCyclePremise}
            aria-label="Show another example synopsis"
            className="story-seed-touch-target inline-flex h-10 w-10 items-center justify-center rounded-full border border-portal/35 bg-portal/10 text-portal transition-all hover:border-portal hover:bg-portal/15 hover:shadow-[0_0_12px_rgba(4,172,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal/70 active:scale-95"
          >
            <span
              className="inline-flex items-center justify-center transition-transform duration-500 ease-out motion-reduce:transition-none motion-reduce:transform-none"
              style={{ transform: `rotate(${cycleRotation}deg)` }}
            >
              <LibraryDragonCycleIcon size={18} />
            </span>
          </button>
        )}
      />
      {beforeTags}

      <AnimatePresence>
        {ghostSuggestion && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.95, y: -2 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -2 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              if (addTag(ghostSuggestion)) setDismissedGhostKey(ghostSuggestionKey);
            }}
            title="Add this suggestion to your Story Tags"
            className="story-seed-touch-target ml-auto mt-2 flex max-w-full items-start gap-1.5 rounded-lg border border-portal/40 bg-[#0b0e1e]/90 px-2.5 py-1 font-mono text-[10px] tracking-wider text-portal shadow-[0_0_12px_rgba(4,172,255,0.15)] transition-all hover:border-portal hover:text-signal"
          >
            <Sparkles size={11} className="mt-0.5 shrink-0 animate-pulse text-portal" />
            <span className="min-w-0 break-words text-left">Add tag: {ghostSuggestion}</span>
          </motion.button>
        )}
      </AnimatePresence>

      <OriginTagEditor
        premise={premise}
        genre={genre}
        storyTags={storyTags}
        selectedStyle={selectedStyle}
        updateSeed={updateSeed}
        addTag={addTag}
        tagLimitError={tagLimitError}
        setTagLimitError={setTagLimitError}
      />
    </>
  );
};

interface OriginTagEditorProps {
  premise: string;
  genre?: string;
  storyTags: string[];
  selectedStyle?: StoryStyle;
  updateSeed: UpdateSeed;
  addTag: (tag: string) => boolean;
  tagLimitError: string | null;
  setTagLimitError: Dispatch<SetStateAction<string | null>>;
}

const OriginTagEditor = memo(({
  premise,
  genre,
  storyTags,
  selectedStyle,
  updateSeed,
  addTag,
  tagLimitError,
  setTagLimitError,
}: OriginTagEditorProps) => {
  const [activeNicheId, setActiveNicheId] = useState(() => nicheIdForGenre(genre));
  const [activeFamilies, setActiveFamilies] = useState<StoryTagCategory[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const [browseOpen, setBrowseOpen] = useState(false);
  const tagSuggestions = useMemo(
    () => recommendStoryTags({ premise, genre, style: selectedStyle }, storyTags),
    [premise, genre, selectedStyle, storyTags],
  );

  // Choosing a genre path opens its niche; a custom genre opens every tag.
  useEffect(() => {
    setActiveNicheId(nicheIdForGenre(genre));
    setActiveFamilies([]);
  }, [genre]);

  const activeNiche = STORY_TAG_NICHES.find(niche => niche.id === activeNicheId);
  const scopeLabel = activeNiche ? activeNiche.label : 'all tags';
  const nicheEntries = useMemo(
    () => activeNiche ? storyTagNicheEntries(activeNiche) : STORY_TAG_CATALOG,
    [activeNiche],
  );
  // A niche lists its own families first, in the order its core tags lead them.
  const familyOrder = useMemo(() => activeNiche
    ? [...new Set(nicheEntries.map(entry => entry.category))]
    : FAMILY_ORDER, [activeNiche, nicheEntries]);
  const familyCounts = useMemo(() => familyOrder
    .map(family => ({ family, count: nicheEntries.filter(entry => entry.category === family).length }))
    .filter(({ count }) => count > 0), [familyOrder, nicheEntries]);
  const normalizedSearch = tagSearch.trim().toLowerCase();
  const isTagSearchActive = normalizedSearch.length > 0;
  const browserEntries = useMemo(() => nicheEntries.filter(entry =>
    (activeFamilies.length === 0 || activeFamilies.includes(entry.category))
    && (!normalizedSearch || matchesTagSearch(entry, normalizedSearch))), [nicheEntries, activeFamilies, normalizedSearch]);
  const browserGroups = useMemo(() => familyOrder
    .map(family => ({ family, entries: browserEntries.filter(entry => entry.category === family) }))
    .filter(group => group.entries.length > 0), [familyOrder, browserEntries]);

  // Keep the chosen niche visible in its scrolling row, even one far along it.
  const nicheRowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!browseOpen) return;
    nicheRowRef.current?.querySelector<HTMLElement>('[aria-checked="true"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [browseOpen, activeNicheId]);

  const chooseNiche = (id: string) => {
    setActiveNicheId(id);
    setActiveFamilies([]);
  };
  const toggleFamily = (family: StoryTagCategory) => setActiveFamilies(current =>
    current.includes(family) ? current.filter(existing => existing !== family) : [...current, family]);

  const selectedTagIdentities = useMemo(
    () => new Set(storyTags.map(normalizeStoryTagIdentity)),
    [storyTags],
  );
  const isSelected = (tag: string) => selectedTagIdentities.has(normalizeStoryTagIdentity(tag));

  const toggleTag = (tag: string) => {
    if (isSelected(tag)) {
      setTagLimitError(null);
      updateSeed(updateStoryTags(previous => previous.filter(existing => normalizeStoryTagIdentity(existing) !== normalizeStoryTagIdentity(tag))));
    } else addTag(tag);
  };

  const addCustomTag = () => {
    const tag = customTagInput.replace(/^\s*,|,\s*$/g, '').trim();
    if (!tag) return;
    if (addTag(tag)) setCustomTagInput('');
  };

  const yourTags = storyTags.length > 0 && (
    <div className="flex flex-wrap gap-1.5" aria-label="Your tags">
      {storyTags.map(tag => {
        const metadata = getTagMetadata(tag);
        return (
          <span key={tag} className="glass-chip animate-fadeIn px-2.5 py-1 font-sans text-xs">
            {metadata && <CategoryColorDot color={metadata.color} />}
            <span className="font-semibold">{tag}</span>
            <button type="button" onClick={() => toggleTag(tag)} aria-label={`Remove tag ${tag}`} className="story-seed-compact-hit-target text-neutral-400 transition-colors hover:text-signal"><X size={12} /></button>
          </span>
        );
      })}
    </div>
  );

  return (
      <section className="glass-panel space-y-3 p-4 sm:p-5" aria-labelledby="origin-tags-title">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p id="origin-tags-title" className="flex items-center gap-2 font-sc text-[11px] font-bold uppercase tracking-widest text-signal"><Tag size={13} className="text-[#CDB271]" aria-hidden="true" />Tags</p>
            <p className="mt-1 font-sans text-xs text-neutral-400">Optional — inferred from your origin if left empty.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2 font-sans text-[11px] text-neutral-400">
            <span title={TAG_RECOMMENDED_COPY}>{storyTags.length} / {TAG_LIMIT}</span>
            {storyTags.length > 0 && <button type="button" onClick={() => updateSeed(updateStoryTags(() => []))} className="story-seed-compact-hit-target font-sc text-[10px] uppercase tracking-widest text-neutral-400 transition-colors hover:text-red-300">Clear all</button>}
          </div>
        </div>

        {yourTags}

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 font-sc text-[10px] font-bold uppercase tracking-widest text-neutral-300"><Wand2 size={12} className="text-[#CDB271]" aria-hidden="true" />Suggested
            <span className="font-sans text-[11px] font-normal normal-case tracking-normal text-neutral-400">· {premise.trim() ? 'from your premise and genre' : 'describe your premise to tune these'}</span>
          </p>
          <div className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-1" id="style-suggested-tags">
            {tagSuggestions.length === 0 && <p className="font-sans text-xs text-neutral-400">Add more premise detail, or browse all tags.</p>}
            {tagSuggestions.map(entry => (
              <CatalogTagChip key={entry.label} entry={entry} selected={isSelected(entry.label)} onToggle={toggleTag} className="shrink-0 whitespace-nowrap" />
            ))}
          </div>
        </div>

        <AnimatePresence>
          {tagLimitError && <motion.p id="tag-limit-error" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="rounded border border-[#8B0000]/30 bg-[#8B0000]/10 px-3 py-2 font-sans text-xs text-red-400">{tagLimitError}</motion.p>}
        </AnimatePresence>

        <button type="button" aria-expanded={browseOpen} aria-controls="origin-tag-browser" onClick={() => setBrowseOpen(open => !open)}
          className="story-seed-touch-target flex w-full items-center justify-between gap-2 border-t border-neutral-800/80 pt-3 font-sc text-[10px] font-bold uppercase tracking-widest text-[#CDB271] transition-colors hover:text-[#E3C878]">
          <span>{browseOpen ? 'Close tag browser' : 'Browse all tags'}<span className="ml-2 font-sans text-[11px] font-normal normal-case tracking-normal text-neutral-400">{browseOpen ? '' : 'by niche, family, search, or your own'}</span></span>
          <ChevronDown size={13} aria-hidden="true" className={browseOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>

        <AnimatePresence initial={false}>
        {browseOpen && (
        <motion.div id="origin-tag-browser" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden">
        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
          <div className="flex-1">
            <LibraryTextBox id="custom-tag-input" size="compact" icon={Tag} value={customTagInput} onChange={setCustomTagInput}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCustomTag(); } }} placeholder="Add a specific tag..." aria-label="Add a custom tag" />
          </div>
          <button type="button" onClick={addCustomTag} className="min-h-[2.75rem] rounded border border-portal/50 bg-portal/10 px-4 py-2 font-sc text-[10px] font-bold uppercase tracking-widest text-portal transition-colors hover:border-portal hover:bg-portal/20">Add tag</button>
        </div>

        <div>
          <p className={workspaceCompactLabelClass}>Niches</p>
          <div ref={nicheRowRef} role="radiogroup" aria-label="Tag niches" id="tag-niches" className="scrollbar-thin mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {NICHE_OPTIONS.map((option, index) => {
              const selected = option.id === activeNicheId;
              const Sigil = GENRE_PATH_SIGILS[option.id];
              return (
                <button key={option.id} type="button" role="radio" aria-checked={selected} tabIndex={radioGroupTabIndex(selected, true, index)}
                  onKeyDown={handleRadioGroupKeyDown} onClick={() => chooseNiche(option.id)} title={option.id === ALL_TAGS ? 'Every tag in every family' : `Tags for ${PRESET_NAMES.get(option.id) ?? option.label} stories`}
                  className={`story-seed-touch-target inline-flex min-h-[2.25rem] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 font-sc text-[10px] font-bold uppercase tracking-[0.14em] transition-all ${selected ? 'border-portal/60 bg-portal/10 text-portal shadow-[0_0_10px_rgba(4,172,255,0.18)]' : 'border-[rgba(150,166,220,0.22)] bg-[#0d1126]/60 text-neutral-300 hover:border-[rgba(150,166,220,0.45)] hover:text-signal'}`}>
                  {Sigil && <Sigil size={12} aria-hidden="true" />}{option.label}
                  <span className="font-sans text-[10px] font-normal tracking-normal text-neutral-400">{option.count}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className={workspaceCompactLabelClass}>Families<span className="ml-2 font-sans text-[11px] font-normal normal-case tracking-normal text-neutral-400">{activeFamilies.length ? `${activeFamilies.length} chosen` : 'all shown'}</span></p>
          <div className="mt-2 flex flex-wrap gap-1.5" id="tag-categories">
            {familyCounts.map(({ family, count }) => {
              const chosen = activeFamilies.includes(family);
              return (
                <button key={family} type="button" aria-pressed={chosen} onClick={() => toggleFamily(family)}
                  className={`story-seed-touch-target inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full border px-3 py-1 font-sc text-[10px] font-bold uppercase tracking-[0.14em] transition-all ${chosen ? 'border-portal/60 bg-portal/10 text-portal shadow-[0_0_10px_rgba(4,172,255,0.18)]' : 'border-[rgba(150,166,220,0.22)] bg-[#0d1126]/60 text-neutral-300 hover:border-[rgba(150,166,220,0.45)] hover:text-signal'}`}>
                  <CategoryColorDot color={CATEGORY_COLORS[family]} />{family}
                  <span className="font-sans text-[10px] font-normal tracking-normal text-neutral-400">{count}</span>
                </button>
              );
            })}
            {activeFamilies.length > 0 && (
              <button type="button" onClick={() => setActiveFamilies([])} className="story-seed-compact-hit-target px-2 font-sc text-[10px] uppercase tracking-widest text-neutral-400 transition-colors hover:text-signal">Show all families</button>
            )}
          </div>
        </div>

        <div>
          <div className="mb-2 w-full sm:max-w-xs">
            <LibraryTextBox id="celestial-tag-search-input" size="compact" icon={SENSearchIcon} value={tagSearch} onChange={setTagSearch} placeholder={activeNiche ? `Search ${activeNiche.label} tags...` : 'Search tags, aliases, families...'} aria-label="Search story tags" />
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-[11px] text-neutral-400">
            <p aria-live="polite">
              {browserEntries.length} {isTagSearchActive ? (browserEntries.length === 1 ? 'match' : 'matches') : (browserEntries.length === 1 ? 'tag' : 'tags')} in {scopeLabel}
            </p>
            {activeNiche && isTagSearchActive && (
              <button type="button" onClick={() => chooseNiche(ALL_TAGS)} className="story-seed-compact-hit-target font-sc text-[10px] font-bold uppercase tracking-widest text-portal transition-colors hover:text-signal">Search all tags</button>
            )}
          </div>
          <div className="glass-panel scrollbar-thin max-h-72 space-y-3 overflow-y-auto p-3" id="filtered-tags-list">
            {browserEntries.length === 0 ? (
              <p className="w-full py-3 text-center font-sans text-xs italic text-neutral-400">
                {isTagSearchActive ? 'No tags, aliases, or families match this search here.' : 'No tags in these families here.'}
              </p>
            ) : isTagSearchActive ? (
              <div className="flex flex-wrap content-start gap-1.5">
                {browserEntries.slice(0, SEARCH_RESULT_LIMIT).map(entry => (
                  <CatalogTagChip key={entry.label} entry={entry} selected={isSelected(entry.label)} onToggle={toggleTag} />
                ))}
                {browserEntries.length > SEARCH_RESULT_LIMIT && (
                  <p className="w-full pt-1 text-center font-sans text-[11px] italic text-neutral-400">
                    +{browserEntries.length - SEARCH_RESULT_LIMIT} more — keep typing to narrow the search.
                  </p>
                )}
              </div>
            ) : browserGroups.map(({ family, entries }) => (
              <div key={family} role="group" aria-label={family}>
                <p className="mb-1.5 flex items-center gap-1.5 font-sc text-[10px] font-bold uppercase tracking-widest text-neutral-300"><CategoryColorDot color={CATEGORY_COLORS[family]} />{family}</p>
                <div className="flex flex-wrap content-start gap-1.5">
                  {entries.map(entry => (
                    <CatalogTagChip key={entry.label} entry={entry} selected={isSelected(entry.label)} onToggle={toggleTag} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="font-sans text-[11px] text-neutral-400">{TAG_RECOMMENDED_COPY}</p>
        </motion.div>
        )}
        </AnimatePresence>
      </section>
  );
});

OriginTagEditor.displayName = 'OriginTagEditor';
