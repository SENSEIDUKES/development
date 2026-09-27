import { ArrowLeft } from 'lucide-react';
import { WorldCardInfo } from '../../world-card/development/WorldCardInfo';
import type { StoryDetailScreenProps } from '../shared/storyDetailContracts';

/** Development extraction of the source detail's static novel overview.
 * Source: Light-Novels/src/components/StoryDetailScreen.tsx @ 4a3dd02.
 * The overview itself is the World Card info page; this screen adds the way back.
 * Account tools, generation, history and persistence are outside this capture.
 */
export function StoryDetailScreen({ story, onBack, onRead, onOpenCodex, onOpenTimeline, children }: StoryDetailScreenProps) {
  return <div className="max-w-5xl mx-auto space-y-8" data-story-detail>
    <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded px-2 font-sans text-sm text-neutral-300 hover:text-signal focus-visible:outline-2 focus-visible:outline-portal">
      <ArrowLeft size={16} aria-hidden="true" /> Back to novels
    </button>
    <WorldCardInfo story={story} onRead={onRead} onOpenCodex={onOpenCodex} onOpenTimeline={onOpenTimeline} />
    {children}
  </div>;
}
