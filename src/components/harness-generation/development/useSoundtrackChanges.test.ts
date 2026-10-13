import { describe, expect, it } from 'vitest';
import type { SoundtrackChangeAttachment } from '@seihouse/sen/audio';
import { readerSceneAt } from './useSoundtrackChanges';

const anchor = (blockId: string, startOffset: number, selectedText: string) =>
  ({ level: 'span' as const, blockId, startOffset, endOffset: startOffset + selectedText.length, selectedText });
const battle: SoundtrackChangeAttachment = { id: 'battle', kind: 'soundscape-change', anchor: anchor('c1-p3', 0, 'Drums'), payload: { pieceId: 'war-2' } };
const storm: SoundtrackChangeAttachment = { id: 'storm', kind: 'atmosphere-change', anchor: anchor('c1-p5', 4, 'rain'), payload: { atmosphereId: 'storm-1' } };
const writer = { soundscape: 'mystical', atmosphere: 'forest-1' };

describe('The scene at the reader\'s place', () => {
  it('opens with the writer\'s scene, or the reader\'s own opening in its place, each sound on its own', () => {
    expect(readerSceneAt({ chapter: {}, scene: writer, reached: new Set() })).toEqual(writer);
    // The reader chose the opening music only: the writer's atmosphere stays.
    expect(readerSceneAt({ chapter: { openingSound: { soundscape: { pieceId: 'calm-3' } } }, scene: writer, reached: new Set() }))
      .toEqual({ soundscape: 'mystical', piece: 'calm-3', atmosphere: 'forest-1' });
  });

  it('changes the music and the atmosphere separately, once each change is reached', () => {
    const chapter = { soundtrackChanges: [battle, storm] };
    expect(readerSceneAt({ chapter, scene: writer, reached: new Set() })).toEqual(writer);
    expect(readerSceneAt({ chapter, scene: writer, reached: new Set(['battle']) })).toEqual({ ...writer, piece: 'war-2' });
    expect(readerSceneAt({ chapter, scene: writer, reached: new Set(['battle', 'storm']) })).toEqual({ ...writer, piece: 'war-2', atmosphere: 'storm-1' });
    // Back above the change, the opening plays again.
    expect(readerSceneAt({ chapter, scene: writer, reached: new Set(['storm']) })).toEqual({ ...writer, atmosphere: 'storm-1' });
  });
});
