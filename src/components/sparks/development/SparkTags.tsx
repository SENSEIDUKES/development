import { useMemo, useState } from 'react';
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
  const suggestions = useMemo(() => recommendStoryTags({ genre }, tags), [genre, tags]);
  const query = search.trim().toLowerCase();
  const entries = query ? STORY_TAG_CATALOG.filter(entry => matchesTagSearch(entry, query)).slice(0, 24) : suggestions;
  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-2" aria-label="Spark Story Tags">
      <NarrativeTextBox id="spark-tag-search" size="compact" value={search} onChange={setSearch}
        aria-label="Search story tags" placeholder="Search tags, aliases, families…" />
      <p className="text-xs text-[var(--spark-muted,#b8b8c2)]">{query ? 'Search results' : 'Suggested for your genre'}</p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {entries.map(entry => <CatalogTagChip key={entry.label} entry={entry}
          selected={tags.some(tag => normalizeStoryTagIdentity(tag) === normalizeStoryTagIdentity(entry.label))}
          onToggle={onToggle} className="dao-spark-control min-h-11 shrink-0 whitespace-nowrap" />)}
        {entries.length === 0 && <p className="text-xs">No matching tags.</p>}
      </div>
    </fieldset>
  );
};
