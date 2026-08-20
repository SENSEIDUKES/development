import { describe, expect, it } from 'vitest';
import { parseLibraryCues } from './libraryCues';
import {
  resolveChapterAudioMoments,
  resolveLibraryCueForWorldCue,
  resolvePlayableAudioMoment,
  resolveResolvedAudioMomentCue,
  resolveWorldCueIntent,
  splitByResolvedAudioMoments,
  validateResolvedDialogueAudioMoment,
  validateWorldCueIntent,
  type ResolvedDialogueAudioMoment,
  type ResolvedWorldCueMoment,
  type WorldCueIntent,
} from './inlineAudio';

const growlIntent: WorldCueIntent = {
  blockId: 'block-a',
  triggerPhrase: 'the fox growled',
  occurrenceIndex: 0,
  sourceCategory: 'beasts',
  variation: 'growl',
  semanticTags: ['tiger', 'close'],
  relatedEntity: { name: 'Vermilion Debt Fox', type: 'creature' },
};

const resolvedMoment = (overrides: Partial<ResolvedWorldCueMoment> = {}): ResolvedWorldCueMoment => ({
  id: 'world-cue:block-a:0:fox',
  blockId: 'block-a',
  triggerPhrase: 'the fox growled',
  occurrenceIndex: 0,
  sourceCategory: 'beasts',
  variation: 'growl',
  semanticTags: ['tiger'],
  relatedEntity: { name: 'Vermilion Debt Fox', type: 'creature' },
  cue: {
    publicUrl: 'https://celestialaudio.seihouse.org/DEFAULT/Beasts/Growl/Tiger_Growl_1.mp3',
  },
  ...overrides,
});

const dialogueMoment = (
  overrides: Partial<ResolvedDialogueAudioMoment> = {},
): ResolvedDialogueAudioMoment => ({
  id: 'dialogue:block-a:0:mei-lin',
  blockId: 'block-a',
  triggerPhrase: '“Stand behind me.”',
  occurrenceIndex: 0,
  sourceCategory: 'voice',
  actionType: 'spoken-dialogue',
  semanticTags: ['dialogue', 'protective'],
  relatedEntity: { id: 'mei-lin', name: 'Mei Lin', type: 'character' },
  voiceKey: 'character.mei-lin',
  artifact: { publicUrl: 'https://celestialaudio.seihouse.org/dialogue/mei-lin/stand-behind-me.mp3' },
  ...overrides,
});

const catalogEntry = (
  fileName: string,
  tags: string[],
  confidence: number,
  publicUrl = `https://audio.example/${fileName}`,
) => ({
  file_path: `DEFAULT/Beasts/Growl/${fileName}`,
  public_url: publicUrl,
  metadata: {
    main_category: 'beasts',
    broad_variation: 'growl',
    soft_tags: tags,
    description: `${fileName} test cue`,
    confidence_score: confidence,
  },
});

