import { useEffect, useRef, useState } from 'react';
import type { HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import type { ReaderPreferenceStorage } from '@seihouse/sen/reader-runtime';
import { StoryPages, useLibraryStories } from '@seihouse/library/stories';
import { AGENTS } from '../../../lib/agents';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { LIBRARY_SOUND_WORDS_PRESET } from '../../../host/media/soundWordPacks';
import { createDeviceProfileStore } from '../../../host/profile/deviceProfile';
import { AppFamiliar } from '../../../novel-expanded/AppFamiliar';
import type { ReaderMixer } from '@seihouse/audio-player';
import type { ReaderSceneRun } from './sampleStory';
import { READER_PAGES, type ReaderPage } from './readerScenes';

const READER_SOUND_WORD_PRESETS = [LIBRARY_SOUND_WORDS_PRESET];

/** The app's soundscapes (NovelExpanded's APP_SOUNDSCAPES): the Reader's music before a story has a chapter. */
const SOUNDSCAPES = LIBRARY_BASE_MEDIA.soundscapes.map(entry => entry.track);

/** Called directly by the Workshop button, preserving the browser's user activation. */
export function applyReaderAudioState(mixer: ReaderMixer, state: 'on' | 'muted') {
  if (state === 'muted') mixer.setMasterMuted(true);
  else {
    if (mixer.getState().sleepTimer.status === 'fired') mixer.resumeAudio();
    mixer.setMasterEnabled(true);
    mixer.setMasterMuted(false);
    mixer.unlock();
  }
}

export interface AppReaderProps {
  /** The scene's story, reading place and replaying writer. */
  run: ReaderSceneRun;
  /** The official CAPA skills, installed as the app installs them. */
  skills: HarnessSkillManifest[];
  readerPreferences: ReaderPreferenceStorage;
  /** A Reader page to open by pressing its own button; asked again whenever a new request arrives. */
  page?: { id: ReaderPage; request: number };
  audio?: { id: 'on' | 'muted' | 'settings'; request: number };
}

/**
 * The app's Reader exactly as NovelExpanded hosts it: Library's `StoryPages`
 * on its read page, over `useLibraryStories`, with the app's writing screen
 * (VERSA), soundscapes and read-aloud voices. Only the services differ: the
 * scene's copy of the story and the reading place are held in memory, and the
 * writer replays the story's saved chapters instead of calling a model. Back
 * opens the story's World Info, as in the app; its Continue returns here.
 */
export function AppReader({ run, skills, readerPreferences, page, audio }: AppReaderProps) {
  // The app's Story Settings, with the Library's own Sound Words preset; installing packages stays in the app.
  const stories = useLibraryStories({ repository: run.stories, modelAdapter: run.writer, installedSkills: skills, baseMedia: LIBRARY_BASE_MEDIA, soundWordPresets: READER_SOUND_WORD_PRESETS });
  const [view, setView] = useState<'read' | 'info'>('read');
  const containerRef = useRef<HTMLDivElement>(null);
  // An isolated preview profile, using the app's default equipped Familiar.
  const [profile] = useState(() => createDeviceProfileStore({
    uid: 'workshop-reader', storage: { read: () => null, write: () => {}, remove: () => {} },
  }).read());

  // A page shortcut opens the Reader afresh (the story stays as it is) and presses
  // the page's own button: only a button on screen, since Compare keeps a hidden copy mounted.
  useEffect(() => {
    if (!page) return undefined;
    setView('read');
    const label = READER_PAGES.find(entry => entry.id === page.id)!.button;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      const chapterControls = containerRef.current?.querySelector<HTMLButtonElement>('button[aria-label="Chapter controls"]');
      const popupId = chapterControls?.getAttribute('aria-controls');
      const popup = popupId ? document.getElementById(popupId) : null;
      const button = containerRef.current?.querySelector<HTMLButtonElement>(`[data-testid="harness-reader"] button[aria-label="${label}"]`)
        ?? popup?.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
      const onScreen = button && (button.checkVisibility?.() ?? true);
      if (onScreen) button.click();
      else if (page.id === 'fate' && chapterControls?.getAttribute('aria-expanded') === 'false'
        && (chapterControls.checkVisibility?.() ?? true)) chapterControls.click();
      if (onScreen || tries > 80) window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [page]);

  // Open the canonical settings button, independently of the floating mini fader.
  useEffect(() => {
    if (!audio) return;
    setView('read');
    if (audio.id !== 'settings') return;
    let tries = 0;
    const timer = window.setInterval(() => {
      const settings = containerRef.current?.querySelector<HTMLButtonElement>('button[aria-label="Reader Settings"]');
      if (settings && (settings.checkVisibility?.() ?? true)) {
        settings.click();
        window.clearInterval(timer);
      } else if (++tries > 80) window.clearInterval(timer);
    }, 100);
    return () => window.clearInterval(timer);
  }, [audio]);

  return <div ref={containerRef} data-testid="reader-chamber-development">
    <AppFamiliar profile={profile} present reading={view === 'read'} place={view === 'read' ? { title: 'Reader', help: 'reader' } : { title: 'World Info', help: 'library' }} boundaryRef={containerRef}>
    <StoryPages key={page?.request ?? 0} stories={stories} storyId={run.storyId} page={view}
      readerStateRepository={run.readerPlace} readerPreferences={readerPreferences} soundscapes={SOUNDSCAPES}
      writingAgent={AGENTS.VERSA} backLabel="Back to the Reader"
      onOpenReader={() => setView('read')} onCloseReader={() => setView('info')} onBack={() => setView('read')} />
    </AppFamiliar>
  </div>;
}
