import { describe, expect, it } from 'vitest';
import {
  SEN_APPEARANCE_SKILL, SEN_HOLDINGS_SKILL, SEN_NOVEL_AUTHOR_SKILL, SEN_READING_MODE_SKILLS, SEN_SOUND_CUES_SKILL, SEN_SOUNDTRACK_SKILL, SEN_SPEAKERS_SKILL,
  CAPA_SCHEMA, assembleCapaPrompt,
} from '@seihouse/sen/harness-generation';
import { soundtrackVocabulary } from '@seihouse/sen/audio';
import { LIBRARY_BASE_MEDIA, LIBRARY_SOUND_WORDS } from '../../host/media/libraryCatalog';
import { HARNESS_PROMPT_HEADINGS, HARNESS_PROMPT_PARTS, composeHarnessSystemInstruction, composeHarnessUserPrompt } from './prompt';

/** The headings a prompt carries, in order: every line that is one of the skeleton's. */
const headings = (text: string) => text.split('\n').filter(line => line.startsWith('# '));
const HEADINGS = HARNESS_PROMPT_PARTS.map(part => HARNESS_PROMPT_HEADINGS[part]);

const capa = (skills = [SEN_NOVEL_AUTHOR_SKILL, SEN_READING_MODE_SKILLS['Clear Reading'], SEN_SOUND_CUES_SKILL, SEN_SOUNDTRACK_SKILL, SEN_SPEAKERS_SKILL, SEN_HOLDINGS_SKILL, SEN_APPEARANCE_SKILL]) => assembleCapaPrompt({
  capturedAt: 'now', originalLanguage: 'ja', skills,
  soundVocabulary: LIBRARY_SOUND_WORDS, soundtrackVocabulary: soundtrackVocabulary(LIBRARY_BASE_MEDIA),
});

describe('The prompt skeleton (SENSEI, 2026-10-16)', () => {
  it('lays the system instruction out in its parts, each heading once, in order, and nothing before the role', () => {
    const system = composeHarnessSystemInstruction(capa());
    expect(headings(system)).toEqual(HEADINGS.slice(0, 6));
    expect(system.startsWith(`${HARNESS_PROMPT_HEADINGS.role}\n\n`)).toBe(true);
  });

  it('puts every writing skill under How to write and every tag skill under How to tag, never the other way', () => {
    const system = composeHarnessSystemInstruction(capa());
    const write = system.indexOf(HARNESS_PROMPT_HEADINGS.writing);
    const tag = system.indexOf(HARNESS_PROMPT_HEADINGS.tagging);
    const read = system.indexOf(HARNESS_PROMPT_HEADINGS.reading);
    for (const slot of CAPA_SCHEMA) {
      const at = system.indexOf(`CAPA SKILL [${slot.label}]`);
      if (at < 0) continue;
      if (slot.writesTags) expect(at > tag && at < read, slot.label).toBe(true);
      else expect(at > write && at < tag, slot.label).toBe(true);
    }
    const rules = system.indexOf('HARNESS TAG RULES');
    expect(rules > tag && rules < system.indexOf('CAPA SKILL [Sound Cues]')).toBe(true);
    // The official requirements close the writing skills, before the HARNESS writing rules.
    const official = system.indexOf('HARNESS OFFICIAL OUTPUT REQUIREMENTS');
    expect(official > write && official < system.indexOf('HARNESS WRITING RULES') && official < tag).toBe(true);
  });

  it('leaves How to tag out when no skill teaches a tag', () => {
    expect(headings(composeHarnessSystemInstruction(capa([SEN_NOVEL_AUTHOR_SKILL])))).toEqual(HEADINGS.slice(0, 6).filter(heading => heading !== HARNESS_PROMPT_HEADINGS.tagging));
  });

  it('keeps a prompt frozen before the halves were marked whole under How to write', () => {
    const { taggingStart: _start, ...frozen } = capa();
    const system = composeHarnessSystemInstruction(frozen);
    expect(headings(system)).not.toContain(HARNESS_PROMPT_HEADINGS.tagging);
    expect(system).toContain(`${HARNESS_PROMPT_HEADINGS.writing}\n\n${frozen.text}`);
  });

  it('lays the next message out as the story information, this chapter, then the Mission Reminder last', () => {
    const user = composeHarnessUserPrompt({ story: ['CURRENT STORY INFORMATION\n{}'], request: 'IMMEDIATE CHAPTER REQUEST', reminder: 'You are the author of this novel.' });
    expect(headings(user)).toEqual(HEADINGS.slice(6));
    expect(user.endsWith('You are the author of this novel.')).toBe(true);
  });
});
