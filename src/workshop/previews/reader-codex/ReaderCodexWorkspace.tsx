import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StoryCodex, declaredCharacters, deriveStoryCodex, type CodexPictureCard, type CodexPictures, type HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
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
import { loadSampleStory, SAMPLE_STORY_TITLE } from '../reader-chamber/sampleStory';

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

const escapeXml = (text: string) => text.replace(/[<>&"]/g, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[character]!);

/**
 * A stand-in picture: the card's name and look on a plain card, so Manifest
 * can be tried here without an image model. The app makes the real picture.
 */
const standInPicture = (card: CodexPictureCard) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#1b2130"/><text x="150" y="150" fill="#fafafa" font-family="serif" font-size="22" text-anchor="middle">${escapeXml(card.name)}</text><foreignObject x="24" y="176" width="252" height="180"><p xmlns="http://www.w3.org/1999/xhtml" style="margin:0;color:#c9ced8;font:13px sans-serif;text-align:center">${escapeXml(card.look?.summary ?? card.name)}</p></foreignObject><text x="150" y="380" fill="#8892a6" font-family="monospace" font-size="10" text-anchor="middle">STAND-IN PICTURE</text></svg>`)}`;

/** The preview's pictures: stand-ins made after a moment, held for the visit. */
function useStandInPictures(): CodexPictures {
  const [pictures, setPictures] = useState<Record<string, string>>({});
  return useMemo(() => ({
    pictureOf: key => pictures[key],
    manifest: card => new Promise(resolve => window.setTimeout(() => {
      setPictures(current => ({ ...current, [card.key]: standInPicture(card) }));
      resolve();
    }, 900)),
  }), [pictures]);
}

/**
 * Development: the Codex the Reader opens, reading SENSEI's Sundered Heavens
 * test as the app saved it. Its facts link to passages in the Reader Chamber
 * card, where the chapter sits behind the Codex. Manifest here makes a
 * stand-in picture (no image model is called); the app makes real ones.
 */
function StoryCodexPreviewPane() {
  const pictures = useStandInPictures();
  const [state, setState] = useState<HarnessWorkspaceState>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    loadSampleStory().then(loaded => { if (active) setState(loaded); }, () => { if (active) setError(`${SAMPLE_STORY_TITLE} could not be opened.`); });
    return () => { active = false; };
  }, []);
  const codex = useMemo(() => {
    const story = state?.stories[0];
    if (!state || !story) return undefined;
    const foundation = state.foundations.find(entry => entry.id === story.activeFoundationRevisionId)?.input;
    return {
      title: story.title,
      record: deriveStoryCodex({
        entries: state.codexEntries.filter(entry => entry.storyId === story.id),
        chapters: state.chapters.filter(chapter => chapter.storyId === story.id),
        mainCharacterName: foundation?.cast?.find(member => member.isMainCharacter)?.name,
        declared: foundation ? declaredCharacters(foundation) : [],
        declaredFactions: foundation?.identities?.filter(identity => identity.kind === 'faction') ?? [],
      }),
    };
  }, [state]);
  return (
    <div className="mx-auto min-w-0 max-w-md overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
      {codex
        ? <StoryCodex codex={codex.record} storyTitle={codex.title} pictures={pictures} />
        : <p role={error ? 'alert' : 'status'} className="p-4 text-sm text-neutral-400">{error || `Opening ${SAMPLE_STORY_TITLE}…`}</p>}
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
        description: 'Original Reference pages: these shortcuts drive the production Codex\'s real tabs. Development is the Codex the Reader opens, reading Sundered Heavens; it has its own Characters and Items tabs. Manifest on a card with a look makes a stand-in picture here, with no image model; the app makes the real one.',
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
          <StoryCodexPreviewPane />
      )}
    />
  );
}

export default ReaderCodexWorkspace;
