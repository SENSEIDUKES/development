// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateHarnessSkillManifest } from '../../../harness-generation/shared/skills';
import type { HarnessSkillManifest } from '../../../harness-generation/shared/types';
import type { SenLanguageCode } from '../../../../lib/language';
import type { ReaderChapter } from '../types';
import { ReaderTranslationController } from './controller';
import type { ReaderTranslationProvider } from './provider';
import { InMemoryReaderTranslationRepository } from './repository';
import { setReaderTranslationController, useChapterTranslation } from './useChapterTranslation';

const chapter: ReaderChapter = {
  persistenceId: 'chapter-1',
  number: 1,
  title: 'Gate',
  premise: '',
  status: 'unread',
  blocks: [{ id: 'block-1', type: 'narration', text: 'The gate opened.' }],
};

const skill = (targetLanguage: SenLanguageCode): HarnessSkillManifest => validateHarnessSkillManifest({
  id: `test.reader.${targetLanguage}`,
  version: '1.0.0',
  name: `Test ${targetLanguage}`,
  description: 'Test-only Reader Translation skill.',
  slot: 'translation',
  applications: ['reader'],
  instructions: 'Translate reader-facing text.',
  translation: { targetLanguage },
  source: { packageId: `test-${targetLanguage}`, packageVersion: '1.0.0', path: 'reader.md', sha256: `digest-${targetLanguage}` },
});

const skills = [skill('ko'), skill('vi')];

interface Pending {
  resolve: (value: Awaited<ReturnType<ReaderTranslationProvider['translate']>>) => void;
}

let container: HTMLDivElement;
let root: Root;
let pending: Map<SenLanguageCode, Pending>;

const View = ({ targetLanguage }: { targetLanguage: SenLanguageCode }) => {
  const state = useChapterTranslation({
    story: { id: 'story-1', originalLanguage: 'ja' },
    chapter,
    targetLanguage,
    installedSkills: skills,
  });
  return <div data-status={state.status} data-language={state.translation?.targetLanguage ?? 'original'} />;
};

const response = (language: SenLanguageCode) => ({
  rawProviderResponse: JSON.stringify({
    title: `[${language}] Gate`,
    blocks: [{ id: 'block-1', text: `[${language}] The gate opened.` }],
  }),
  receipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-09-16T00:00:00.000Z' },
});

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  pending = new Map();
  const provider: ReaderTranslationProvider = {
    translate(request) {
      return new Promise(resolve => pending.set(request.targetLanguage, { resolve }));
    },
  };
  setReaderTranslationController(new ReaderTranslationController({
    repository: new InMemoryReaderTranslationRepository(),
    provider,
  }));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  setReaderTranslationController(null);
});

const status = () => container.querySelector('div')!;

describe('Reader translation request ordering', () => {
  it('does not let an older language request replace a newer language choice', async () => {
    await act(async () => { root.render(<View targetLanguage="ko" />); });
    await act(async () => { root.render(<View targetLanguage="vi" />); });

    await act(async () => { pending.get('ko')!.resolve(response('ko')); });
    expect(status().dataset.status).toBe('translating');
    expect(status().dataset.language).toBe('original');

    await act(async () => { pending.get('vi')!.resolve(response('vi')); });
    expect(status().dataset.status).toBe('ready');
    expect(status().dataset.language).toBe('vi');
  });

  it('invalidates every pending request immediately when switching to Original', async () => {
    await act(async () => { root.render(<View targetLanguage="ko" />); });
    await act(async () => { root.render(<View targetLanguage="ja" />); });

    expect(status().dataset.status).toBe('original');
    await act(async () => { pending.get('ko')!.resolve(response('ko')); });
    expect(status().dataset.status).toBe('original');
    expect(status().dataset.language).toBe('original');
  });
});
