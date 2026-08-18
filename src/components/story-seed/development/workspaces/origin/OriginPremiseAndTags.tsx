import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { ChevronDown, Feather, Search, Sparkles, Tag, Wand2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  STORY_PREMISE_MAX_LENGTH,
  STORY_TAG_LIMIT,
} from '../../../shared/storySeedSchema';
import { getStoryStyleLabel, type StoryStyle } from '../../../shared/storyStyle';
import {
  CATEGORIZED_TAGS,
  CATEGORY_COLORS,
  CURATED_PREMISE_EXAMPLES,
  getTagMetadata,
  STORY_TAG_CATALOG,
  TAG_PRESETS,
  type StoryTagCategory,
  type StoryTagCategoryColor,
  type StoryTagMetadata,
} from '../../constants';
import { updateStoryTags, type UpdateSeed } from '../../seedState';
import { LibraryDragonCycleIcon, LibraryTextArea, LibraryTextBox } from '../../../../library';
import { workspaceCompactLabelClass } from '../WorkspaceShell';

const TAG_LIMIT = STORY_TAG_LIMIT;
const TAG_LIMIT_MESSAGE = `Fated limit reached. Only up to ${TAG_LIMIT} celestial tags can be woven into the universe.`;
const TAG_RECOMMENDED_COPY = 'Recommended: 4–8 tags.';
const SEARCH_RESULT_LIMIT = 24;
const STYLE_SUGGESTION_LIMIT = 10;
const STYLE_SPECIFIC_SHARE = 6;
const ALL_CURATED_PREMISE_EXAMPLES = Object.values(CURATED_PREMISE_EXAMPLES).flat();

const SEMANTIC_TAGS = [
  { keywords: ['system', 'cheat', 'status', 'panel', 'attribute', 'litrpg'], tag: 'game systems' },
  { keywords: ['level', 'progression', 'exp', 'grow', 'ladder', 'rank'], tag: 'level progression' },
  { keywords: ['cultivat', 'meridian', 'dantian', 'qi ', 'immortal', 'spirit root'], tag: 'cultivation realms' },
  { keywords: ['regress', 'return', 'back in time', 'years ago', 'loop', 'timeline'], tag: 'regression/reincarnation' },
  { keywords: ['reincarnat', 'reborn', 'transmigrat', 'isekai', 'another world'], tag: 'reincarnation rules' },
  { keywords: ['academy', 'school', 'sect school', 'dorm', 'class', 'rankings', 'exam'], tag: 'academy cultivation' },
  { keywords: ['sect', 'clan', 'faction', 'disciple', 'elder', 'patriarch'], tag: 'sect politics' },
  { keywords: ['kingdom', 'build', 'territory', 'village', 'town', 'lord', 'ruler'], tag: 'kingdom building' },
  { keywords: ['alchem', 'pill', 'cauldron', 'elixir', 'herb', 'refine'], tag: 'pill refinement' },
  { keywords: ['forge', 'weapon', 'sword', 'artifact', 'hammer', 'craft'], tag: 'weapon forging' },
  { keywords: ['tame', 'beast', 'monster', 'pet', 'animal', 'dragon', 'phoenix'], tag: 'bonded beasts' },
  { keywords: ['tower', 'dungeon', 'floor', 'boss', 'raid', 'climb'], tag: 'dungeon/tower climb' },
  { keywords: ['intrigue', 'noble', 'politics', 'court', 'emperor', 'prince', 'king'], tag: 'political intrigue' },
  { keywords: ['marry', 'marriage', 'romance', 'love', 'wife', 'husband', 'bride', 'groom'], tag: 'arranged marriage' },
  { keywords: ['enemies', 'lovers', 'hate', 'rivals to lovers'], tag: 'enemies to lovers' },
  { keywords: ['death', 'die', 'assassinate', 'doom', 'kill', 'murder'], tag: 'death flags' },
  { keywords: ['curse', 'cursed', 'blessing', 'hex'], tag: 'curse tracking' },
  { keywords: ['fate', 'destiny', 'karma', 'karmic', 'fated'], tag: 'fate bonds' },
  { keywords: ['apocalypse', 'zombie', 'collapse', 'ruin', 'camp', 'survival'], tag: 'apocalypse cultivation' },
  { keywords: ['space', 'star', 'galaxy', 'cosmic', 'void', 'moon', 'stellar'], tag: 'cosmic cultivation' },
  { keywords: ['cozy', 'slice of life', 'slice-of-life', 'slow life', 'peaceful', 'farm'], tag: 'cozy / slice-of-life cultivation' },
  { keywords: ['betray', 'backstab', 'trust', 'allies', 'alliance'], tag: 'betrayal fallout' },
  { keywords: ['rebellion', 'rebel', 'war', 'army', 'battle', 'soldier', 'siege'], tag: 'military strategy' },
  { keywords: ['slow burn', 'slow-burn'], tag: 'slow-burn romance' },
];

