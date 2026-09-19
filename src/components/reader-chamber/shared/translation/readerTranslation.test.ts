import { describe, expect, it, vi } from 'vitest';
import { validateHarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { type HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import { type ReaderChapter, type StoryBlock } from '@seihouse/sen/contracts';
import { READER_TRANSLATION_SCHEMA_VERSION, type DerivedChapterTranslation } from '@seihouse/sen/translation';
import { ReaderTranslationController } from '@seihouse/sen/translation';
import { type ReaderTranslationProvider } from '@seihouse/sen/translation';
import { InMemoryReaderTranslationRepository } from './repository';
import { MAX_CACHED_TRANSLATIONS } from '../../../../host/reader/translationStorage';
import { WebReaderTranslationRepository } from '../../../../host/reader/translationStorage';
import { buildReaderFacingChapter, mergeReaderTranslation, readerFacingContentHash } from '@seihouse/sen/translation';
import { readerTranslationSkillContentDigest, resolveReaderTranslationSkill } from '@seihouse/sen/translation';
import { validateReaderTranslationResponse } from '@seihouse/sen/translation';

/**
 * Test-only manifests and fixtures. Nothing here is an installable product
 * Translation skill; these exist purely to exercise the contract.
 */
const testReaderSkill = (overrides: Partial<HarnessSkillManifest> = {}): HarnessSkillManifest =>
  validateHarnessSkillManifest({
    id: 'test.reader.translation.ko',
    version: '1.0.0',
    name: 'Test Korean Reader Translation',
    description: 'Test-only reader Translation manifest.',
    slot: 'translation',
    applications: ['reader'],
    instructions: 'Render reader-facing values in the declared target language.',
    source: { packageId: 'test-package', packageVersion: '1.0.0', path: 'reader.md', sha256: 'digest-ko-v1' },
    translation: { targetLanguage: 'ko' },
    ...overrides,
  } as HarnessSkillManifest);

const canonicalBlocks = (): StoryBlock[] => [
  {
    id: 'block-1',
    type: 'narration',
    text: 'The courier climbed the mountain stair.',
    metadata: {
      speakerName: 'Narrator',
      entities: [{ name: 'Ye Chen', type: 'character', mention: 'reveal' }],
      music: { mood: 'solemn', region: 'chinese', trackId: 'track-77' },
      audioMoments: [{
        blockId: 'block-1',
        triggerPhrase: 'mountain stair',
        sourceCategory: 'locations',
        variation: 'wind',
        semanticTags: ['cold'],
      }],
    },
  },
  {
    id: 'block-2',
    type: 'system',
    text: '',
    system: {
      kind: 'system_prompt',
      promptType: 'progression',
      presentation: 'mechanical',
      title: 'Cultivation Advance',
      rows: [{ label: 'Realm', value: 'Qi Condensation', trend: 'up' }],
      changes: [{ direction: 'gain', label: 'QI 200', tone: 'positive' }],
      status: {
        level: 'Tier 1',
        bars: [{ label: 'Spirit', value: 40, max: 100, display: '40 / 100', tone: 'spirit' }],
      },
    },
  },
  {
    id: 'block-3',
    type: 'dialogue',
    text: '"The gate is closed," he said.',
  },
];

const chapter = (blocks = canonicalBlocks()): ReaderChapter => ({
  persistenceId: 'chapter-1',
  number: 1,
  title: 'The Closed Gate',
  premise: '',
  status: 'unread',
  blocks,
  audioMoments: [{
    id: 'moment-1',
    blockId: 'block-1',
    triggerPhrase: 'mountain stair',
    occurrenceIndex: 0,
    sourceCategory: 'locations',
    variation: 'wind',
    semanticTags: ['cold'],
    cue: { publicUrl: 'https://library.example/cue.mp3' },
  }],
});

/** A faithful model: every canonical value restated in the target language. */
const faithfulReply = (source: ReturnType<typeof buildReaderFacingChapter>) => JSON.stringify({
  title: '닫힌 문',
  blocks: source.blocks.map(block => ({
    id: block.id,
    ...(block.text !== undefined ? { text: `[ko] ${block.text}` } : {}),
    ...(block.system ? {
      system: {
        ...(block.system.title !== undefined ? { title: `[ko] ${block.system.title}` } : {}),
        ...(block.system.rows ? {
          rows: block.system.rows.map(row => ({ label: `[ko] ${row.label}`, value: `[ko] ${row.value}` })),
        } : {}),
        ...(block.system.changes ? { changes: block.system.changes.map(label => `[ko] ${label}`) } : {}),
        ...(block.system.status ? {
          status: {
            ...(block.system.status.level !== undefined ? { level: `[ko] ${block.system.status.level}` } : {}),
            ...(block.system.status.bars ? {
              bars: block.system.status.bars.map(bar => ({
                label: `[ko] ${bar.label}`,
                ...(bar.display !== undefined ? { display: bar.display } : {}),
              })),
            } : {}),
          },
        } : {}),
      },
    } : {}),
  })),
});

const stubProvider = (
  reply: (source: ReturnType<typeof buildReaderFacingChapter>) => string | Promise<string>,
): ReaderTranslationProvider & { calls: number } => {
  const provider = {
    calls: 0,
    async translate(request: Parameters<ReaderTranslationProvider['translate']>[0]) {
      provider.calls += 1;
      return {
        rawProviderResponse: await reply(request.source),
        receipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-09-15T00:00:00.000Z' },
      };
    },
  };
  return provider;
};

const buildController = (options: {
  provider: ReaderTranslationProvider;
  skills?: HarnessSkillManifest[];
  repository?: InMemoryReaderTranslationRepository;
}) => new ReaderTranslationController({
  repository: options.repository ?? new InMemoryReaderTranslationRepository(),
  provider: options.provider,
  installedSkills: options.skills ?? [testReaderSkill()],
});

const japaneseStory = { id: 'story-1', originalLanguage: 'ja' } as const;

describe('reader-facing material is the only thing sent for translation', () => {
  it('carries prose and reader-visible System values and nothing machine-facing', () => {
    const source = buildReaderFacingChapter(chapter());
    const serialized = JSON.stringify(source);

    expect(source.blocks.map(block => block.id)).toEqual(['block-1', 'block-2', 'block-3']);
    expect(source.blocks[1].system).toMatchObject({
      title: 'Cultivation Advance',
      rows: [{ label: 'Realm', value: 'Qi Condensation' }],
      changes: ['QI 200'],
      status: { level: 'Tier 1', bars: [{ label: 'Spirit', display: '40 / 100' }] },
    });

    for (const machineFacing of [
      'narration', 'dialogue', 'metadata', 'speakerName', 'Narrator', 'entities',
      'music', 'track-77', 'chinese', 'audioMoments', 'triggerPhrase', 'mountain stair"',
      'promptType', 'presentation', 'progression', 'mechanical', 'trend', 'tone', 'direction',
    ]) {
      expect(serialized).not.toContain(machineFacing);
    }
    // The numeric bar drivers stay canonical; only the authored figure travels.
    expect(source.blocks[1].system?.status?.bars?.[0]).toEqual({ label: 'Spirit', display: '40 / 100' });
  });

  it('changes its hash when reader-facing text changes and not when metadata does', () => {
    const base = readerFacingContentHash(buildReaderFacingChapter(chapter()));

    const retagged = canonicalBlocks();
    retagged[0].metadata = { ...retagged[0].metadata, music: { mood: 'tense', trackId: 'track-99' } };
    expect(readerFacingContentHash(buildReaderFacingChapter(chapter(retagged)))).toBe(base);

    const edited = canonicalBlocks();
    edited[0].text = 'The courier turned back at the stair.';
    expect(readerFacingContentHash(buildReaderFacingChapter(chapter(edited)))).not.toBe(base);
  });
});

describe('a translation cannot reshape the canonical chapter', () => {
  const source = buildReaderFacingChapter(chapter());

  it('restores canonical order regardless of the order the model replied in', () => {
    const shuffled = JSON.parse(faithfulReply(source));
    shuffled.blocks.reverse();

    expect(validateReaderTranslationResponse(shuffled, source).blocks.map(block => block.id))
      .toEqual(['block-1', 'block-2', 'block-3']);
  });

  it('rejects an unknown, duplicated, or omitted block', () => {
    const unknown = JSON.parse(faithfulReply(source));
    unknown.blocks.push({ ...unknown.blocks[0], id: 'block-invented' });
    expect(() => validateReaderTranslationResponse(unknown, source)).toThrow('unknown block ID');

    const duplicated = JSON.parse(faithfulReply(source));
    duplicated.blocks.push({ ...duplicated.blocks[0] });
    expect(() => validateReaderTranslationResponse(duplicated, source)).toThrow('more than once');

    const omitted = JSON.parse(faithfulReply(source));
    omitted.blocks.pop();
    expect(() => validateReaderTranslationResponse(omitted, source)).toThrow('omitted 1 canonical block');
  });

  it('rejects a response that returns machine-facing data', () => {
    for (const injected of [
      { type: 'narration' },
      { metadata: { speakerName: '내레이터' } },
      { system: { title: '수련 진전', promptType: 'progression' } },
      { system: { title: '수련 진전', changes: ['기 200'], direction: 'gain' } },
    ]) {
      const tampered = JSON.parse(faithfulReply(source));
      Object.assign(tampered.blocks[0], injected);
      expect(() => validateReaderTranslationResponse(tampered, source))
        .toThrow('machine-facing data');
    }
  });

  it('rejects a response that changes a positional list length', () => {
    const tampered = JSON.parse(faithfulReply(source));
    tampered.blocks[1].system.rows.push({ label: '추가', value: '없음' });

    expect(() => validateReaderTranslationResponse(tampered, source)).toThrow('from 1 to 2 entries');
  });
});

describe('merging a translation for display', () => {
  it('keeps every block ID, order, type, and machine-facing field canonical', () => {
    const blocks = canonicalBlocks();
    const source = buildReaderFacingChapter(chapter(blocks));
    const validated = validateReaderTranslationResponse(faithfulReply(source), source);

    const merged = mergeReaderTranslation(blocks, validated.blocks);

    expect(merged.map(block => block.id)).toEqual(blocks.map(block => block.id));
    expect(merged.map(block => block.type)).toEqual(['narration', 'system', 'dialogue']);
    expect(merged[0].metadata).toEqual(blocks[0].metadata);
    expect(merged[0].text).toBe('[ko] The courier climbed the mountain stair.');
    // Canonical English semantics survive beside the translated labels.
    expect(merged[1].system).toMatchObject({
      kind: 'system_prompt',
      promptType: 'progression',
      presentation: 'mechanical',
      title: '[ko] Cultivation Advance',
      rows: [{ label: '[ko] Realm', value: '[ko] Qi Condensation', trend: 'up' }],
      changes: [{ direction: 'gain', label: '[ko] QI 200', tone: 'positive' }],
    });
    expect((merged[1].system as { status: { bars: unknown[] } }).status.bars[0])
      .toEqual({ label: '[ko] Spirit', value: 40, max: 100, display: '40 / 100', tone: 'spirit' });
  });

  it('never writes to the canonical blocks it was given', () => {
    const blocks = canonicalBlocks();
    const snapshot = structuredClone(blocks);
    const source = buildReaderFacingChapter(chapter(blocks));

    mergeReaderTranslation(blocks, validateReaderTranslationResponse(faithfulReply(source), source).blocks);

    expect(blocks).toEqual(snapshot);
  });
});

describe('resolving which skill may translate for a reader', () => {
  it('requires the reader application and the exact target language', () => {
    const readerSkill = testReaderSkill();

    expect(resolveReaderTranslationSkill([readerSkill], 'ko')).toEqual({ ok: true, skill: readerSkill });
    expect(resolveReaderTranslationSkill([readerSkill], 'vi').ok).toBe(false);
  });

  it('never borrows the story’s generation Translation skill for another language', () => {
    // The story's equipped skill: Japanese, generation only. A reader asking
    // for Korean must not be served by it under any circumstances.
    const generationSkill = testReaderSkill({
      id: 'test.generation.translation.ja',
      applications: ['generation'],
      translation: { targetLanguage: 'ja' },
    });

    expect(resolveReaderTranslationSkill([generationSkill], 'ko').ok).toBe(false);
    expect(resolveReaderTranslationSkill([generationSkill], 'ja').ok).toBe(false);
  });

  it('never falls back to a generic or English skill', () => {
    const english = testReaderSkill({ id: 'test.reader.translation.en', translation: { targetLanguage: 'en' } });
    const resolution = resolveReaderTranslationSkill([english], 'ko');

    expect(resolution.ok).toBe(false);
    expect(resolution.ok === false && resolution.message).toContain('Korean');
  });

  it('uses the newest installed version of one compatible skill identity', () => {
    const oldSkill = testReaderSkill({ version: '1.9.0' });
    const newest = testReaderSkill({ version: '1.10.0' });

    expect(resolveReaderTranslationSkill([oldSkill, newest], 'ko'))
      .toEqual({ ok: true, skill: newest });
  });

  it('reports ambiguity across different compatible skill identities unless one is explicitly selected', () => {
    const first = testReaderSkill({ id: 'test.reader.translation.ko.first' });
    const second = testReaderSkill({ id: 'test.reader.translation.ko.second' });
    const ambiguous = resolveReaderTranslationSkill([first, second], 'ko');

    expect(ambiguous.ok).toBe(false);
    expect(ambiguous.ok === false && ambiguous.message).toContain('Choose one explicitly');
    expect(resolveReaderTranslationSkill([first, second], 'ko', { id: second.id }))
      .toEqual({ ok: true, skill: second });
  });
});

describe('the translation controller', () => {
  it('makes no request at all when the reading language is the story’s own', async () => {
    const provider = stubProvider(faithfulReply);
    const controller = buildController({ provider });

    const outcome = await controller.translate({
      story: japaneseStory, chapter: chapter(), targetLanguage: 'ja',
    });

    expect(outcome).toEqual({ status: 'original' });
    expect(provider.calls).toBe(0);
  });

  it('reports an unavailable language package instead of translating with the wrong skill', async () => {
    const provider = stubProvider(faithfulReply);
    const controller = buildController({ provider, skills: [] });

    const outcome = await controller.translate({
      story: japaneseStory, chapter: chapter(), targetLanguage: 'ko',
    });

    expect(outcome.status).toBe('unavailable');
    expect(provider.calls).toBe(0);
  });

  it('saves a derived artifact carrying identity, provenance, and receipt', async () => {
    const repository = new InMemoryReaderTranslationRepository();
    const controller = buildController({ provider: stubProvider(faithfulReply), repository });

    const outcome = await controller.translate({
      story: japaneseStory, chapter: chapter(), targetLanguage: 'ko',
    });

    expect(outcome.status).toBe('ready');
    const skill = testReaderSkill();
    const saved = repository.read('story-1', 1, 'ko', {
      id: skill.id,
      version: skill.version,
      contentDigest: readerTranslationSkillContentDigest(skill),
    }) as DerivedChapterTranslation;
    expect(saved).toMatchObject({
      schemaVersion: READER_TRANSLATION_SCHEMA_VERSION,
      storyId: 'story-1',
      chapterNumber: 1,
      chapterId: 'chapter-1',
      sourceLanguage: 'ja',
      targetLanguage: 'ko',
      skillId: 'test.reader.translation.ko',
      skillVersion: '1.0.0',
      skillContentDigest: 'digest-ko-v1',
      title: '닫힌 문',
      status: 'ready',
      receipt: { provider: 'fixture', model: 'fixture' },
    });
    expect(saved.sourceContentHash).toBe(readerFacingContentHash(buildReaderFacingChapter(chapter())));
  });

  it('reuses a cached translation only while the source hash and skill version hold', async () => {
    const repository = new InMemoryReaderTranslationRepository();
    const provider = stubProvider(faithfulReply);
    const skills = [testReaderSkill()];
    const controller = buildController({ provider, repository, skills });

    await controller.translate({ story: japaneseStory, chapter: chapter(), targetLanguage: 'ko' });
    await controller.translate({ story: japaneseStory, chapter: chapter(), targetLanguage: 'ko' });
    expect(provider.calls).toBe(1);

    // The canonical chapter changed: the cached overlay is stale.
    const edited = canonicalBlocks();
    edited[2].text = '"The gate is open," he said.';
    await controller.translate({ story: japaneseStory, chapter: chapter(edited), targetLanguage: 'ko' });
    expect(provider.calls).toBe(2);

    // A new skill version is a new translation, even for identical prose.
    controller.setInstalledSkills([testReaderSkill({ version: '1.1.0' })]);
    await controller.translate({ story: japaneseStory, chapter: chapter(edited), targetLanguage: 'ko' });
    expect(provider.calls).toBe(3);
  });

  it('collapses simultaneous requests for the same translation into one call', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const provider = stubProvider(async source => {
      await gate;
      return faithfulReply(source);
    });
    const controller = buildController({ provider });

    const pending = [0, 1, 2].map(() => controller.translate({
      story: japaneseStory, chapter: chapter(), targetLanguage: 'ko',
    }));
    release?.();
    const outcomes = await Promise.all(pending);

    expect(provider.calls).toBe(1);
    expect(outcomes.every(outcome => outcome.status === 'ready')).toBe(true);
  });

  it('falls back to the readable original when the provider or the response fails', async () => {
    const repository = new InMemoryReaderTranslationRepository();
    const failing = buildController({
      provider: { translate: vi.fn().mockRejectedValue(new Error('Provider unavailable.')) },
      repository,
    });

    const providerFailure = await failing.translate({
      story: japaneseStory, chapter: chapter(), targetLanguage: 'ko',
    });
    expect(providerFailure).toEqual({ status: 'failed', message: 'Provider unavailable.' });
    // Nothing invalid is cached, so a later attempt starts clean.
    const skill = testReaderSkill();
    expect(repository.read('story-1', 1, 'ko', {
      id: skill.id, version: skill.version, contentDigest: readerTranslationSkillContentDigest(skill),
    })).toBeNull();

    const invalid = buildController({
      provider: stubProvider(() => JSON.stringify({ title: '닫힌 문', blocks: [] })),
      repository,
    });
    const responseFailure = await invalid.translate({
      story: japaneseStory, chapter: chapter(), targetLanguage: 'ko',
    });
    expect(responseFailure.status).toBe('failed');
    expect(repository.read('story-1', 1, 'ko', {
      id: skill.id, version: skill.version, contentDigest: readerTranslationSkillContentDigest(skill),
    })).toBeNull();
  });

  it('freezes only the glossary entries this chapter references', async () => {
    const frozen: unknown[] = [];
    const provider: ReaderTranslationProvider = {
      async translate(request) {
        frozen.push({ entries: request.glossary, source: request.glossarySource });
        return {
          rawProviderResponse: faithfulReply(request.source),
          receipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-09-15T00:00:00.000Z' },
        };
      },
    };
    const controller = buildController({
      provider,
      skills: [testReaderSkill({
        translation: {
          targetLanguage: 'ko',
          glossary: {
            targetLanguage: 'ko',
            source: { path: 'assets/glossary.json', sha256: 'glossary-digest' },
            entries: [
              { term: 'Qi Condensation', translation: '기 응축' },
              { term: 'Heavenly Tribulation', translation: '천겁' },
            ],
          },
        },
      })],
    });

    await controller.translate({ story: japaneseStory, chapter: chapter(), targetLanguage: 'ko' });

    expect(frozen[0]).toEqual({
      entries: [{ term: 'Qi Condensation', translation: '기 응축' }],
      source: { path: 'assets/glossary.json', sha256: 'glossary-digest' },
    });
  });

  it('never selects glossary entries from block IDs or JSON field names', async () => {
    const frozen: unknown[] = [];
    const controller = buildController({
      provider: {
        async translate(request) {
          frozen.push(request.glossary);
          return {
            rawProviderResponse: faithfulReply(request.source),
            receipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-09-15T00:00:00.000Z' },
          };
        },
      },
      skills: [testReaderSkill({
        translation: {
          targetLanguage: 'ko',
          glossary: {
            targetLanguage: 'ko',
            entries: [
              { term: 'block-1', translation: 'wrong' },
              { term: 'system', translation: 'wrong' },
              { term: 'Qi Condensation', translation: '기 응축' },
            ],
          },
        },
      })],
    });

    await controller.translate({ story: japaneseStory, chapter: chapter(), targetLanguage: 'ko' });
    expect(frozen[0]).toEqual([{ term: 'Qi Condensation', translation: '기 응축' }]);
  });

  it('separates cache and in-flight work by skill id, version, and content digest', async () => {
    const repository = new InMemoryReaderTranslationRepository();
    let release: (() => void) | undefined;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const provider = stubProvider(async source => {
      await gate;
      return faithfulReply(source);
    });
    const first = testReaderSkill({ source: { packageId: 'test', packageVersion: '1', path: 'reader.md', sha256: 'digest-a' } });
    const second = testReaderSkill({ source: { packageId: 'test', packageVersion: '1', path: 'reader.md', sha256: 'digest-b' } });
    const controller = buildController({ provider, repository, skills: [first] });

    const firstRequest = controller.translate({ story: japaneseStory, chapter: chapter(), targetLanguage: 'ko' });
    controller.setInstalledSkills([second]);
    const secondRequest = controller.translate({ story: japaneseStory, chapter: chapter(), targetLanguage: 'ko' });
    release?.();
    await Promise.all([firstRequest, secondRequest]);

    expect(provider.calls).toBe(2);
    expect(repository.read('story-1', 1, 'ko', {
      id: first.id, version: first.version, contentDigest: 'digest-a',
    })).not.toBeNull();
    expect(repository.read('story-1', 1, 'ko', {
      id: second.id, version: second.version, contentDigest: 'digest-b',
    })).not.toBeNull();
  });
});

describe('the browser translation cache', () => {
  it('removes a stored collection when every record fails current-schema validation', () => {
    const values = new Map([['translations', JSON.stringify({ stale: { schemaVersion: 1 } })]]);
    let removals = 0;
    const repository = new WebReaderTranslationRepository({
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: key => { removals += 1; values.delete(key); },
    }, 'translations');

    expect(repository.read('story', 1, 'ko', {
      id: 'skill', version: '1.0.0', contentDigest: 'digest',
    })).toBeNull();
    expect(removals).toBe(1);
    expect(values.has('translations')).toBe(false);
  });

  it('keeps a bounded set of the newest skill-specific translations', () => {
    const values = new Map<string, string>();
    const repository = new WebReaderTranslationRepository({
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value); },
      removeItem: key => { values.delete(key); },
    }, 'translations');
    for (let chapterNumber = 1; chapterNumber <= MAX_CACHED_TRANSLATIONS + 3; chapterNumber += 1) {
      repository.write({
        schemaVersion: READER_TRANSLATION_SCHEMA_VERSION,
        storyId: 'story-cache',
        chapterNumber,
        sourceLanguage: 'ja',
        targetLanguage: 'ko',
        sourceContentHash: `source-${chapterNumber}`,
        skillId: 'test.reader.translation.ko',
        skillVersion: '1.0.0',
        skillContentDigest: 'digest-ko-v1',
        title: `Chapter ${chapterNumber}`,
        blocks: [{ id: `block-${chapterNumber}`, text: 'Translated.' }],
        receipt: { provider: 'fixture', model: 'fixture', generatedAt: '2026-09-16T00:00:00.000Z' },
        status: 'ready',
      });
    }

    const stored = JSON.parse(values.values().next().value ?? '{}') as Record<string, unknown>;
    expect(Object.keys(stored)).toHaveLength(MAX_CACHED_TRANSLATIONS);
    expect(repository.read('story-cache', MAX_CACHED_TRANSLATIONS + 3, 'ko', {
      id: 'test.reader.translation.ko', version: '1.0.0', contentDigest: 'digest-ko-v1',
    })).not.toBeNull();
    expect(repository.read('story-cache', 1, 'ko', {
      id: 'test.reader.translation.ko', version: '1.0.0', contentDigest: 'digest-ko-v1',
    })).toBeNull();
  });
});

describe('no real Translation skill is installed by this work', () => {
  it('declares Translation metadata only inside tests and fixtures', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = new URL('../../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

    const offenders: string[] = [];
    let scanned = 0;
    const walk = (directory: string) => {
      for (const entry of readdirSync(directory)) {
        const path = join(directory, entry);
        if (statSync(path).isDirectory()) {
          walk(path);
          continue;
        }
        if (!/\.tsx?$/.test(entry) || /\.test\.tsx?$/.test(entry)) continue;
        scanned += 1;
        if (readFileSync(path, 'utf8').includes("slot: 'translation'")) offenders.push(path);
      }
    };
    walk(root);

    // Guards the scan itself: a walk that found nothing proves nothing.
    expect(scanned).toBeGreaterThan(200);
    expect(offenders).toEqual([]);
  });
});
