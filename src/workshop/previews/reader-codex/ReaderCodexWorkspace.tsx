import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ReaderCodex as DevelopmentReaderCodex } from '@seihouse/sen/reader-codex';
import ReferenceReaderCodex from '../../../components/reader-codex/reference/ReaderCodex';
import type {
  ReaderCodexStoryPatchUpdater,
  StoryMemory,
  StoryWorld,
  UpdateStoryFields,
} from '@seihouse/sen/reader-chamber';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { createReaderCodexPreviewStory } from './previewData';
import { readerCodexPages, type ReaderCodexPage } from './previewStates';

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

  return (
    <FeatureWorkspace
      entry={entry}
      workshopControls={{
        defaultSection: 'pages',
        description: 'Local story state only. These page shortcuts drive the real Codex tabs without replacing them.',
        sections: [
          {
            id: 'pages',
            content: (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7" role="group" aria-label="Reader Codex preview pages">
                {readerCodexPages.map(page => (
                  <button
                    key={page.id}
                    type="button"
                    aria-pressed={activePage === page.id}
                    onClick={() => setActivePage(page.id)}
                    className={`workshop-touch-target rounded-lg border px-3 py-2 text-xs transition-colors ${
                      activePage === page.id
                        ? 'border-cyan-400/45 bg-cyan-500/15 text-cyan-100'
                        : 'border-white/10 bg-black/20 text-white/55 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {page.label}
                  </button>
                ))}
              </div>
            ),
          },
        ],
      }}
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
