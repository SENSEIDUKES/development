import { useMemo, useState } from 'react';
import { ArrowLeft, Copy, Lock } from 'lucide-react';
import { LibraryButton } from '@seihouse/library-ui';
import { findFoundationRevision, findStory } from '@seihouse/sen/harness-generation';
import type { StorySeedInput, WorldBlueprint } from '@seihouse/sen/story-seed';
import { NovelBlueprintEditor, type NovelBlueprintSnapshot } from '../../components/story-seed/development/NovelBlueprintEditor';
import { foundationFromNovelBlueprint } from '../story-seed/novelBlueprintFoundation';
import type { LibraryStories } from './useLibraryStories';

/**
 * Who is looking at a world's Blueprint. The host decides: the creator edits
 * it while the novel is private; anyone else views it, and copies it only when
 * the creator allows.
 */
export type StoryBlueprintAccess =
  | { view: 'creator' }
  | { view: 'reader'; creatorName?: string; copy: boolean };

export interface StoryBlueprintViewProps {
  title: string;
  /** The novel's saved Seed and Blueprint; absent for a novel begun from a premise. */
  snapshot?: NovelBlueprintSnapshot;
  destinedEnding?: string;
  access: StoryBlueprintAccess;
  /** False once the novel is shared or public: its creator then views it too. */
  isPrivate: boolean;
  busy?: boolean;
  onBack: () => void;
  backLabel?: string;
  /** Saves the creator's edit as the novel's next Foundation revision. */
  onSave?: (next: NovelBlueprintSnapshot) => Promise<void>;
  /** Keeps a copy of the Seed and Blueprint as the reader's own Story Seed. */
  onCopy?: (snapshot: NovelBlueprintSnapshot) => Promise<void>;
}

/**
 * A world's Blueprint page, opened from World Info's Blueprint button. It is
 * the novel's own saved World Blueprint in the Blueprint editor: editable by
 * its creator while the novel is private, view-only otherwise, with Copy when
 * a reader may keep their own.
 */
export function StoryBlueprintView({ title, snapshot, destinedEnding, access, isPrivate, busy, onBack, backLabel = 'Back to World Info', onSave, onCopy }: StoryBlueprintViewProps) {
  const editable = access.view === 'creator' && isPrivate && Boolean(onSave);
  const canCopy = access.view === 'reader' && access.copy && Boolean(onCopy);
  const [copying, setCopying] = useState(false);
  const [copyState, setCopyState] = useState<{ ok: boolean; message: string }>();

  const copy = async () => {
    if (!snapshot || !onCopy) return;
    setCopying(true);
    setCopyState(undefined);
    try {
      await onCopy(snapshot);
      setCopyState({ ok: true, message: 'Copied. It is waiting in Create as your own Story Seed.' });
    } catch (error) {
      setCopyState({ ok: false, message: error instanceof Error ? error.message : 'The Blueprint could not be copied.' });
    } finally {
      setCopying(false);
    }
  };

  const note = access.view === 'creator'
    ? isPrivate
      ? 'Your novel is private, so you can edit its Blueprint. Future chapters follow your changes.'
      : 'Your novel is no longer private, so its Blueprint is view-only.'
    : `${access.creatorName ? `${access.creatorName}’s` : 'The creator’s'} Blueprint. ${access.copy
      ? 'You may copy it and start your own story from it.'
      : 'The creator has not allowed copying.'}`;

  return <div className="mx-auto max-w-5xl space-y-5" data-story-blueprint data-blueprint-view={access.view}
    data-blueprint-editable={editable ? 'true' : 'false'}>
    <div className="flex items-center justify-between gap-3">
      <LibraryButton variant="ghost" size="icon" icon={ArrowLeft} aria-label={backLabel} onClick={onBack} className="shrink-0" />
      <p className="flex min-w-0 items-center gap-2 font-sc text-[0.625rem] font-bold uppercase tracking-[0.25em] whitespace-nowrap text-[#d4af37] sm:text-xs sm:tracking-[0.3em]" aria-hidden="true">
        Blueprint
        <span className="hidden items-center min-[360px]:flex"><span className="h-1.5 w-1.5 rotate-45 border border-[#d4af37]" /><span className="h-px w-6 bg-[#d4af37]/80 sm:w-12" /></span>
      </p>
    </div>
    <header className="space-y-2">
      <h1 className="font-display text-2xl text-white sm:text-3xl">{title}</h1>
      <div className="flex flex-wrap items-center gap-3">
        <p className="flex min-w-0 flex-1 items-center gap-2 text-sm text-neutral-300" data-testid="story-blueprint-access">
          {!editable && <Lock size={14} aria-hidden="true" className="shrink-0 text-neutral-400" />}
          <span>{note}</span>
        </p>
        {canCopy && snapshot && <LibraryButton variant="secondary" size="md" icon={Copy} disabled={copying || copyState?.ok}
          loading={copying} onClick={() => void copy()}>
          {copyState?.ok ? 'Copied' : 'Copy Blueprint'}
        </LibraryButton>}
      </div>
      {copyState && <p role={copyState.ok ? 'status' : 'alert'} className={`text-sm ${copyState.ok ? 'text-emerald-200' : 'text-amber-200'}`}>{copyState.message}</p>}
    </header>
    {snapshot
      ? <NovelBlueprintEditor snapshot={snapshot} destinedEnding={destinedEnding} busy={busy}
          readOnly={!editable} onSave={editable ? onSave : undefined} />
      : <p className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-300" data-testid="story-blueprint-none">
          This novel began from a premise, not a Story Seed, so it has no World Blueprint.
        </p>}
  </div>;
}

/** A HARNESS story's Blueprint page, read from the story's active Foundation revision. */
export function StoryBlueprintPage({ stories, storyId, access, onBack, backLabel, onCopy }: {
  stories: LibraryStories;
  storyId: string;
  access: StoryBlueprintAccess;
  onBack: () => void;
  backLabel?: string;
  onCopy?: StoryBlueprintViewProps['onCopy'];
}) {
  const { state, controller } = stories;
  const story = state ? findStory(state, storyId) : undefined;
  const foundation = state && story ? findFoundationRevision(state, story.activeFoundationRevisionId) : undefined;
  const input = foundation?.input;
  // One snapshot per Foundation revision, so re-rendering never resets an unsaved edit.
  const snapshot = useMemo<NovelBlueprintSnapshot | undefined>(() => input?.sourceSnapshot?.kind === 'story-seed' && input.sourceSnapshot.blueprint
    ? { seed: input.sourceSnapshot.seed as StorySeedInput, blueprint: input.sourceSnapshot.blueprint as WorldBlueprint }
    : undefined,
  [foundation?.id]);
  if (!story) return <p role="alert" className="text-sm text-amber-200">This story is no longer available.</p>;
  return <StoryBlueprintView title={story.title} snapshot={snapshot} destinedEnding={input?.destinedEnding}
    access={access} isPrivate={(story.visibility ?? 'private') === 'private'}
    onBack={onBack} backLabel={backLabel} onCopy={onCopy}
    onSave={input ? async next => { await controller.saveFoundationRevision(storyId, foundationFromNovelBlueprint(input, next, story)); } : undefined} />;
}