describe('World Cue intent validation', () => {
  it('keeps generation output catalog- and provider-neutral', () => {
    expect(validateWorldCueIntent(growlIntent)).toMatchObject({ ok: true });
    expect(Object.keys(growlIntent).sort()).toEqual([
      'blockId',
      'occurrenceIndex',
      'relatedEntity',
      'semanticTags',
      'sourceCategory',
      'triggerPhrase',
      'variation',
    ]);

    expect(validateWorldCueIntent({
      ...growlIntent,
      cueUrl: 'https://audio.example/model-selected.mp3',
    })).toMatchObject({ ok: false, reason: 'forbidden-field' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      relatedEntity: { ...growlIntent.relatedEntity, providerId: 'private-provider-id' },
    })).toMatchObject({ ok: false, reason: 'forbidden-field' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      Voice_Key: 'private-voice-key',
    })).toMatchObject({ ok: false, reason: 'forbidden-field' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      PublicURL: 'https://audio.example/model-selected.mp3',
    })).toMatchObject({ ok: false, reason: 'forbidden-field' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      catalog_key: 'beast-growl-1',
    })).toMatchObject({ ok: false, reason: 'forbidden-field' });
  });

  it('requires positive audible-action evidence with or without entity context', () => {
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'A Vermilion Debt Fox',
    })).toMatchObject({ ok: false, reason: 'ineligible-phrase' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'Vermilion Debt Fox',
      relatedEntity: undefined,
    })).toMatchObject({ ok: false, reason: 'ineligible-phrase' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'The Azure Ring',
      sourceCategory: 'artifacts',
      variation: 'relics',
      relatedEntity: undefined,
    })).toMatchObject({ ok: false, reason: 'ineligible-phrase' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'The Azure Ring',
      sourceCategory: 'artifacts',
      variation: 'ringing',
      relatedEntity: undefined,
    })).toMatchObject({ ok: false, reason: 'ineligible-phrase' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'the fox growled',
      relatedEntity: undefined,
    })).toMatchObject({ ok: true });
    expect(validateWorldCueIntent({
      ...growlIntent,
      relatedEntity: { id: 'model-selected-entity', name: 'Vermilion Debt Fox' },
    })).toMatchObject({ ok: false, reason: 'invalid-intent' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      relatedEntity: { name: 'Vermilion Debt Fox', type: 'species' },
    })).toMatchObject({ ok: false, reason: 'invalid-intent' });
  });

  it('requires variation-compatible, affirmative audible actions', () => {
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'Mei Lin drew the Ashen Sword',
      sourceCategory: 'weapons',
      variation: 'unsheathe',
      relatedEntity: { name: 'Ashen Sword', type: 'artifact' },
    })).toMatchObject({ ok: true });
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'Mei Lin drew a map of the valley',
      sourceCategory: 'weapons',
      variation: 'unsheathe',
      relatedEntity: undefined,
    })).toMatchObject({ ok: false, reason: 'ineligible-phrase' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'the fox never growled',
    })).toMatchObject({ ok: false, reason: 'ineligible-phrase' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'the rifle fired',
      sourceCategory: 'weapons',
      variation: 'reload',
      relatedEntity: undefined,
    })).toMatchObject({ ok: false, reason: 'ineligible-phrase' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'Mei Lin reloaded the rifle',
      sourceCategory: 'weapons',
      variation: 'reload',
      relatedEntity: undefined,
    })).toMatchObject({ ok: true });
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'Howl',
      variation: 'howl',
      relatedEntity: undefined,
    })).toMatchObject({ ok: false, reason: 'ineligible-phrase' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'she sounded uncertain',
      sourceCategory: 'locations',
      variation: 'signatures',
      relatedEntity: undefined,
    })).toMatchObject({ ok: false, reason: 'ineligible-phrase' });
  });

  it('rejects selector-like values in every model-authored string field', () => {
    const candidates = [
      { ...growlIntent, blockId: 'https://media.example/block-a' },
      { ...growlIntent, triggerPhrase: 'the fox growled beside asset://beast-growl-1' },
      { ...growlIntent, sourceCategory: 'catalog://beasts' },
      { ...growlIntent, variation: 'DEFAULT/Beasts/Growl/Tiger_Growl_1.mp3' },
      { ...growlIntent, semanticTags: ['catalog_id=beast-growl-1'] },
      { ...growlIntent, semanticTags: ['asset-beast-growl-1'] },
      { ...growlIntent, semanticTags: ['beasts/growl/tiger'] },
      {
        ...growlIntent,
        relatedEntity: { name: 'https://media.example/fox', type: 'creature' },
      },
      {
        ...growlIntent,
        relatedEntity: { name: 'Vermilion Debt Fox', type: 'provider://creature' },
      },
    ];

    for (const candidate of candidates) {
      expect(validateWorldCueIntent(candidate))
        .toMatchObject({ ok: false, reason: 'forbidden-selector' });
    }
  });

  it('rejects terminal punctuation so the glyph owns the phrase/punctuation boundary', () => {
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: 'the fox growled.',
    })).toMatchObject({ ok: false, reason: 'ineligible-phrase' });
    expect(resolveResolvedAudioMomentCue(resolvedMoment({
      triggerPhrase: 'the fox growled.',
    }))).toMatchObject({ ok: false, reason: 'invalid-moment' });
    for (const punctuation of ['—', '–', '”', "'"]) {
      expect(validateWorldCueIntent({
        ...growlIntent,
        triggerPhrase: `the fox growled${punctuation}`,
      })).toMatchObject({ ok: false, reason: 'ineligible-phrase' });
    }
  });

  it('rejects reserved audio categories and bounds generated payload size', () => {
    expect(validateWorldCueIntent({
      ...growlIntent,
      sourceCategory: 'atmosphere',
    })).toMatchObject({ ok: false, reason: 'invalid-intent' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      sourceCategory: 'system',
    })).toMatchObject({ ok: false, reason: 'invalid-intent' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      sourceCategory: 'voice',
      voiceKey: 'character.mei-lin',
    })).toMatchObject({ ok: false, reason: 'forbidden-field' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      semanticTags: Array.from({ length: 9 }, (_, index) => `tag-${index}`),
    })).toMatchObject({ ok: false, reason: 'invalid-intent' });
    expect(validateWorldCueIntent({
      ...growlIntent,
      triggerPhrase: `the fox growled ${'x'.repeat(241)}`,
    })).toMatchObject({ ok: false, reason: 'invalid-intent' });
  });
});

