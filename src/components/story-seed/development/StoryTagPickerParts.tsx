import type { CSSProperties } from 'react';
import { getStoryTagNiches } from '../shared/storyTagNiches';
import { STORY_TAG_COLOR_ACCENTS, type StoryTagCategoryColor, type StoryTagMetadata } from '../shared/storyTagCatalog';

const TAG_COLOR_ACCENTS = STORY_TAG_COLOR_ACCENTS;

export const CategoryColorDot = ({ color }: { color: StoryTagCategoryColor }) => (
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

export const CatalogTagChip = ({ entry, selected, onToggle, className = '' }: {
  entry: StoryTagMetadata;
  selected: boolean;
  onToggle: (tag: string) => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={() => onToggle(entry.label)}
    aria-pressed={selected}
    title={tagChipTitle(entry)}
    style={selected ? undefined : categoryBorderStyle(entry.color)}
    className={`story-seed-touch-target flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-all ${tagChipClass(selected)} ${className}`}
  >
    <CategoryColorDot color={entry.color} />
    {selected ? '✓' : '+'} {entry.label}
  </button>
);

export const matchesTagSearch = (entry: StoryTagMetadata, query: string) =>
  entry.label.toLowerCase().includes(query)
  || entry.category.toLowerCase().includes(query)
  || entry.aliases.some(alias => alias.toLowerCase().includes(query));

