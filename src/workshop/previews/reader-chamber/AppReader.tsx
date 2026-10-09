import { useEffect, useRef, useState } from 'react';
import type { HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { StoryPages, useLibraryStories } from '@seihouse/library/stories';
import { AGENTS } from '../../../lib/agents';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import type { ReaderSceneRun } from './sampleStory';
import { READER_PAGES, type ReaderPage } from './readerScenes';

/** The app's soundscapes (NovelExpanded's APP_SOUNDSCAPES): the Reader's music before a story has a chapter. */
const SOUNDSCAPES = LIBRARY_BASE_MEDIA.soundscapes.map(entry => entry.track);

export interface AppReaderProps {
  /** The scene's story, reading place and replaying writer. */
  run: ReaderSceneRun;
  /** The official CAPA skills, installed as the app installs them. */
  skills: HarnessSkillManifest[];
  readerPreferences: ReaderPreferenceStorage;
  /** A Reader page to open by pressing its own button; asked again whenever a new request arrives. */
  page?: { id: ReaderPage; request: number };
}

/**
 * The app's Reader exactly as NovelExpanded hosts it: Library's `StoryPages`
 * on its read page, over `useLibraryStories`, with the app's writing screen
 * (VERSA), soundscapes and read-aloud voices. Only the services differ: the
 * scene's copy of the story and the reading place are held in memory, and the
 * writer replays the story's saved chapters instead of calling a model. Back
 * opens the story's World Info, as in the app; its Continue returns here.
 */
export function AppReader({ run, skills, readerPreferences, page }: AppReaderProps) {
  const stories = useLibraryStories({ repository: run.stories, modelAdapter: run.writer, installedSkills: skills, baseMedia: LIBRARY_BASE_MEDIA });
  const [view, setView] = useState<'read' | 'info'>('read');
  const containerRef = useRef<HTMLDivElement>(null);

  // A page shortcut opens the Reader afresh (the story stays as it is) and presses
  // the page's own button: only a button on screen, since Compare keeps a hidden copy mounted.
  useEffect(() => {
    if (!page) return undefined;
    setView('read');
    const label = READER_PAGES.find(entry => entry.id === page.id)!.button;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      const button = containerRef.current?.querySelector<HTMLButtonElement>(`[data-testid="harness-reader"] button[aria-label="${label}"]`);
      const onScreen = button && (button.checkVisibility?.() ?? true);
      if (onScreen) button.click();
      if (onScreen || tries > 80) window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [page]);

  return <div ref={containerRef} data-testid="reader-chamber-development">
    <StoryPages key={page?.request ?? 0} stories={stories} storyId={run.storyId} page={view}
      readerStateRepository={run.readerPlace} readerPreferences={readerPreferences} soundscapes={SOUNDSCAPES}
      writingAgent={AGENTS.VERSA} backLabel="Back to the Reader"
      onOpenReader={() => setView('read')} onCloseReader={() => setView('info')} onBack={() => setView('read')} />
  </div>;
}
