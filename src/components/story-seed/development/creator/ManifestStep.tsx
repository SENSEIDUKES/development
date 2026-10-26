import { Check, ChevronRight, Sparkle } from 'lucide-react';
import { type StorySeedInput } from '@seihouse/sen/story-seed';
import { LibraryManifestingIcon as SENManifestingIcon } from '@seihouse/library-ui';
import { NarrativeButton as LibraryButton } from '@seihouse/sen/presentation';
import { REQUIRED_STORY_SECTIONS } from '../seedSections';
import { StorySeedLiveCard } from './StorySeedLiveCard';

/**
 * The creator's confirm screen (shown as Create): the story as it stands,
 * what Create still needs, and what happens to the blanks. The Create action
 * itself is the pinned footer's, so this screen holds no second button for it.
 */
export function ManifestStep({ seed, hasBlueprint, onGoToOrigin, onOpenBlueprint }: {
  seed: StorySeedInput;
  hasBlueprint: boolean;
  onGoToOrigin: () => void;
  onOpenBlueprint: () => void;
}) {
  return (
    <section aria-labelledby="seed-workspace-manifest-title" className="seed-field-scope seed-manifest-step">
      <p className="font-sc text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-400">
        <span className="text-[#CDB271]/90">Story Seed</span>
        <span className="mx-2 text-neutral-700">/</span>
        <span>Create</span>
      </p>
      <h2 id="seed-workspace-manifest-title"
        className="mt-2.5 flex items-center gap-3 font-display text-xl font-bold uppercase tracking-[0.14em] text-[#F3EDE0] sm:text-3xl">
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(205,178,113,0.38)] bg-[radial-gradient(circle_at_32%_28%,rgba(205,178,113,0.14),rgba(11,14,30,0.55)_68%)] text-[#CDB271] sm:h-11 sm:w-11">
          <SENManifestingIcon size={19} />
        </span>
        Create
      </h2>
      <p className="mt-2 max-w-xl font-serif text-sm leading-relaxed text-[#B0A99B] sm:text-[15px]">
        Review your story as it stands, then create its World Blueprint.
      </p>

      <div className="mt-5 space-y-5">
        <StorySeedLiveCard seed={seed} variant="full" />

        <div className="glass-panel p-4 sm:p-5" data-testid="seed-manifest-required">
          <h3 className="font-sc text-[11px] font-bold uppercase tracking-widest text-neutral-300">Required</h3>
          <ul className="mt-3 space-y-2">
            {REQUIRED_STORY_SECTIONS.map(input => {
              const filled = input.isFilled(seed);
              return (
                <li key={input.id} className="flex min-h-11 items-center gap-3">
                  {filled
                    ? <Check size={14} className="shrink-0 text-portal" role="img" aria-label="complete" />
                    : <span className="h-2 w-2 shrink-0 rounded-full border border-human/70 bg-human/10" role="img" aria-label="missing" />}
                  <span className={`flex-1 font-sans text-sm ${filled ? 'text-neutral-300' : 'text-signal'}`}>{input.label}</span>
                  {!filled && (
                    <LibraryButton variant="ghost" size="sm" iconRight={<ChevronRight size={14} aria-hidden="true" />}
                      onClick={onGoToOrigin} aria-label={`Add ${input.label} in Origin`}>
                      Origin
                    </LibraryButton>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="flex gap-2 font-sans text-[12px] leading-relaxed text-neutral-400">
          <Sparkle size={12} aria-hidden="true" className="mt-0.5 shrink-0 text-[#CDB271]/70" />
          <span>
            Fate Will Decide every field you leave empty. Your World Blueprint is ready
            for review before the story begins.
          </span>
        </p>

        {hasBlueprint && (
          <LibraryButton variant="secondary" size="sm" onClick={onOpenBlueprint} data-testid="seed-manifest-open-blueprint">
            Open World Blueprint
          </LibraryButton>
        )}
      </div>
    </section>
  );
}
