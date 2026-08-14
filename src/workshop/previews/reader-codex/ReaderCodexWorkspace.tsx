import React, { useCallback, useEffect, useRef, useState } from 'react';
import DevelopmentReaderCodex from '../../../components/reader-codex/development/ReaderCodex';
import ReferenceReaderCodex from '../../../components/reader-codex/reference/ReaderCodex';
import type {
  ReaderCodexStoryPatchUpdater,
  StoryMemory,
  StoryWorld,
  UpdateStoryFields,
} from '../../../components/reader-chamber/shared/types';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { createReaderCodexPreviewStory } from './previewData';
import { readerCodexPages, type ReaderCodexPage } from './previewStates';
import '../../../components/reader-chamber/shared/reader-chamber.css';
import '../../../components/reader-codex/shared/reader-codex.css';

type ReaderCodexComponent = typeof ReferenceReaderCodex;

function applyStoryPatch(
  current: StoryWorld,
  updates: ReaderCodexStoryPatchUpdater,
): StoryWorld {
  const patch = typeof updates === 'function' ? updates(current) : updates;
  return { ...current, ...patch };
}

function ReaderCodexPreviewPane({
  Component,
  activePage,
  supportsBestiary,
}: {
  Component: ReaderCodexComponent;
  activePage: ReaderCodexPage;
  supportsBestiary: boolean;
}) {
  const [story, setStory] = useState<StoryWorld>(() => createReaderCodexPreviewStory());
  const rootRef = useRef<HTMLDivElement>(null);

  const updateStoryFields: UpdateStoryFields = useCallback(async (_storyId, updates) => {
    setStory(current => applyStoryPatch(current, updates));
  }, []);

  const updateMemory = useCallback((memory: StoryMemory) => {
    setStory(current => ({ ...current, memory }));
  }, []);

  useEffect(() => {
    const requested = readerCodexPages.find(page => page.id === (
      activePage === 'bestiary' && !supportsBestiary ? 'portraits' : activePage
    ));
    if (!requested) return;
    const timer = window.setTimeout(() => {
      const button = [...(rootRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
        .find(candidate => candidate.textContent?.trim() === requested.sourceTabLabel);
      button?.click();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activePage, supportsBestiary]);

  const memory = story.memory ?? {
    characters: [],
    unresolvedPlotThreads: [],
    resolvedPlotThreads: [],
  };

  return (
    <div ref={rootRef} className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/30 p-2 sm:p-4">
      <Component
        memory={memory}
        arcs={story.arcs}
        onUpdateMemory={updateMemory}
        mcName={story.mcName}
        onJumpToChapter={chapterNumber => {
          setStory(current => ({ ...current, currentChapterNumber: chapterNumber }));
        }}
        onSwitchTab={() => undefined}
        activeStory={story}
        updateStoryFields={updateStoryFields}
      />
    </div>
  );
}

export function ReaderCodexWorkspace() {
  const entry = workshopEntries.find(item => item.id === 'reader-codex')!;
  const [activePage, setActivePage] = useState<ReaderCodexPage>('portraits');

  const controls = (
    <div className="w-full max-w-5xl rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md sm:p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
        Reader Codex sections · local story state · no production services
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7" role="tablist" aria-label="Reader Codex preview sections">
        {readerCodexPages.map(page => (
          <button
            key={page.id}
            type="button"
            role="tab"
            aria-selected={activePage === page.id}
            onClick={() => setActivePage(page.id)}
            className={`min-h-11 rounded-lg border px-3 py-2 text-xs transition-colors ${
              activePage === page.id
                ? 'border-cyan-400/45 bg-cyan-500/15 text-cyan-100'
                : 'border-white/10 bg-black/20 text-white/55 hover:bg-white/10 hover:text-white'
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <FeatureWorkspace
      entry={entry}
      controls={controls}
      allowCompare
      renderReference={() => (
          <ReaderCodexPreviewPane Component={ReferenceReaderCodex} activePage={activePage} supportsBestiary={false} />
      )}
      renderDevelopment={() => (
          <ReaderCodexPreviewPane Component={DevelopmentReaderCodex} activePage={activePage} supportsBestiary />
      )}
    />
  );
}

export default ReaderCodexWorkspace;