const TAG_COLOR_ACCENTS: Record<StoryTagCategoryColor, string> = {
  gray: '#9CA3AF',
  red: '#F87171',
  green: '#34D399',
  purple: '#A78BFA',
  pink: '#F472B6',
  gold: '#D4AF37',
  blue: '#60A5FA',
  teal: '#2DD4BF',
  orange: '#FB923C',
  black: '#000000',
};

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

const CatalogTagChip = ({ entry, selected, onToggle, className = '' }: {
  entry: StoryTagMetadata;
  selected: boolean;
  onToggle: (tag: string) => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={() => onToggle(entry.label)}
    title={entry.category}
    style={selected ? undefined : categoryBorderStyle(entry.color)}
    className={`story-seed-touch-target flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${tagChipClass(selected)} ${className}`}
  >
    <CategoryColorDot color={entry.color} />
    {selected ? '✓' : '+'} {entry.label}
  </button>
);

const searchStoryTagCatalog = (query: string): StoryTagMetadata[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return STORY_TAG_CATALOG.filter(entry =>
    entry.label.toLowerCase().includes(normalized)
    || entry.category.toLowerCase().includes(normalized)
    || entry.aliases.some(alias => alias.toLowerCase().includes(normalized)));
};

const pickVariedTags = (entries: StoryTagMetadata[], limit: number): StoryTagMetadata[] => {
  const buckets = new Map<StoryTagCategory, StoryTagMetadata[]>();
  entries.forEach(entry => {
    const bucket = buckets.get(entry.category);
    if (bucket) bucket.push(entry);
    else buckets.set(entry.category, [entry]);
  });
  const queues = Array.from(buckets.values());
  const picked: StoryTagMetadata[] = [];
  for (let index = 0; picked.length < limit && queues.some(queue => queue.length > 0); index += 1) {
    const next = queues[index % queues.length]?.shift();
    if (next) picked.push(next);
  }
  return picked;
};

const buildStyleSuggestions = (style: StoryStyle | undefined): StoryTagMetadata[] => {
  const general = STORY_TAG_CATALOG.filter(entry => entry.styles.includes('all'));
  if (!style) return pickVariedTags(general, STYLE_SUGGESTION_LIMIT);
  const specific = STORY_TAG_CATALOG.filter(entry => entry.styles.includes(style) && !entry.styles.includes('all'));
  const specificPicks = pickVariedTags(specific, STYLE_SPECIFIC_SHARE);
  const generalPicks = pickVariedTags(general, STYLE_SUGGESTION_LIMIT - specificPicks.length);
  return [...specificPicks, ...generalPicks];
};

const findGhostSuggestion = (premise: string, storyTags: string[]): string | null => {
  if (!premise.trim() || storyTags.length >= TAG_LIMIT) return null;
  const selectedTags = new Set(storyTags.map(tag => tag.toLowerCase()));
  const isSelected = (tag: string) => selectedTags.has(tag.toLowerCase());
  const lastWord = premise.split(/[\s,.;!?]+/).filter(Boolean).pop();
  const prefixMatch = lastWord && lastWord.length >= 2
    ? TAG_PRESETS.find(tag => tag.toLowerCase().startsWith(lastWord.toLowerCase()) && !isSelected(tag))
    : undefined;
  if (prefixMatch) return prefixMatch;
  const lowerPremise = premise.toLowerCase();
  const semanticMatch = SEMANTIC_TAGS.find(({ keywords, tag }) =>
    !isSelected(tag) && keywords.some(keyword => lowerPremise.includes(keyword)))?.tag;
  return semanticMatch && TAG_PRESETS.includes(semanticMatch)
    ? semanticMatch
    : TAG_PRESETS.find(tag => lowerPremise.includes(tag.toLowerCase()) && !isSelected(tag)) ?? null;
};

interface OriginPremiseAndTagsProps {
  premise: string;
  storyTags: string[];
  selectedStyle?: StoryStyle;
  onPremiseChange: (premise: string) => void;
  updateSeed: UpdateSeed;
  genrePicker: ReactNode;
}

export const OriginPremiseAndTags = ({
  premise,
  storyTags,
  selectedStyle,
  onPremiseChange,
  updateSeed,
  genrePicker,
}: OriginPremiseAndTagsProps) => {
  const [dismissedGhostKey, setDismissedGhostKey] = useState<string | null>(null);
  const [tagLimitError, setTagLimitError] = useState<string | null>(null);
  const [exampleIndex, setExampleIndex] = useState(0);
  const premiseBank = selectedStyle
    ? CURATED_PREMISE_EXAMPLES[selectedStyle]
    : ALL_CURATED_PREMISE_EXAMPLES;
  const premiseExample = premiseBank[exampleIndex % premiseBank.length];
  const ghostSuggestionCandidate = useMemo(
    () => findGhostSuggestion(premise, storyTags),
    [premise, storyTags],
  );
  const ghostSuggestionKey = ghostSuggestionCandidate
    ? `${premise}\u0000${ghostSuggestionCandidate}`
    : null;
  const ghostSuggestion = ghostSuggestionKey === dismissedGhostKey
    ? null
    : ghostSuggestionCandidate;

  useEffect(() => setExampleIndex(0), [selectedStyle]);
  useEffect(() => setDismissedGhostKey(null), [storyTags]);

  const addTag = useCallback((tag: string) => {
    if (storyTags.some(existing => existing.toLowerCase() === tag.toLowerCase())) return false;
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
        label="Core Premise / Secret Catalyst"
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
            onClick={() => setExampleIndex(index => (index + 1) % premiseBank.length)}
            aria-label="Show another example premise"
            title="Show another example premise"
            className="story-seed-touch-target inline-flex h-8 w-8 items-center justify-center rounded-full border border-portal/35 bg-portal/10 text-portal transition-all hover:border-portal hover:bg-portal/15 hover:shadow-[0_0_12px_rgba(4,172,255,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal/70 active:scale-90"
          >
            <LibraryDragonCycleIcon size={17} />
          </button>
        )}
      />
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

      {genrePicker}

      <OriginTagEditor
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
  storyTags: string[];
  selectedStyle?: StoryStyle;
  updateSeed: UpdateSeed;
  addTag: (tag: string) => boolean;
  tagLimitError: string | null;
  setTagLimitError: Dispatch<SetStateAction<string | null>>;
}

const OriginTagEditor = memo(({
  storyTags,
  selectedStyle,
  updateSeed,
  addTag,
  tagLimitError,
  setTagLimitError,
}: OriginTagEditorProps) => {
  const [activeTagFamily, setActiveTagFamily] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState('');
  const [tagSearch, setTagSearch] = useState('');
  const styleSuggestions = useMemo(() => buildStyleSuggestions(selectedStyle), [selectedStyle]);
  const tagSearchResults = useMemo(() => searchStoryTagCatalog(tagSearch), [tagSearch]);
  const isTagSearchActive = tagSearch.trim().length > 0;

  const toggleTag = (tag: string) => {
    if (storyTags.includes(tag)) {
      setTagLimitError(null);
      updateSeed(updateStoryTags(previous => previous.filter(existing => existing !== tag)));
    } else addTag(tag);
  };

  const addCustomTag = () => {
    const tag = customTagInput.replace(/^\s*,|,\s*$/g, '').trim();
    if (!tag) return;
    if (addTag(tag)) setCustomTagInput('');
  };

  const familyEntries = useMemo(() => activeTagFamily
    ? Array.from(new Set(CATEGORIZED_TAGS[activeTagFamily] || []))
        .map(tag => getTagMetadata(tag))
        .filter((entry): entry is StoryTagMetadata => Boolean(entry))
    : [], [activeTagFamily]);

  return (
      <section className="glass-panel space-y-4 p-4 sm:p-5" aria-labelledby="origin-tags-title">
        <div>
          <p id="origin-tags-title" className="flex items-center gap-2 font-sc text-[11px] font-bold uppercase tracking-widest text-signal"><Tag size={13} className="text-[#CDB271]" aria-hidden="true" />Story Tags</p>
          <p className="mt-1 font-sans text-xs text-neutral-400">Optional — inferred from your origin if left empty.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <LibraryTextBox id="custom-tag-input" size="compact" icon={Tag} value={customTagInput} onChange={setCustomTagInput}
              onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addCustomTag(); } }} placeholder="Add a specific tag..." aria-label="Add a custom tag" />
          </div>
          <button type="button" onClick={addCustomTag} className="min-h-[2.75rem] rounded border border-portal/50 bg-portal/10 px-4 py-2 font-sc text-[10px] font-bold uppercase tracking-widest text-portal transition-colors hover:border-portal hover:bg-portal/20">Add tag</button>
        </div>

        <AnimatePresence>
          {tagLimitError && <motion.p id="tag-limit-error" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="rounded border border-[#8B0000]/30 bg-[#8B0000]/10 px-3 py-2 font-sans text-xs text-red-400">{tagLimitError}</motion.p>}
        </AnimatePresence>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 font-sc text-[10px] font-bold uppercase tracking-widest text-neutral-300"><Wand2 size={12} className="text-[#CDB271]" aria-hidden="true" />Suggested Tags</p>
            <span className="font-sans text-[11px] text-neutral-400">{selectedStyle ? `Tuned to ${getStoryStyleLabel(selectedStyle)} tradition` : 'Pick a Style above to tune these'}</span>
          </div>
          <div className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-1" id="style-suggested-tags">
            {styleSuggestions.map(entry => (
              <CatalogTagChip key={entry.label} entry={entry} selected={storyTags.includes(entry.label)} onToggle={toggleTag} className="shrink-0 whitespace-nowrap" />
            ))}
          </div>
        </div>

        <div className="border-t border-neutral-800/80 pt-4">
          <div className="mb-3 w-full sm:max-w-xs">
            <LibraryTextBox id="celestial-tag-search-input" size="compact" icon={Search} value={tagSearch} onChange={setTagSearch} placeholder="Search tags, aliases, families..." aria-label="Search story tags" />
          </div>
          {isTagSearchActive ? (
            <>
              <p className="mb-2 font-sans text-[11px] text-neutral-400">
                {tagSearchResults.length} {tagSearchResults.length === 1 ? 'match' : 'matches'} across all families
              </p>
              <div className="glass-panel scrollbar-thin flex max-h-52 flex-wrap content-start gap-1.5 overflow-y-auto p-3" id="filtered-tags-list">
                {tagSearchResults.length === 0 ? (
                  <p className="w-full py-3 text-center font-sans text-xs italic text-neutral-400">No tags, aliases, or families match this search.</p>
                ) : tagSearchResults.slice(0, SEARCH_RESULT_LIMIT).map(entry => (
                  <CatalogTagChip key={entry.label} entry={entry} selected={storyTags.includes(entry.label)} onToggle={toggleTag} />
                ))}
                {tagSearchResults.length > SEARCH_RESULT_LIMIT && (
                  <p className="w-full pt-1 text-center font-sans text-[11px] italic text-neutral-400">
                    +{tagSearchResults.length - SEARCH_RESULT_LIMIT} more — keep typing to narrow the search.
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <p className={workspaceCompactLabelClass}>Tag families</p>
              <div className="mt-2 flex flex-wrap gap-1.5" id="tag-categories">
                {Object.keys(CATEGORIZED_TAGS).map(family => {
                  const isOpen = activeTagFamily === family;
                  return (
                    <button key={family} type="button" aria-expanded={isOpen} aria-controls="origin-family-tags" onClick={() => { setActiveTagFamily(current => current === family ? null : family); setTagSearch(''); }}
                      className={`story-seed-touch-target inline-flex min-h-[2.25rem] items-center gap-1.5 rounded-full border px-3 py-1 font-sc text-[10px] font-bold uppercase tracking-[0.14em] transition-all ${isOpen ? 'border-portal/60 bg-portal/10 text-portal shadow-[0_0_10px_rgba(4,172,255,0.18)]' : 'border-[rgba(150,166,220,0.22)] bg-[#0d1126]/60 text-neutral-300 hover:border-[rgba(150,166,220,0.45)] hover:text-signal'}`}>
                      <CategoryColorDot color={CATEGORY_COLORS[family as StoryTagCategory]} />{family}<ChevronDown size={12} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                    </button>
                  );
                })}
              </div>
              <AnimatePresence initial={false}>
                {activeTagFamily ? (
                  <motion.div id="origin-family-tags" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
                    <div className="glass-panel scrollbar-thin flex max-h-52 flex-wrap content-start gap-1.5 overflow-y-auto p-3" id="filtered-tags-list">
                      {familyEntries.map(entry => (
                        <CatalogTagChip key={entry.label} entry={entry} selected={storyTags.includes(entry.label)} onToggle={toggleTag} />
                      ))}
                    </div>
                  </motion.div>
                ) : <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 font-sans text-xs italic text-neutral-400">Choose a family to reveal its tags.</motion.p>}
              </AnimatePresence>
            </>
          )}
        </div>

        <div className="border-t border-neutral-800/80 pt-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className={workspaceCompactLabelClass}>Your tags ({storyTags.length} / {TAG_LIMIT})</p>
            <span className="font-sans text-[11px] text-neutral-400">{TAG_RECOMMENDED_COPY}</span>
            {storyTags.length > 0 && <button type="button" onClick={() => updateSeed(updateStoryTags(() => []))} className="story-seed-compact-hit-target font-sc text-[10px] uppercase tracking-widest text-neutral-400 transition-colors hover:text-red-300">Clear all</button>}
          </div>
          {storyTags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
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
          ) : <p className="font-sans text-xs italic leading-relaxed text-neutral-400">No manual tags yet. Your origin will provide them when you manifest the blueprint.</p>}
        </div>
      </section>
  );
});

OriginTagEditor.displayName = 'OriginTagEditor';
