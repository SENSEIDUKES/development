import { describe, expect, it } from 'vitest';
import { checkNovelExpandedApp, findAppViolations, pageModule } from './checkNovelExpandedApp.mjs';
import { ownershipOf } from './ownershipInventory.mjs';

type Edge = { specifier: string; target?: string };
const graphOf = (edges: Record<string, Edge[]>) => new Map(Object.entries(edges));
const MAIN = 'src/novel-expanded/main.tsx';

describe('the NovelExpanded app guard', () => {
  it('finds the module the app page loads', () => {
    expect(pageModule('<script type="module" src="/src/novel-expanded/main.tsx"></script>')).toBe(MAIN);
    expect(() => pageModule('<p>no script</p>')).toThrow();
  });

  it('passes an app that reaches only current systems', () => {
    const { violations } = findAppViolations(graphOf({
      [MAIN]: [{ specifier: '@seihouse/library/stories', target: 'src/package/library/stories.ts' }],
      'src/package/library/stories.ts': [{ specifier: '../../library/stories/StoryPages', target: 'src/library/stories/StoryPages.tsx' }],
      'src/library/stories/StoryPages.tsx': [{ specifier: '@seihouse/sen/reader-runtime', target: 'src/package/sen/reader-runtime.ts' }],
      'src/package/sen/reader-runtime.ts': [{ specifier: '../../narrative/readerState', target: 'src/narrative/readerState.ts' }],
      'src/narrative/readerState.ts': [{ specifier: '../components/reader-chamber/shared/cinematicScroll/anchors', target: 'src/components/reader-chamber/shared/cinematicScroll/anchors.ts' }],
      'src/components/reader-chamber/shared/cinematicScroll/anchors.ts': [],
    }), MAIN, ownershipOf);
    expect(violations).toEqual([]);
  });

  it('names the chain to each older system, Workshop file and off-list entry', () => {
    const { violations } = findAppViolations(graphOf({
      [MAIN]: [
        { specifier: './HomePage', target: 'src/novel-expanded/HomePage.tsx' },
        { specifier: '@seihouse/sen/audio', target: 'src/package/sen/audio.ts' },
      ],
      'src/novel-expanded/HomePage.tsx': [
        { specifier: '@seihouse/library/home', target: 'src/package/library/home.ts' },
        { specifier: '../workshop/manifest', target: 'src/workshop/manifest.ts' },
      ],
      'src/package/library/home.ts': [
        { specifier: '@seihouse/sen/reader-chamber', target: 'src/package/sen/reader-chamber.ts' },
        { specifier: '../../library/generation/storyFlow', target: 'src/library/generation/storyFlow.ts' },
        { specifier: '../../components/reader-chamber/development/ReaderChamber', target: 'src/components/reader-chamber/development/ReaderChamber.tsx' },
      ],
      'src/package/sen/audio.ts': [],
      'src/workshop/manifest.ts': [],
      'src/library/generation/storyFlow.ts': [],
      'src/components/reader-chamber/development/ReaderChamber.tsx': [],
    }), MAIN, ownershipOf);
    expect(violations).toEqual([
      'ENTRY_NOT_IN_APP src/novel-expanded/main.tsx → @seihouse/sen/audio',
      'RETIRED_ENTRY src/novel-expanded/main.tsx → src/novel-expanded/HomePage.tsx → src/package/library/home.ts → @seihouse/sen/reader-chamber',
      'WORKSHOP_CODE src/novel-expanded/main.tsx → src/novel-expanded/HomePage.tsx → src/workshop/manifest.ts',
      'THE_HARNESS_DEVELOPER_PAGE src/novel-expanded/main.tsx → src/novel-expanded/HomePage.tsx → src/package/library/home.ts → src/library/generation/storyFlow.ts',
      'THE_OLDER_READER src/novel-expanded/main.tsx → src/novel-expanded/HomePage.tsx → src/package/library/home.ts → src/components/reader-chamber/development/ReaderChamber.tsx',
    ]);
  });

  it('lets in the Codex page the owner brought into the Reader Chamber, never the old production Codex', () => {
    const { violations } = findAppViolations(graphOf({
      [MAIN]: [
        { specifier: '../components/reader-codex/development/ReaderCodex', target: 'src/components/reader-codex/development/ReaderCodex.tsx' },
        { specifier: '../components/reader-codex/reference/ReaderCodex', target: 'src/components/reader-codex/reference/ReaderCodex.tsx' },
      ],
      'src/components/reader-codex/development/ReaderCodex.tsx': [
        { specifier: '../shared/codex/ReaderCodexGlossary', target: 'src/components/reader-codex/shared/codex/ReaderCodexGlossary.tsx' },
      ],
      'src/components/reader-codex/shared/codex/ReaderCodexGlossary.tsx': [],
      'src/components/reader-codex/reference/ReaderCodex.tsx': [],
    }), MAIN, ownershipOf);
    // The old production copy is Workshop reference material, so it stays out as Workshop code.
    expect(violations).toEqual(['WORKSHOP_CODE src/novel-expanded/main.tsx → src/components/reader-codex/reference/ReaderCodex.tsx']);
  });

  it('keeps the older Reader\'s narration out: the app reads aloud only with SEN\'s Read Aloud', () => {
    const { violations } = findAppViolations(graphOf({
      [MAIN]: [{ specifier: '../host/reader/webSpeechNarration', target: 'src/host/reader/webSpeechNarration.ts' }],
      'src/host/reader/webSpeechNarration.ts': [],
    }), MAIN, ownershipOf);
    expect(violations).toEqual(['THE_OLDER_READER src/novel-expanded/main.tsx → src/host/reader/webSpeechNarration.ts']);
  });

  it('passes the real app', () => {
    const { entry, violations, reached } = checkNovelExpandedApp();
    expect(entry).toBe(MAIN);
    expect(violations).toEqual([]);
    expect(reached).toBeGreaterThan(50);
  });
});
