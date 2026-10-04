import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EVERY_CHAPTER, WRITER_INSTRUCTIONS, defaultSystemInstruction, fingerprintText } from './writerInstructions';
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
    const ids = new Set(WRITER_INSTRUCTIONS.map(item => item.id));
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

  it('shows exactly what a default story\'s writer reads, in the order it reads it', () => {
    const skill = (id: string, label: string) => `CAPA SKILL [${label}] — ${block(id).source}\n${block(id).text}`;
    expect(defaultSystemInstruction()).toBe([
      skill('author', 'Author'),
      block('tag-rules').text,
      skill('sound-cues', 'Sound Cues'),
      skill('speakers', 'Speakers'),
      skill('holdings', 'Holdings'),
      block('response-contract').text,
    ].join('\n\n'));
  });

  it('renders every block with its words, version and last change, the tag blocks open, then the history', () => {
    const markup = renderToStaticMarkup(createElement(WriterInstructionsWorkspace));
    expect(markup).toContain('<h1>Writer Instructions</h1>');
    for (const { id, source } of WRITER_INSTRUCTIONS) {
      expect(markup).toContain(`data-instruction="${id}"`);
      expect(markup).toContain(source);
    }
    for (const id of ['tag-rules', 'sound-cues', 'speakers', 'holdings']) expect(markup).toMatch(new RegExp(`<details[^>]*open=""[^>]*data-instruction="${id}"`));
    expect(markup).not.toMatch(/<details[^>]*open=""[^>]*data-instruction="response-contract"/);
    expect(markup).toContain('Every paragraph with a quotation mark starts with a speaker tag.');
    expect(markup.replace(/<[^>]+>/g, '')).toContain('SEN Speakers v2.0.0 · 102 words · changed 2026-10-04');
    expect(markup).toMatch(/<time datetime="2026-10-04">2026-10-04<\/time>/i);
  });
});
