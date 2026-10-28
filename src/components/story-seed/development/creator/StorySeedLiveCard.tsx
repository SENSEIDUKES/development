import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { ARC_LENGTH } from '@seihouse/sen/arc-goals';
import { getStoryStyleLabel, type StorySeedInput } from '@seihouse/sen/story-seed';
import { REQUIRED_STORY_SECTIONS, missingRequiredSections } from '../seedSections';
import { useCompactHeader } from '../../../library-shell/development/workspaceMedia';
import { FateDecides } from '../FateDecides';

const Row = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="seed-live-card-row">
    <dt>{label}</dt>
    <dd>{children}</dd>
  </div>
);

/**
 * The character creator's live preview: the story taking shape as the author
 * fills the Seed. It only reads the seed. On a phone it rests as one line that
 * opens (a tablet too); beside the step on a wide screen it is always open,
 * and on the Manifest step it is shown whole (`variant="full"`).
 */
export function StorySeedLiveCard({ seed, variant = 'summary' }: {
  seed: StorySeedInput;
  variant?: 'summary' | 'full';
}) {
  const [open, setOpen] = useState(false);
  // Beside the step on a wide screen, and on the Manifest step, it is always open.
  const alwaysOpen = variant === 'full' || !useCompactHeader();
  const expanded = alwaysOpen || open;
  const Head = alwaysOpen ? 'div' : 'button';
  const bodyId = useId();
  const required = seed.story.required;
  const title = seed.world.optional.worldIdentity.title?.trim();
  const style = getStoryStyleLabel(required.style);
  const genre = required.genre.trim();
  const premise = required.premise.trim();
  const tags = Array.from(new Set(required.storyTags.map(tag => tag.trim()).filter(Boolean)));
  const arcCount = seed.story.optional.arcCount;
  const ending = seed.world.optional.worldFoundations.destinedEnding?.trim();
  const complete = REQUIRED_STORY_SECTIONS.length - missingRequiredSections(seed).length;
  // One text per part, so the tradition and genre each show in the reader's language.
  const lineage = [style, genre].filter(Boolean).map((part, index) => <span key={part}>{index > 0 && ' · '}{part}</span>);

  return (
    <aside className="seed-live-card" data-variant={variant} data-open={expanded}
      aria-label="Story preview" data-seed-live-card>
      {/* Only a card that folds is a button; an always-open card is its heading row. */}
      <Head {...(alwaysOpen ? {} : {
        type: 'button' as const, 'aria-expanded': open, 'aria-controls': bodyId, onClick: () => setOpen(value => !value),
      })} className="seed-live-card-head" data-static={alwaysOpen}>
        <span className="seed-live-card-titles">
          <span className="seed-live-card-eyebrow">Your story</span>
          <span className="seed-live-card-title">{title || 'Untitled'}</span>
          <span className="seed-live-card-lineage">{lineage.length > 0 ? lineage : 'Tradition and genre not chosen'}</span>
        </span>
        <span className="seed-live-card-progress" aria-label={`${complete} of ${REQUIRED_STORY_SECTIONS.length} required inputs`}>
          {complete}/{REQUIRED_STORY_SECTIONS.length}
        </span>
        <ChevronDown size={16} aria-hidden="true" className="seed-live-card-chevron" />
      </Head>
      <dl id={bodyId} className="seed-live-card-body">
        <Row label="Synopsis">{premise ? <span className="seed-live-card-premise">{premise}</span> : <span className="seed-live-card-missing">Required</span>}</Row>
        <Row label="Tags">
          {tags.length ? <span className="seed-live-card-tags">{tags.map(tag => <span key={tag}>{tag}</span>)}</span> : <FateDecides />}
        </Row>
        <Row label="Length">
          {typeof arcCount === 'number' && Number.isFinite(arcCount)
            ? `${arcCount} ${arcCount === 1 ? 'arc' : 'arcs'} · ${(arcCount * ARC_LENGTH).toLocaleString('en-US')} chapters`
            : <FateDecides />}
        </Row>
        <Row label="Destined Ending">{ending ? <span className="seed-live-card-premise">{ending}</span> : <FateDecides />}</Row>
      </dl>
    </aside>
  );
}
