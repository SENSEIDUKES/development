import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HARNESS_PROMPT_HEADINGS } from '../../../server/harness-generation/prompt';
import { EVERY_CHAPTER, RETIRED_WRITER_INSTRUCTIONS, WRITER_INSTRUCTIONS, defaultSystemInstruction, fingerprintText } from './writerInstructions';
import { WRITER_INSTRUCTIONS_HISTORY, lastChange } from './writerInstructionsHistory';
import { WriterInstructionsWorkspace } from './WriterInstructionsWorkspace';

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

  it('shows exactly what a default story\'s writer reads, in the order it reads it, each block under its part\'s heading', () => {
    const skill = (id: string, label: string) => `CAPA SKILL [${label}] — ${block(id).source}\n${block(id).text}`;
    expect(defaultSystemInstruction()).toBe([
      HARNESS_PROMPT_HEADINGS.role, block('role').text,
      HARNESS_PROMPT_HEADINGS.writing, skill('author', 'Author'), block('writing-rules').text,
      HARNESS_PROMPT_HEADINGS.tagging, block('tag-rules').text,
      skill('sound-cues', 'Sound Cues'),
      skill('soundtrack', 'Soundtrack'),
      skill('speakers', 'Speakers'),
      skill('holdings', 'Holdings'),
      skill('appearance', 'Appearance'),
      HARNESS_PROMPT_HEADINGS.reading, block('reading-guide').text,
      HARNESS_PROMPT_HEADINGS.returning, block('return-format').text,
      HARNESS_PROMPT_HEADINGS.hardRules, block('hard-rules').text,
    ].join('\n\n'));
    // Every block of every chapter belongs to one part, and the page lists them part by part.
    expect(EVERY_CHAPTER.every(item => item.part)).toBe(true);
  });

  it('renders every block with its words, version and last change, the tag blocks open, then the history', () => {
    const markup = renderToStaticMarkup(createElement(WriterInstructionsWorkspace));
    expect(markup).toContain('<h1>Writer Instructions</h1>');
    for (const { id, source } of WRITER_INSTRUCTIONS) {
      expect(markup).toContain(`data-instruction="${id}"`);
      expect(markup).toContain(source);
    }
    for (const id of ['tag-rules', 'sound-cues', 'soundtrack', 'speakers', 'holdings', 'appearance']) expect(markup).toMatch(new RegExp(`<details[^>]*open=""[^>]*data-instruction="${id}"`));
    expect(markup).not.toMatch(/<details[^>]*open=""[^>]*data-instruction="reading-guide"/);
    for (const heading of ['# ROLE AND MISSION', '# HOW TO WRITE', '# HOW TO TAG', '# HOW TO READ THE STORY INFORMATION', '# HOW TO RETURN THE CHAPTER', '# HARD RULES']) expect(markup).toContain(heading);
    expect(markup).toContain('Every paragraph with a quotation mark starts with a speaker tag naming a real character.');
    expect(markup.replace(/<[^>]+>/g, '')).toContain('SEN Speakers v2.1.0 · 128 words · changed 2026-10-06');
    expect(markup).toMatch(/<time datetime="2026-10-04">2026-10-04<\/time>/i);
  });
});
