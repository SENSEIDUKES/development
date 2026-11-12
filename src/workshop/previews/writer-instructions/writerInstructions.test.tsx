import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HARNESS_PROMPT_HEADINGS } from '../../../server/harness-generation/prompt';
import { buildHarnessTagPrompt } from '../../../server/harness-generation/tagger';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { OFFICIAL_STYLE_REFERENCES, installOfficialCapaSkillsInMemory } from '../../../host/generation/capa/officialCapaSkills';
import { MISSION_REMINDER_OPENING } from '@seihouse/sen/harness-generation';
import { EVERY_CHAPTER, PIPELINE, RETIRED_WRITER_INSTRUCTIONS, WHOLE_PROMPTS, WRITER_INSTRUCTIONS, fingerprintText, officialWriterSkills, writerPrompt, writerSystemInstruction } from './writerInstructions';
import { WRITER_INSTRUCTIONS_HISTORY, lastChange } from './writerInstructionsHistory';
import { ReadableText, WriterInstructionsWorkspace, restyledBlock } from './WriterInstructionsWorkspace';

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
      expect(skills.at(-1)).toMatchObject({ id: OFFICIAL_STYLE_REFERENCES[style].id, version: OFFICIAL_STYLE_REFERENCES[style].version });
      // The whole prompt carries the request's and the Mission Reminder's own fixed lines, and the answer's shape (review finding, CodeRabbit, 2026-11-05).
      const [instructions, next, shape] = writerPrompt(skills);
      expect(instructions.text).toBe(writerSystemInstruction(skills));
      expect(next.text).toContain('Write the next chapter now. Return only the requested JSON object.');
      expect(next.text).toContain(MISSION_REMINDER_OPENING);
      expect(JSON.parse(shape.text)).toHaveProperty('properties.paragraphs');
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
    // Every message is there: who it is or its instructions, the next message, and the answer's shape (the Blueprint's too: review finding, Codex, 2026-11-05).
    expect(Object.fromEntries(Object.entries(WHOLE_PROMPTS).map(([id, messages]) => [id, messages.length]))).toEqual({ spark: 3, world: 3, tagger: 3, fixer: 3, look: 3 });
    // A changing number or language is shown by its place, never as a fixed word (review finding, CodeRabbit, 2026-11-05).
    for (const id of ['tagger', 'fixer', 'look'] as const) expect(WHOLE_PROMPTS[id][1].text).toMatch(/^CHAPTER ⟨number⟩ · Language: ⟨language⟩/);
    expect(WHOLE_PROMPTS.tagger[1].text).toContain('⟨number⟩ paragraphs');
    // Each fixer case and look subject is laid out as the model reads it.
    expect(WHOLE_PROMPTS.fixer[1].text).toMatch(/CASE ⟨case id⟩ · answers: record, prose, fine, major\nProblems:/);
    expect(WHOLE_PROMPTS.look[1].text).toMatch(/SUBJECT ⟨id⟩ · ⟨name⟩ · a character · first appearance\nPassage:/);
    for (const step of PIPELINE.filter(item => item.id !== 'writer')) {
      const whole = WHOLE_PROMPTS[step.id as Exclude<typeof step.id, 'writer'>].map(message => message.text).join('\n\n');
      // What a story with no cards reads in place of two blocks is checked against its own prompt, below.
      for (const item of step.groups.flatMap(group => group.blocks).filter(block => !block.id.endsWith('-without-cards'))) {
        for (const line of item.text.split('\n').filter(Boolean)) expect(whole, `${step.id}: ${item.id}`).toContain(line);
      }
    }
  });

  it('shows what the tagger reads in a story with no cards, built by the code that sends it', () => {
    const prompt = buildHarnessTagPrompt({
      operation: 'tag-chapter', storyId: '', chapterId: '', chapterNumber: 1, model: '', language: 'English',
      paragraphs: ['A paragraph.'], subjects: [{ kind: 'character', name: 'Someone' }],
    });
    const instead = WRITER_INSTRUCTIONS.filter(item => item.id.endsWith('-without-cards'));
    expect(instead.map(item => item.id)).toEqual(['tag-rules-without-cards', 'appearance-without-cards']);
    for (const item of instead) expect(prompt.systemInstruction, item.id).toContain(item.text);
    // And never the words a story with cards reads in their place.
    for (const id of ['tag-rules', 'appearance']) expect(prompt.systemInstruction, id).not.toContain(WRITER_INSTRUCTIONS.find(item => item.id === id)!.text);
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
    // How the answer's shape reaches Claude and MiniMax models is said on the page (review finding, CodeRabbit, 2026-11-05).
    expect(markup).toContain('Return only the JSON answer, without Markdown fences.');
    expect(markup).toContain('Exactly as the model sees it');
  });

  it('reopens the style a saved link to a Style skill was made in (review finding, Codex, 2026-11-05)', () => {
    const saved = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { hash: `#writer/${encodeURIComponent(OFFICIAL_STYLE_REFERENCES.korean.id)}` } } });
    try {
      const markup = renderToStaticMarkup(createElement(WriterInstructionsWorkspace));
      expect(markup).toContain('data-style="korean"');
      expect(markup).toMatch(/wi-stepper__value[^>]*>Korean</);
    } finally {
      if (saved) Object.defineProperty(globalThis, 'window', saved);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });

  it('opens on a broken address instead of breaking the page (review finding, CodeRabbit, 2026-11-05)', () => {
    const saved = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location: { hash: '#writer/%E0%A4%A/japanese' } } });
    try {
      const markup = renderToStaticMarkup(createElement(WriterInstructionsWorkspace));
      expect(markup).toContain('data-step="writer"');
      expect(markup).toMatch(/wi-stepper__value[^>]*>Japanese</);
    } finally {
      if (saved) Object.defineProperty(globalThis, 'window', saved);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });

  it('keeps an open Style skill open when the story style changes (review finding, Codex, 2026-11-05)', () => {
    expect(restyledBlock(OFFICIAL_STYLE_REFERENCES.chinese.id, 'japanese')).toBe(OFFICIAL_STYLE_REFERENCES.japanese.id);
    expect(restyledBlock('all', 'korean')).toBe('all');
    expect(restyledBlock('role', 'korean')).toBe('role');
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
