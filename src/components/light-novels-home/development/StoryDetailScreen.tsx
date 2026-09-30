import { ArrowLeft } from 'lucide-react';
import { LibraryButton } from '@seihouse/library-ui';
import { WorldCardInfo } from '../../world-card/development/WorldCardInfo';
import type { StoryDetailScreenProps } from '../shared/storyDetailContracts';
import type { CreatorWorld } from '../../creator-space/shared/creatorSpaceContracts';

/** Development extraction of the source detail's static novel overview.
 * Source: Light-Novels/src/components/StoryDetailScreen.tsx @ 4a3dd02.
 * The overview itself is the World Card info page; this screen adds the way back.
 * Account tools, generation, history and persistence are outside this capture.
 */
export function StoryDetailScreen({ story, onBack, backLabel = 'Back to novels', onRead, onOpenCodex, readingPosition, children }: Omit<StoryDetailScreenProps, 'story' | 'onOpenTimeline'> & { story: StoryDetailScreenProps['story'] | CreatorWorld }) {
  return <div className="max-w-5xl mx-auto space-y-1 sm:space-y-5" data-story-detail>
    <div className="flex items-center justify-between gap-3">
      {/* The Library's standard back control, as in the workspace header and Profile. */}
      <LibraryButton variant="ghost" size="icon" icon={ArrowLeft} aria-label={backLabel} onClick={onBack} className="shrink-0" />
      <p className="flex min-w-0 items-center gap-2 font-sc text-[0.625rem] font-bold uppercase tracking-[0.25em] whitespace-nowrap text-[#d4af37] sm:text-xs sm:tracking-[0.3em]" aria-hidden="true">
        World Info
        <span className="hidden items-center min-[360px]:flex"><span className="h-1.5 w-1.5 rotate-45 border border-[#d4af37]" /><span className="h-px w-6 bg-[#d4af37]/80 sm:w-12" /></span>
      </p>
    </div>
    <WorldCardInfo story={story} onRead={onRead} onOpenCodex={onOpenCodex} readingPosition={readingPosition} />
    {children}
  </div>;
}
