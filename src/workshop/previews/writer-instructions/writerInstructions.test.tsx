import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HARNESS_PROMPT_HEADINGS } from '../../../server/harness-generation/prompt';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { OFFICIAL_STYLE_REFERENCES, installOfficialCapaSkillsInMemory } from '../../../host/generation/capa/officialCapaSkills';
import { EVERY_CHAPTER, PIPELINE, RETIRED_WRITER_INSTRUCTIONS, WHOLE_PROMPTS, WRITER_INSTRUCTIONS, fingerprintText, officialWriterSkills, writerSystemInstruction } from './writerInstructions';
import { WRITER_INSTRUCTIONS_HISTORY, lastChange } from './writerInstructionsHistory';
import { ReadableText, WriterInstructionsWorkspace } from './WriterInstructionsWorkspace';

const block = (id: string) => EVERY_CHAPTER.find(item => item.id === id)!;

describe('Writer Instructions', () => {
  it('never lets the words the writer reads change without a dated entry in the history', () => {
    for (const { id, title, text } of WRITER_INSTRUCTIONS) {
      const fingerprint = fingerprintText(text);
      expect(lastChange(id)?.changed[id], [
        `The ${title} instructions changed.`,
        'Add an entry at the top of WRITER_INSTRUCTIONS_HISTORY (src/workshop/previews/writer-instructions/writerInstructionsHistory.ts)',
        `with today's date, what changed and why in plain words, and '${id}': '${fingerprint}'.`,
      ].join(' ')).toBe(fingerprint);
    }
  });

  it('keeps a well-formed history: real dates, newest first, a plain summary, known blocks', () => {
    const ids = new Set([...WRITER_INSTRUCTIONS.map(item => item.id), ...RETIRED_WRITER_INSTRUCTIONS.keys()]);
    let previous = '9999-12-31';
    for (const change of WRITER_INSTRUCTIONS_HISTORY) {
      expect(change.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(`${change.date}T00:00:00Z`))).toBe(false);
      expect(change.date <= previous, `${change.date} is out of order: newest first`).toBe(true);
      previous = change.date;
      expect(change.summary.trim().length).toBeGreaterThan(20);
      expect(Object.keys(change.changed).length).toBeGreaterThan(0);
      for (const id of Object.keys(change.changed)) expect(ids.has(id as never), id).toBe(true);
    }
  });

  it('shows what a Novel Expanded story\'s writer reads: the official CAPA skills from their packages, each under its part', async () => {
    const installed = await installOfficialCapaSkillsInMemory(async definition =>
      new Uint8Array(await readFile(path.resolve(__dirname, '../../../host/generation/capa/official-capa', definition.archiveFile))));
    for (const style of ['chinese', 'japanese', 'korean'] as const) {
      const skills = officialWriterSkills(installed, style);
      // Author, Pacing, Continuity and the story's Style: the loadout a story made from its Story Seed starts with.
      expect(skills.map(skill => skill.slot)).toEqual(['author', 'pacing', 'continuity', 'style']);
      const whole = writerSystemInstruction(skills);
      const order = [
        HARNESS_PROMPT_HEADINGS.role, block('role').text,
        HARNESS_PROMPT_HEADINGS.writing, ...skills.map(skill => skill.instructions!.trim()), block('writing-rules').text,
        HARNESS_PROMPT_HEADINGS.reading, block('reading-guide').text,
        HARNESS_PROMPT_HEADINGS.returning, block('return-format').text,
        HARNESS_PROMPT_HEADINGS.hardRules, block('hard-rules').text,
      ];
      let at = 0;
      for (const piece of order) {
        const found = whole.indexOf(piece, at);
        expect(found, piece.slice(0, 60)).toBeGreaterThanOrEqual(at);
        at = found + piece.length;
      }
    }
    // The SEN Author is no longer shown as every story's: Novel Expanded's stories read CAPA AUTHOR.
    expect(EVERY_CHAPTER.some(item => item.id === 'author')).toBe(false);
    expect(EVERY_CHAPTER.every(item => item.part)).toBe(true);
  });

  it('builds every other step\'s whole prompt with the code that sends it, every block of the step inside it', () => {
    for (const step of PIPELINE.filter(item => item.id !== 'writer')) {
      const whole = WHOLE_PROMPTS[step.id as Exclude<typeof step.id, 'writer'>].map(message => message.text).join('\n\n');
      for (const item of step.groups.flatMap(group => group.blocks)) {
        for (const line of item.text.split('\n').filter(Boolean)) expect(whole, `${step.id}: ${item.id}`).toContain(line);
      }
    }
  });

  it('puts every block in exactly one step of the pipeline', () => {
    const placed = PIPELINE.flatMap(step => step.groups.flatMap(group => group.blocks.map(item => item.id)));
    expect([...placed].sort()).toEqual(WRITER_INSTRUCTIONS.map(item => item.id).sort());
    expect(new Set(placed).size).toBe(placed.length);
  });

  it('opens on the Tagger, with every tag it reads one tap away, and the Chapter tagger\'s own words shown', () => {
    const markup = renderToStaticMarkup(createElement(WriterInstructionsWorkspace));
    expect(markup).toContain('<h1>What the Models Read</h1>');
    for (const step of PIPELINE) expect(markup).toContain(`data-view="${step.id}"`);
    expect(markup).toContain('data-view="changes"');
    expect(markup).toContain('data-step="tagger"');
    for (const id of ['tagger', 'tag-rules', 'speakers', 'holdings', 'appearance', 'status', 'place', 'sound-cues', 'soundtrack']) expect(markup).toContain(`data-block="${id}"`);
    expect(markup).toContain('data-block="all"');
    expect(markup).toContain('data-instruction="all"');
    expect(markup).toContain('All, as one prompt');
    expect(markup).toContain('Exactly as the model sees it');
  });

  it('reopens the style a saved link to a Style skill was made in (review finding, Codex, 2026-11-05)', () => {
    const saved = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { hash: `#writer/${encodeURIComponent(OFFICIAL_STYLE_REFERENCES.korean.id)}` } } });
    try {
      const markup = renderToStaticMarkup(createElement(WriterInstructionsWorkspace));
      expect(markup).toMatch(/aria-checked="true"[^>]*data-style="korean"/);
    } finally {
      if (saved) Object.defineProperty(globalThis, 'window', saved);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });

  it('lays the text out for a person without losing a word of it', () => {
    const plain = (html: string) => html.replace(/<\/(p|h4|div|span)>/g, ' ').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#x27;/g, '\'').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ');
    for (const { id, text } of WRITER_INSTRUCTIONS) {
      const shown = plain(renderToStaticMarkup(createElement(ReadableText, { text })));
      for (const line of text.split('\n').map(item => item.trim()).filter(Boolean)) {
        if (/^Example:\s*\{/.test(line)) {
          // An example note is read out field by field: its words and its tag are both there.
          for (const piece of line.replace(/^Example:\s*/, '').split(/(\{[^{}]*\})/).map(item => item.trim()).filter(Boolean)) {
            if (!piece.startsWith('{')) { expect(shown, `${id}: ${line}`).toContain(piece.replace(/^\((.*)\)$/, '$1')); continue; }
            const note = JSON.parse(piece) as { words?: string; tag: string };
            expect(shown, `${id}: ${line}`).toContain(note.tag);
            if (note.words) expect(shown, `${id}: ${line}`).toContain(note.words);
          }
          continue;
        }
        expect(shown, `${id}: ${line}`).toContain(line.replace(/^[-•]\s/, '').replace(/\s+/g, ' ').replace(/^([A-Z][A-Z0-9 ,'’&()/-]{2,}):\s+/, '$1: '));
      }
    }
  });
});
