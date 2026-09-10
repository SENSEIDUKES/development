import { ArrowLeft, BookOpen, GitBranch, Sparkles } from 'lucide-react';
import type { StoryDetailScreenProps } from '../shared/storyDetailContracts';

/** Development extraction of the source detail's static novel overview.
 * Source: Light-Novels/src/components/StoryDetailScreen.tsx @ 4a3dd02.
 * Account tools, generation, history and persistence are outside this capture.
 */
export function StoryDetailScreen({ story, onBack, onRead, onOpenCodex, onOpenTimeline, children }: StoryDetailScreenProps) {
  return <div className="max-w-5xl mx-auto space-y-8" data-story-detail>
    <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded px-2 font-sans text-sm text-neutral-300 hover:text-signal focus-visible:outline-2 focus-visible:outline-portal">
      <ArrowLeft size={16} aria-hidden="true" /> Back to novels
    </button>
    <div className="flex flex-col md:flex-row gap-8 bg-[#0a0a0a] border border-neutral-900 rounded-xl p-6 shadow-2xl">
      <div className="w-full md:w-auto flex-shrink-0 flex flex-col items-center">
        <div className="w-44 md:w-56 flex-shrink-0 relative">
          <div className="relative aspect-[2/3] rounded-lg overflow-hidden border border-neutral-800 mb-2">
            <img src={story.imageUrl} alt={story.title} className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-4">
        <div className="space-y-1">
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-signal leading-tight break-words">{story.title}</h1>
          <p className="font-sans text-xs text-neutral-400">Written by <span className="font-bold">{story.author}</span> · {story.createdAt.split('T')[0]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="bg-void border border-neutral-800 text-jade-accent px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono">{story.genre}</span>
          <span className="bg-void border border-neutral-800 text-neutral-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono">Cultivation Rate: Heaven</span>
          {story.tags.map(tag => <span key={tag} className="bg-neutral-900 border border-portal/20 text-portal px-2 py-1 rounded text-[10px] font-medium font-sans">#{tag}</span>)}
        </div>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-void border border-neutral-800 rounded-lg">
          {[
            ['Chapters', story.chapterCount], ['Current Arc', story.currentArc],
            ['Realm', story.powerStage], ['Status', story.status],
          ].map(([label, value]) => <div key={label} className="min-w-0">
            <dt className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">{label}</dt>
            <dd className="font-mono text-signal text-sm mt-1 break-words">{value}</dd>
          </div>)}
        </dl>
        <div className="pt-2">
          <h2 className="font-sc font-bold text-neutral-300 text-xs uppercase tracking-widest mb-2 border-b border-neutral-800 pb-1">Synopsis</h2>
          <p className="font-serif text-sm text-neutral-400 leading-relaxed italic">“{story.synopsis}”</p>
        </div>
        <div className="pt-6 flex flex-wrap gap-3 items-center">
          <button type="button" disabled={!onRead} onClick={onRead} className="min-h-11 w-full sm:w-auto px-6 py-2.5 bg-signal text-void font-sc font-bold uppercase tracking-widest rounded-full flex items-center justify-center gap-2 text-xs disabled:opacity-60">
            <BookOpen size={14} aria-hidden="true" /> Start Reading
          </button>
          <button type="button" disabled={!onOpenCodex} onClick={onOpenCodex} className="min-h-11 w-full sm:w-auto px-6 py-2.5 bg-void border border-portal text-portal font-sc font-bold uppercase tracking-widest rounded-full flex items-center justify-center gap-2 text-xs disabled:opacity-60">
            <Sparkles size={14} aria-hidden="true" /> Open Codex
          </button>
          <button type="button" disabled={!onOpenTimeline} onClick={onOpenTimeline} className="min-h-11 w-full sm:w-auto px-6 py-2.5 bg-void border border-jade-accent text-jade-accent font-sc font-bold uppercase tracking-widest rounded-full flex items-center justify-center gap-2 text-xs disabled:opacity-60">
            <GitBranch size={14} aria-hidden="true" /> Fate Timeline
          </button>
        </div>
        {!onRead && <p className="font-sans text-xs text-neutral-400">Mock novel · reading and story tools are unavailable in this preview.</p>}
      </div>
    </div>
    {children}
  </div>;
}
