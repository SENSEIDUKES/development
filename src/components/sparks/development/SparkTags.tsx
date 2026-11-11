import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CatalogTagChip, matchesTagSearch } from '../../story-seed/development/StoryTagPickerParts';
import { STORY_TAG_CATALOG, normalizeStoryTagIdentity } from '../../story-seed/shared/storyTagCatalog';
import { recommendStoryTags } from '../../story-seed/shared/storyTagInference';
import { NarrativeTextBox } from '@seihouse/sen/presentation';

/** A compact catalog view using Origin's chips, search and recommendations. */
export const SparkTags = ({ genre, tags, onToggle, disabled }: {
  genre?: string;
  tags: string[];
  onToggle: (tag: string) => void;
  disabled: boolean;
}) => {
  const [search, setSearch] = useState('');
  const row = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => recommendStoryTags({ genre }, tags), [genre, tags]);
  const query = search.trim().toLowerCase();
  const entries = query ? STORY_TAG_CATALOG.filter(entry => matchesTagSearch(entry, query))
    .sort((first, second) => Number(second.label === query) - Number(first.label === query)).slice(0, 24) : suggestions;
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-2" aria-label="Spark Story Tags">
      <NarrativeTextBox id="spark-tag-search" size="compact" value={search} onChange={setSearch}
        aria-label="Search story tags" placeholder="Search tags, aliases, families…" />
      <p className="text-xs text-[var(--spark-muted,#b8b8c2)]">{query ? 'Search results' : 'Suggested for your genre'}</p>
      <div className="flex min-w-0 items-center gap-1">
        <button type="button" aria-label="Previous tags" disabled={entries.length === 0} onClick={() => row.current?.scrollBy({ left: -220, behavior: 'smooth' })}
          className="dao-spark-control grid h-11 w-11 shrink-0 place-items-center rounded-lg border"><ChevronLeft size={16} aria-hidden="true" /></button>
        <div ref={row} className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1"
          onKeyDown={event => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            const buttons = Array.from(event.currentTarget.querySelectorAll('button'));
            const index = buttons.indexOf(event.target as HTMLButtonElement);
            if (index < 0) return;
            event.preventDefault();
            const next = buttons[(index + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
            next?.focus();
            next?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
          }}>
        {entries.map(entry => <CatalogTagChip key={entry.label} entry={entry}
          selected={tags.some(tag => normalizeStoryTagIdentity(tag) === normalizeStoryTagIdentity(entry.label))}
          onToggle={onToggle} className="dao-spark-control min-h-11 shrink-0 whitespace-nowrap" />)}
        {entries.length === 0 && <p className="text-xs">No matching tags.</p>}
        </div>
        <button type="button" aria-label="Next tags" disabled={entries.length === 0} onClick={() => row.current?.scrollBy({ left: 220, behavior: 'smooth' })}
          className="dao-spark-control grid h-11 w-11 shrink-0 place-items-center rounded-lg border"><ChevronRight size={16} aria-hidden="true" /></button>
      </div>
    </fieldset>
  );
};
