import { ArrowLeft } from 'lucide-react';
import { WorldCardInfo } from '../../world-card/development/WorldCardInfo';
import type { StoryDetailScreenProps } from '../shared/storyDetailContracts';
import type { CreatorWorld } from '../../creator-space/shared/creatorSpaceContracts';

/** Development extraction of the source detail's static novel overview.
 * Source: Light-Novels/src/components/StoryDetailScreen.tsx @ 4a3dd02.
 * The overview itself is the World Card info page; this screen adds the way back.
 * Account tools, generation, history and persistence are outside this capture.
 */
export function StoryDetailScreen({ story, onBack, backLabel = 'Back to novels', onRead, onOpenCodex, onOpenTimeline, readingPosition, children }: Omit<StoryDetailScreenProps, 'story'> & { story: StoryDetailScreenProps['story'] | CreatorWorld }) {
  return <div className="max-w-5xl mx-auto space-y-3 sm:space-y-5" data-story-detail>
    <div className="flex items-center justify-between gap-3">
      <button type="button" onClick={onBack} className="-ml-2 inline-flex min-h-11 items-center gap-3 rounded-lg px-2 font-serif text-base text-neutral-100 hover:text-white focus-visible:outline-2 focus-visible:outline-portal sm:text-lg">
        <ArrowLeft size={24} className="text-[#d4af37]" aria-hidden="true" /> {backLabel}
      </button>
      <p className="flex shrink-0 items-center gap-2 font-sc text-[0.7rem] font-bold uppercase tracking-[0.3em] text-[#d4af37] sm:text-xs" aria-hidden="true">
        World Info
        <span className="flex items-center"><span className="h-1.5 w-1.5 rotate-45 border border-[#d4af37]" /><span className="h-px w-8 bg-[#d4af37]/80 sm:w-12" /></span>
      </p>
    </div>
    <WorldCardInfo story={story} onRead={onRead} onOpenCodex={onOpenCodex} onOpenTimeline={onOpenTimeline} readingPosition={readingPosition} />
    {children}
  </div>;
}
