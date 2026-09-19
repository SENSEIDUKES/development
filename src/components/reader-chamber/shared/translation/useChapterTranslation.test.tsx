// @vitest-environment jsdom
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from '../../../../test-utils/createReaderRoot';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateHarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { type HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { type SenLanguageCode } from '@seihouse/sen/contracts';
import { type ReaderChapter } from '@seihouse/sen/contracts';
import { ReaderTranslationController } from '@seihouse/sen/translation';
import { type ReaderTranslationProvider } from '@seihouse/sen/translation';
import { InMemoryReaderTranslationRepository } from './repository';
import { useChapterTranslation } from '@seihouse/sen/translation';
import { ReaderTranslationRuntimeProvider } from '@seihouse/sen/translation';

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
let controller: ReaderTranslationController;
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
  const domRoot = createRoot(container);
  root = { unmount: () => domRoot.unmount(), render: children => domRoot.render(<ReaderTranslationRuntimeProvider controller={controller}>{children}</ReaderTranslationRuntimeProvider>) };
  pending = new Map();
  const provider: ReaderTranslationProvider = {
    translate(request) {
      return new Promise(resolve => pending.set(request.targetLanguage, { resolve }));
    },
  };
  controller = new ReaderTranslationController({
    repository: new InMemoryReaderTranslationRepository(),
    provider,
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
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