describe('World Cue catalog resolution', () => {
  it('resolves deterministically by exact variation, tag overlap, confidence, then URL', () => {
    const loaded = parseLibraryCues([
      catalogEntry('z.mp3', ['tiger', 'close'], 0.6, 'https://audio.example/z.mp3'),
      catalogEntry('b.mp3', ['tiger'], 1, 'https://audio.example/b.mp3'),
      catalogEntry('a.mp3', ['tiger', 'close'], 0.9, 'https://audio.example/a.mp3'),
      catalogEntry('aa.mp3', ['tiger', 'close'], 0.9, 'https://audio.example/aa.mp3'),
      {
        ...catalogEntry('howl.mp3', ['tiger', 'close'], 1),
        metadata: {
          ...catalogEntry('howl.mp3', ['tiger', 'close'], 1).metadata,
          broad_variation: 'howl',
        },
      },
    ]);

    expect(resolveLibraryCueForWorldCue(growlIntent, loaded)?.public_url)
      .toBe('https://audio.example/a.mp3');
    expect(resolveLibraryCueForWorldCue({
      ...growlIntent,
      variation: 'missing',
    }, loaded)).toBeNull();
  });

  it('persists only the client-safe URL after exact placement and catalog validation', () => {
    const result = resolveWorldCueIntent(
      growlIntent,
      { id: 'block-a', text: 'At dusk the fox growled once.' },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);

    expect(result.moment).toMatchObject({
      blockId: 'block-a',
      triggerPhrase: 'the fox growled',
      occurrenceIndex: 0,
      sourceCategory: 'beasts',
      cue: { publicUrl: expect.stringContaining('/Beasts/Growl/') },
    });
    expect(Object.keys(result.moment.cue)).toEqual(['publicUrl']);
    expect(JSON.stringify(result.moment)).not.toMatch(/file_path|assetId|catalogId|providerId/i);
  });

  it('revalidates persisted URLs and category/variation ownership before rendering', () => {
    expect(resolveResolvedAudioMomentCue(resolvedMoment())).toMatchObject({ ok: true });
    expect(resolveResolvedAudioMomentCue(resolvedMoment({
      cue: { publicUrl: 'https://audio.example/unapproved.mp3' },
    }))).toMatchObject({ ok: false, reason: 'not-found' });
    expect(resolveResolvedAudioMomentCue(resolvedMoment({
      sourceCategory: 'weapons',
    }))).toMatchObject({ ok: false, reason: 'category-mismatch' });
  });
});

