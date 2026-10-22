import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StoryCodex, declaredCharacters, deriveStoryCodex, type CodexPictureCard, type CodexPictures, type HarnessWorkspaceState } from '@seihouse/sen/harness-generation';
import ReferenceReaderCodex from '../../../components/reader-codex/reference/ReaderCodex';
import type {
  ReaderCodexStoryPatchUpdater,
  StoryMemory,
  StoryWorld,
  UpdateStoryFields,
} from '@seihouse/sen/reader-chamber';
import { fillBlankSeedSlots, finalizeGeneratedWorldBlueprint, reconcileStorySeedBlueprint } from '@seihouse/sen/story-seed';
import { createHarnessFoundationFromStorySeed } from '@seihouse/library/story-seed';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { createMockBlueprint, createMockSeedSlotAnswer, createMockStorySeedRecord } from '../story-seed/previewData';
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
 * The Codex full before Chapter 1: the world a Story Seed and its World
 * Blueprint made, read through the real path the app uses — the Blueprint's
 * answer fills the Seed's blank slots, the Seed hands the world to the
 * Foundation, and the Codex shows it. No chapter has been written, so every
 * card is the world as it began and nothing links to a passage.
 */
const beforeChapterOne = () => {
  const record = createMockStorySeedRecord();
  // The same steps Create runs on a Blueprint answer: the answer is finalized,
  // its slot values fill the Seed's blanks, and the pair is reconciled.
  const generated = finalizeGeneratedWorldBlueprint(
    { ...createMockBlueprint(), ...createMockSeedSlotAnswer() },
    record.seed,
  );
  const { seed } = reconcileStorySeedBlueprint(fillBlankSeedSlots(record.seed, generated.generatedSeedSlots), generated);
  const foundation = createHarnessFoundationFromStorySeed({ ...record, seed });
  return {
    title: foundation.title ?? record.title,
    record: deriveStoryCodex({
      entries: [],
      chapters: [],
      world: foundation.worldAtChapterZero,
      mainCharacterName: foundation.cast?.find(member => member.isMainCharacter)?.name,
      declared: declaredCharacters(foundation),
      declaredFactions: foundation.identities?.filter(identity => identity.kind === 'faction') ?? [],
    }),
  };
};

/**
 * Development: the Codex the Reader opens. **Before Chapter 1** shows the world
 * a Story Seed and its Blueprint made, with no chapter written yet;
 * **Sundered Heavens** reads SENSEI's test story as the app saved it, whose
 * facts link to passages in the Reader Chamber card, where the chapter sits
 * behind the Codex. Manifest here makes a stand-in picture (no image model is
 * called); the app makes real ones.
 */
function StoryCodexPreviewPane({ scene }: { scene: StoryCodexScene }) {
  const pictures = useStandInPictures();
  const [state, setState] = useState<HarnessWorkspaceState>();
  const [error, setError] = useState('');
  const sample = scene === 'sundered-heavens';
  useEffect(() => {
    if (!sample) return;
    let active = true;
    loadSampleStory().then(loaded => { if (active) setState(loaded); }, () => { if (active) setError(`${SAMPLE_STORY_TITLE} could not be opened.`); });
    return () => { active = false; };
  }, [sample]);
  const codex = useMemo(() => {
    if (!sample) return beforeChapterOne();
    const story = state?.stories[0];
    if (!state || !story) return undefined;
    const foundation = state.foundations.find(entry => entry.id === story.activeFoundationRevisionId)?.input;
    return {
      title: story.title,
      record: deriveStoryCodex({
        entries: state.codexEntries.filter(entry => entry.storyId === story.id),
        chapters: state.chapters.filter(chapter => chapter.storyId === story.id),
        world: foundation?.worldAtChapterZero,
        mainCharacterName: foundation?.cast?.find(member => member.isMainCharacter)?.name,
        declared: foundation ? declaredCharacters(foundation) : [],
        declaredFactions: foundation?.identities?.filter(identity => identity.kind === 'faction') ?? [],
      }),
    };
  }, [sample, state]);
  return (
    <div className="mx-auto min-w-0 max-w-md overflow-hidden rounded-2xl border border-white/10 bg-neutral-950">
      {codex
        ? <StoryCodex codex={codex.record} storyTitle={codex.title} pictures={pictures} />
        : <p role={error ? 'alert' : 'status'} className="p-4 text-sm text-neutral-400">{error || `Opening ${SAMPLE_STORY_TITLE}…`}</p>}
    </div>
  );
}

/** Which story the Development Codex reads. */
type StoryCodexScene = 'before-chapter-one' | 'sundered-heavens';

const STORY_CODEX_SCENES: { id: StoryCodexScene; label: string }[] = [
  { id: 'before-chapter-one', label: 'Before Chapter 1' },
  { id: 'sundered-heavens', label: 'Sundered Heavens' },
];

export function ReaderCodexWorkspace() {
  const entry = workshopEntries.find(item => item.id === 'reader-codex')!;
  const [activePage, setActivePage] = useState<ReaderCodexPage>('portraits');
  const [scene, setScene] = useState<StoryCodexScene>('before-chapter-one');
  const pill = (active: boolean) => `workshop-touch-target rounded-lg border px-3 py-2 text-xs transition-colors ${
    active ? 'border-cyan-400/45 bg-cyan-500/15 text-cyan-100' : 'border-white/10 bg-black/20 text-white/55 hover:bg-white/10 hover:text-white'
  }`;

  return (
    <FeatureWorkspace
      entry={entry}
      workshopControls={{
        defaultSection: 'scenes',
        description: 'Development is the Codex the Reader opens. Before Chapter 1 shows the world a Story Seed and its World Blueprint made, with no chapter written: characters, items, abilities, places, factions, the Bestiary and the World rules sheet. Sundered Heavens reads SENSEI\'s test story as the app saved it. Manifest on a card with a look makes a stand-in picture here, with no image model; the app makes the real one. The Original Reference pages drive the production Codex\'s real tabs.',
        sections: [
          {
            id: 'scenes',
            content: (
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Development Codex story">
                {STORY_CODEX_SCENES.map(option => (
                  <button key={option.id} type="button" aria-pressed={scene === option.id}
                    onClick={() => setScene(option.id)} className={pill(scene === option.id)}>
                    {option.label}
                  </button>
                ))}
              </div>
            ),
          },
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
                    className={pill(activePage === page.id)}
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
          <StoryCodexPreviewPane scene={scene} />
      )}
    />
  );
}

export default ReaderCodexWorkspace;
