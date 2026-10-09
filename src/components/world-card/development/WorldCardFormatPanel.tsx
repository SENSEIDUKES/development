import { BadgeCheck, ExternalLink, Info } from 'lucide-react';
import { SEIDialog, SEIDialogContent, SEIDialogDescription, SEIDialogTitle, SEIDialogTrigger } from '@seihouse/ui';
import type { StoryDetailDisplay } from '../../light-novels-home/shared/storyDetailContracts';
import { WorldCardFormatSymbol } from './WorldCardFormatSymbol';

/**
 * The format mark on World Info's cover: who made the world and how it is
 * verified, with a link to its provenance records when the host has them.
 * (On Full and Compact cards the same mark opens the story panel instead.)
 */
export function WorldCardFormatPanel({ world, triggerClassName }: {
  world: Pick<StoryDetailDisplay, 'title' | 'format' | 'senVerified' | 'creatorName' | 'author' | 'createdAt' | 'provenanceUrl'>;
  triggerClassName: string;
}) {
  const format = world.format?.trim();
  const creator = world.creatorName?.trim() || world.author?.trim();
  const created = world.createdAt ? new Date(world.createdAt) : undefined;
  const createdLabel = created && !Number.isNaN(created.getTime())
    ? created.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : undefined;
  return <SEIDialog>
    <SEIDialogTrigger className={triggerClassName} aria-label={`Verification and provenance for ${world.title}${format ? `, ${format}` : ''}`}>
      {format ? <WorldCardFormatSymbol format={format} /> : <Info size={17} aria-hidden="true" />}
    </SEIDialogTrigger>
    <SEIDialogContent variant="dark" aria-modal="true" className="world-card-story-panel world-card-information-panel"
      backdropClassName="world-card-story-backdrop" bodyClassName="world-card-story-panel-body">
      <SEIDialogTitle className="world-card-information-title">Verification</SEIDialogTitle>
      <SEIDialogDescription className="sr-only">Who made {world.title}, how it is verified and where its records are</SEIDialogDescription>
      <dl>
        {format && <div className="world-card-information-fact"><dt>Format</dt><dd>{format}</dd></div>}
        {creator && <div className="world-card-information-fact"><dt>Creator</dt><dd>{creator}</dd></div>}
        {createdLabel && <div className="world-card-information-fact"><dt>Began</dt><dd>{createdLabel}</dd></div>}
        {world.senVerified !== undefined && <div className="world-card-information-fact" data-testid="world-format-verification"><dt>SEN verification</dt>
          <dd>{world.senVerified
            ? <span className="world-card-information-verified"><BadgeCheck aria-hidden="true" />SEN Verified</span>
            : 'Not verified yet'}</dd></div>}
      </dl>
      {world.provenanceUrl
        ? <a className="world-card-information-link" href={world.provenanceUrl} target="_blank" rel="noreferrer" data-testid="world-format-provenance">
            Provenance records<ExternalLink aria-hidden="true" />
          </a>
        : <p className="world-card-information-note">Provenance records will be linked here once this world has them.</p>}
    </SEIDialogContent>
  </SEIDialog>;
}