describe('World Cue placement and chapter resolution', () => {
  it('uses the requested zero-based exact occurrence and annotates no other mention', () => {
    const text = 'the fox growled, then the fox growled again.';
    const result = resolveWorldCueIntent(
      { ...growlIntent, occurrenceIndex: 1 },
      { id: 'block-a', text },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.message);

    const segments = splitByResolvedAudioMoments(text, [result.moment]);
    expect(segments.filter(segment => segment.moment)).toHaveLength(1);
    expect(segments.map(segment => segment.text).join('')).toBe(text);
    expect(segments.findIndex(segment => segment.moment)).toBe(1);
    expect(segments[0].text).toBe('the fox growled, then ');
  });

  it('counts placement only in the exact text Reader shows after hidden SFX cleanup', () => {
    const block = {
      id: 'block-a',
      text: '[SFX: the fox growled] At dusk the fox growled.',
    };
    expect(resolveWorldCueIntent(growlIntent, block)).toMatchObject({ ok: true });
    expect(resolveWorldCueIntent(
      { ...growlIntent, occurrenceIndex: 1 },
      block,
    )).toMatchObject({ ok: false, reason: 'occurrence-not-found' });

    const chapter = resolveChapterAudioMoments([block], [growlIntent]);
    expect(chapter.issues).toEqual([]);
    expect(chapter.audioMoments).toHaveLength(1);
  });

  it('keeps an event scoped to its referenced block and reports stale placement', () => {
    const blocks = [
      { id: 'block-a', text: 'At dusk the fox growled.' },
      { id: 'block-b', text: 'At dawn the fox growled.' },
    ];
    const resolution = resolveChapterAudioMoments(blocks, [growlIntent]);
    expect(resolution.issues).toEqual([]);
    expect(resolution.audioMoments).toHaveLength(1);
    expect(resolution.audioMoments[0].blockId).toBe('block-a');
    expect(splitByResolvedAudioMoments(blocks[0].text, resolution.audioMoments)
      .some(segment => Boolean(segment.moment))).toBe(true);
    expect(splitByResolvedAudioMoments(blocks[1].text, [])).toEqual([{ text: blocks[1].text }]);

    expect(resolveWorldCueIntent(
      { ...growlIntent, occurrenceIndex: 2 },
      blocks[0],
    )).toMatchObject({ ok: false, reason: 'occurrence-not-found' });
    expect(resolveWorldCueIntent(
      growlIntent,
      { id: 'block-a', text: 'At dusk the fox watched.' },
    )).toMatchObject({ ok: false, reason: 'phrase-not-found' });
  });

  it('can consume block metadata intents and omits anything unresolved', () => {
    const blocks = [{
      id: 'block-a',
      text: 'At dusk the fox growled while Mei Lin reloaded the rifle.',
      metadata: {
        audioMoments: [
          growlIntent,
          {
            ...growlIntent,
            triggerPhrase: 'Mei Lin reloaded the rifle',
            sourceCategory: 'weapons',
            variation: 'reload',
            relatedEntity: undefined,
          },
        ],
      },
    }];
    const loaded = parseLibraryCues([
      catalogEntry('growl.mp3', ['tiger', 'close'], 1),
    ]);
    const resolution = resolveChapterAudioMoments(blocks, undefined, loaded);
    expect(resolution.audioMoments).toHaveLength(1);
    expect(resolution.issues).toHaveLength(1);
    expect(resolution.issues[0]).toMatchObject({ reason: 'unresolved-cue' });
  });

  it('does not migrate structured System Panel sounds into World Cues', () => {
    const resolution = resolveChapterAudioMoments(
      [{
        id: 'block-a',
        text: 'the fox growled.',
        system: { kind: 'warning', title: 'Threat detected' },
      }],
      [growlIntent],
    );
    expect(resolution.audioMoments).toEqual([]);
    expect(resolution.issues).toContainEqual(expect.objectContaining({ reason: 'reserved-block' }));
  });

  it('rejects overlapping persisted placements and caps moments per chapter', () => {
    const overlap = resolveChapterAudioMoments(
      [{ id: 'block-a', text: 'the fox growled loudly.' }],
      [
        growlIntent,
        { ...growlIntent, triggerPhrase: 'fox growled' },
      ],
    );
    expect(overlap.audioMoments).toHaveLength(1);
    expect(overlap.issues).toContainEqual(expect.objectContaining({ reason: 'overlapping-placement' }));

    const manyBlocks = Array.from({ length: 25 }, (_, index) => ({
      id: `block-${index}`,
      text: `the fox growled ${index}.`,
    }));
    const manyIntents = manyBlocks.map(block => ({
      ...growlIntent,
      blockId: block.id,
    }));
    const bounded = resolveChapterAudioMoments(manyBlocks, manyIntents);
    expect(bounded.audioMoments).toHaveLength(24);
    expect(bounded.issues).toContainEqual(expect.objectContaining({
      reason: 'invalid-intent',
      intentIndex: 24,
    }));
  });
});

