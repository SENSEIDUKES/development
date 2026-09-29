import { BookOpen, Eye, GitBranch, Sparkles } from 'lucide-react';
import { SEIBadge } from '@seihouse/ui';
import type { WorldCardInfoProps } from '../shared/worldCardContracts';
import { WorldCardCover } from './WorldCardCover';
import { WORLD_ACTIVITY_DISPLAY } from './worldActivityDisplay';
import './world-card.css';

/** Info page: the world's full overview — cover, byline, tags, metrics, synopsis and entry actions. */
export function WorldCardInfo({ story, onRead, onOpenCodex, onOpenTimeline }: WorldCardInfoProps) {
  const activity = story.activityStatus ? WORLD_ACTIVITY_DISPLAY[story.activityStatus] : undefined;
  const hasBranches = story.branchCount !== undefined && Number.isSafeInteger(story.branchCount) && story.branchCount >= 0;
  return <div className="flex flex-col md:flex-row gap-8 bg-[#0a0a0a] border border-neutral-900 rounded-xl p-6 shadow-2xl" data-world-card="info">
    <div className="w-full md:w-auto flex-shrink-0 flex flex-col items-center">
      <div className="w-44 md:w-56 flex-shrink-0 relative">
        <div className="world-card-info-cover mb-2">
          <WorldCardCover src={story.imageUrl} title={story.title} loading="eager" />
        </div>
      </div>
    </div>
    <div className="flex-1 min-w-0 space-y-4">
      <div className="space-y-1">
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-signal leading-tight break-words">{story.title}</h1>
        <p className="font-sans text-xs text-neutral-400">Written by <span className="font-bold">{story.author}</span> · {story.createdAt.split('T')[0]}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Library state">
        <span className="font-sc text-[10px] font-bold uppercase tracking-wider text-neutral-500">Library</span>
        {story.draft
          ? <SEIBadge size="sm" variant="danger">Draft</SEIBadge>
          : story.acquired
            ? <SEIBadge size="sm" variant="accent">Sealed</SEIBadge>
            : <SEIBadge size="sm" variant="neutral">Unacquired</SEIBadge>}
        {story.recentlyRead && <SEIBadge size="sm" variant="info">Recently read</SEIBadge>}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="bg-void border border-neutral-800 text-jade-accent px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono">{story.genre}</span>
        {story.cultivationRate && <span className="bg-void border border-neutral-800 text-neutral-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider font-mono">Cultivation Rate: {story.cultivationRate}</span>}
        {story.tags.map(tag => <span key={tag} className="bg-neutral-900 border border-portal/20 text-portal px-2 py-1 rounded text-[10px] font-medium font-sans">#{tag}</span>)}
      </div>
      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-neutral-800 bg-void p-4 sm:grid-cols-3 lg:grid-cols-5" aria-label="World information">
        {[
          ['Chapters', story.chapterCount], ['Current Arc', story.currentArc],
          ['Views', story.reads.toLocaleString()],
        ].map(([label, value]) => <div key={label} className="min-w-0">
          <dt className="flex items-center gap-1 text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">
            {label === 'Views' && <Eye size={11} aria-hidden="true" />}{label}
          </dt>
          <dd className="font-mono text-signal text-sm mt-1 break-words">{value}</dd>
        </div>)}
        {hasBranches && <div className="min-w-0">
          <dt className="flex items-center gap-1 text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">
            <GitBranch size={11} aria-hidden="true" /> Branches
          </dt>
          <dd className="font-mono text-signal text-sm mt-1">{story.branchCount!.toLocaleString()}</dd>
        </div>}
        {activity && <div className="min-w-0">
          <dt className="text-[10px] text-neutral-500 font-sc uppercase tracking-wider font-bold">Activity</dt>
          <dd className="mt-1 flex items-center gap-2 font-sans text-sm font-semibold text-signal">
            <span className={`h-2 w-2 shrink-0 rounded-full ${activity.color}`} aria-hidden="true" />{activity.label}
          </dd>
        </div>}
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
  </div>;
}
