import { describe, expect, it } from 'vitest';
import type { StoryBlock } from '@seihouse/sen/contracts';
import { buildNarrationChunks } from './webSpeechNarration';

const block = (id: string, text: string, extra: Partial<StoryBlock> = {}): StoryBlock => ({ id, type: 'narration', text, ...extra });

describe('buildNarrationChunks', () => {
  it('addresses each spoken block by its rendered index and skips empty blocks', () => {
    const chunks = buildNarrationChunks({ blocks: [
      block('a', 'The gate opened.'),
      block('b', '   '),
      block('c', '"Run," Lin said.', { type: 'dialogue', metadata: { speakerRole: 'main_character' } }),
      block('d', '"Stay," the elder said.', { type: 'dialogue', metadata: { speakerRole: 'mentor' } }),
    ] }, null);
    expect(chunks).toEqual([
      { paragraphIndex: 0, text: 'The gate opened.', role: 'narrator' },
      { paragraphIndex: 2, text: '"Run," Lin said.', role: 'protagonist' },
      { paragraphIndex: 3, text: '"Stay," the elder said.', role: 'side' },
    ]);
  });

  it('speaks only reader-visible text', () => {
    const chunks = buildNarrationChunks({ blocks: [block('a', 'Thunder rolled. [SFX: thunder]')] }, null);
    expect(chunks.map(chunk => chunk.text).join(' ')).not.toContain('SFX');
  });

  it('splits long paragraphs into sentence-sized pieces that appear verbatim in the paragraph', () => {
    const sentence = 'The spirit river carried lanterns past the sleeping sect while the elders watched from the bridge. ';
    const text = sentence.repeat(6).trim();
    const chunks = buildNarrationChunks({ blocks: [block('a', text)] }, null);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(240);
      expect(text).toContain(chunk.text);
      expect(chunk.paragraphIndex).toBe(0);
    }
  });

  it('speaks the displayed translation aligned to the same blocks', () => {
    const chunks = buildNarrationChunks({ blocks: [block('a', 'Hello.'), block('b', ''), block('c', 'Goodbye.')] }, 'Hola.\n\nAdiós.');
    expect(chunks).toEqual([
      { paragraphIndex: 0, text: 'Hola.', role: 'narrator' },
      { paragraphIndex: 2, text: 'Adiós.', role: 'narrator' },
    ]);
  });

  it('falls back to prose paragraphs when a chapter has no blocks', () => {
    expect(buildNarrationChunks({ generatedContent: 'One.\n\nTwo.' }, null)).toEqual([
      { paragraphIndex: 0, text: 'One.', role: 'narrator' },
      { paragraphIndex: 1, text: 'Two.', role: 'narrator' },
    ]);
  });
});
