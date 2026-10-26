import { describe, expect, it } from 'vitest';
import {
  SEN_NOVEL_AUTHOR_SKILL, SEN_READING_MODE_SKILLS,
  CAPA_SCHEMA, assembleCapaPrompt,
} from '@seihouse/sen/harness-generation';
import { HARNESS_PROMPT_HEADINGS, HARNESS_PROMPT_PARTS, composeHarnessSystemInstruction, composeHarnessUserPrompt } from './prompt';

/** The headings a prompt carries, in order: every line that is one of the skeleton's. */
const headings = (text: string) => text.split('\n').filter(line => line.startsWith('# '));
const HEADINGS = HARNESS_PROMPT_PARTS.map(part => HARNESS_PROMPT_HEADINGS[part]);

const capa = (skills = [SEN_NOVEL_AUTHOR_SKILL, SEN_READING_MODE_SKILLS['Clear Reading']]) => assembleCapaPrompt({
  capturedAt: 'now', originalLanguage: 'ja', skills,
});

describe('The prompt skeleton (SENSEI, 2026-10-16)', () => {
  it('lays the system instruction out in its parts, each heading once, in order, and nothing before the role', () => {
    const system = composeHarnessSystemInstruction(capa());
    expect(headings(system)).toEqual(HEADINGS.slice(0, 5));
    expect(system.startsWith(`${HARNESS_PROMPT_HEADINGS.role}\n\n`)).toBe(true);
  });

  it('puts every writing skill under How to write, and the skeleton has no tag part', () => {
    const system = composeHarnessSystemInstruction(capa());
    const write = system.indexOf(HARNESS_PROMPT_HEADINGS.writing);
    const read = system.indexOf(HARNESS_PROMPT_HEADINGS.reading);
    for (const slot of CAPA_SCHEMA) {
      const at = system.indexOf(`CAPA SKILL [${slot.label}]`);
      if (at < 0) continue;
      expect(at > write && at < read, slot.label).toBe(true);
    }
    // The official requirements close the writing skills, before the HARNESS writing rules.
    const official = system.indexOf('HARNESS OFFICIAL OUTPUT REQUIREMENTS');
    expect(official > write && official < system.indexOf('HARNESS WRITING RULES')).toBe(true);
    // The tag teaching left the writer with the tagger (SENSEI, 2026-10-24).
    expect(HARNESS_PROMPT_PARTS).not.toContain('tagging');
    expect(system).not.toContain('HOW TO TAG');
  });

  it('lays the next message out as the story information, this chapter, then the Mission Reminder last', () => {
    const user = composeHarnessUserPrompt({ story: ['CURRENT STORY INFORMATION\n{}'], request: 'IMMEDIATE CHAPTER REQUEST', reminder: 'You are the author of this novel.' });
    expect(headings(user)).toEqual(HEADINGS.slice(5));
    expect(user.endsWith('You are the author of this novel.')).toBe(true);
  });
});
