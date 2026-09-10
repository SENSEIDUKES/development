import { useId } from 'react';
import { BookOpen, Gamepad2, PanelsTopLeft, ArrowRight } from 'lucide-react';
import { LibraryCard, LibraryCardMedia, LibraryCardTitle } from '@seihouse/library-ui';
import type { HomeWorld } from '../shared/homeContracts';
import './world-expressions.css';

/** Display props for this visual trial only; no stored world or expression model. */
export interface WorldExpansionPreview {
  medium: 'manga' | 'game';
  title: string;
  description: string;
  imageUrl: string;
}

const expansionIcons = { manga: PanelsTopLeft, game: Gamepad2 };

export function ExpansionSeals({ expansions }: { expansions: readonly WorldExpansionPreview[] }) {
  if (!expansions.length) return null;
  return <span className="world-expansion-seals">
    {expansions.map(({ medium }) => {
      const Icon = expansionIcons[medium];
      const label = medium === 'manga' ? 'Manga' : 'Game';
      return <span key={medium} className="world-expansion-seal" title={`${label} expansion available · mock preview`}>
        <Icon size={12} aria-hidden="true" />
        <span>{label}<span className="sr-only"> expansion available (mock preview)</span></span>
      </span>;
    })}
  </span>;
}

export function WorldExpressions({ world, expansions }: { world: HomeWorld; expansions: readonly WorldExpansionPreview[] }) {
  const id = useId();
  if (!expansions.length) return null;
  return <section className="world-expressions" aria-labelledby={`${id}-title`}>
    <div className="space-y-2">
      <p className="font-sc text-xs uppercase tracking-widest text-portal">One world · shared origins</p>
      <h2 id={`${id}-title`} className="font-display text-2xl font-bold text-signal">Explore This World</h2>
      <p className="max-w-2xl font-sans text-sm leading-relaxed text-neutral-400">
        It begins with <strong className="text-neutral-200">{world.title}</strong>, the original novel.
        {' '}The manga adapts its story; the game explores the same world.
      </p>
      <p className="font-sans text-xs text-neutral-400">Manga and game are concept previews.</p>
    </div>
    <p id={`${id}-hint`} className="world-expressions-hint">
      Scroll to explore all expressions <ArrowRight size={14} aria-hidden="true" />
    </p>
    <div className="world-expressions-lane" role="region" tabIndex={0}
      aria-label={`Expressions of ${world.title}`} aria-describedby={`${id}-hint`}>
      <ul className="world-expressions-list">
        <li>
          <LibraryCard padding="none" className="world-expression-card world-expression-original" contentClassName="h-full gap-0">
            <LibraryCardMedia className="world-expression-art">
              <img src={world.imageUrl} alt="" loading="lazy" />
              <span className="world-expression-label"><BookOpen size={14} aria-hidden="true" /> Novel</span>
            </LibraryCardMedia>
            <div className="world-expression-body">
              <p className="world-expression-origin text-jade-accent">Original · the story begins here</p>
              <LibraryCardTitle as="h3">{world.title}</LibraryCardTitle>
              <p className="world-expression-description">The original story of {world.mcName}. The source of the characters, places, and lore in every expansion.</p>
              <span className="world-expression-current"><BookOpen size={14} aria-hidden="true" /> You’re viewing this novel</span>
            </div>
          </LibraryCard>
        </li>
        {expansions.map(expansion => {
          const Icon = expansionIcons[expansion.medium];
          const label = expansion.medium === 'manga' ? 'Manga' : 'Game';
          return <li key={expansion.medium}>
            <LibraryCard padding="none" className="world-expression-card" contentClassName="h-full gap-0">
              <LibraryCardMedia className={`world-expression-art world-expression-art-${expansion.medium}`}>
                <img src={expansion.imageUrl} alt="" loading="lazy" />
                <span className="world-expression-label"><Icon size={14} aria-hidden="true" /> {label}</span>
              </LibraryCardMedia>
              <div className="world-expression-body">
                <p className="world-expression-origin">{expansion.medium === 'manga' ? 'Adapted from' : 'Set in the world of'} {world.title}</p>
                <LibraryCardTitle as="h3">{expansion.title}</LibraryCardTitle>
                <p className="world-expression-description">{expansion.description}</p>
                <button type="button" disabled className="world-expression-placeholder">{label} · Preview only</button>
              </div>
            </LibraryCard>
          </li>;
        })}
      </ul>
    </div>
  </section>;
}