describe('resolved dialogue audio artifacts', () => {
  it('validates provider-neutral Character audio and places only the exact quote occurrence', () => {
    const moment = dialogueMoment({ occurrenceIndex: 1 });
    const text = 'Mei Lin said, “Stand behind me.” Later she repeated, “Stand behind me.”';

    expect(validateResolvedDialogueAudioMoment(moment)).toEqual({
      ok: true,
      publicUrl: moment.artifact.publicUrl,
    });
    expect(resolvePlayableAudioMoment(moment)).toEqual({
      ok: true,
      publicUrl: moment.artifact.publicUrl,
      actionLabel: 'dialogue audio',
    });
    const segments = splitByResolvedAudioMoments(text, [moment]);
    expect(segments.filter(segment => segment.moment)).toHaveLength(1);
    expect(segments[0].text).toContain('Mei Lin said, “Stand behind me.”');
    expect(segments.map(segment => segment.text).join('')).toBe(text);
  });

  it('requires a synthesized artifact and rejects provider exposure', () => {
    const { artifact: _artifact, ...withoutArtifact } = dialogueMoment();
    expect(validateResolvedDialogueAudioMoment(withoutArtifact))
      .toMatchObject({ ok: false, reason: 'invalid-artifact' });
    expect(validateResolvedDialogueAudioMoment({
      ...dialogueMoment(),
      providerId: 'server-only-provider-id',
    })).toMatchObject({ ok: false, reason: 'provider-exposure' });
    expect(validateResolvedDialogueAudioMoment(dialogueMoment({
      artifact: { publicUrl: 'https://api.elevenlabs.io/v1/audio/private-id' },
    }))).toMatchObject({ ok: false, reason: 'provider-exposure' });
    expect(validateResolvedDialogueAudioMoment(dialogueMoment({
      artifact: { publicUrl: 'https://api.elevenlabs.com/v1/audio/private-id' },
    }))).toMatchObject({ ok: false, reason: 'provider-exposure' });
    expect(validateResolvedDialogueAudioMoment(dialogueMoment({
      artifact: { publicUrl: 'https://audio.example/dialogue/mei-lin/private.mp3' },
    }))).toMatchObject({ ok: false, reason: 'invalid-artifact' });
    expect(Object.keys(dialogueMoment()).sort()).not.toContain('providerId');
  });

  it('rejects narration fragments that are not the exact quoted dialogue', () => {
    expect(validateResolvedDialogueAudioMoment(dialogueMoment({
      triggerPhrase: 'Stand behind me.',
    }))).toMatchObject({ ok: false, reason: 'invalid-dialogue-moment' });
    expect(validateResolvedDialogueAudioMoment(dialogueMoment({
      relatedEntity: { name: 'Vermilion Debt Fox', type: 'creature' } as never,
    }))).toMatchObject({ ok: false, reason: 'invalid-dialogue-moment' });
    expect(validateResolvedDialogueAudioMoment(dialogueMoment({
      relatedEntity: { name: 'Mei Lin', type: 'character' } as never,
    }))).toMatchObject({ ok: false, reason: 'invalid-dialogue-moment' });
  });
});
