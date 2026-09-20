import type { CapaPrompt, HarnessMissionReminder } from '../../../narrative/generation';

/** The Mission Reminder stays a few lines long; it is a reminder, not a second Author skill. */
export const MISSION_REMINDER_EXCERPT_LIMIT = 400 as const;
export const MISSION_REMINDER_TEXT_LIMIT = 600 as const;

export const MISSION_REMINDER_OPENING = 'MISSION REMINDER: You are the author of this novel, writing the chapter requested below.';

const AUTHOR_HEADER = /^CAPA SKILL \[Author\] — (.+?) v(\S+)$/m;
const SECTION_BOUNDARY = /^(?:CAPA SKILL \[|HARNESS OFFICIAL OUTPUT REQUIREMENTS$)/m;

const excerptOf = (section: string) => {
  const lines = section.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  let excerpt = '';
  for (const line of lines) {
    const candidate = excerpt ? `${excerpt} ${line}` : line;
    if (candidate.length > MISSION_REMINDER_EXCERPT_LIMIT) break;
    excerpt = candidate;
  }
  if (!excerpt && lines[0]) excerpt = `${lines[0].slice(0, MISSION_REMINDER_EXCERPT_LIMIT - 1)}…`;
  return excerpt;
};

/**
 * Builds the Mission Reminder from a frozen CAPA Prompt. It copies only the
 * opening of the Author skill's own instructions: no story state is read, no
 * goals are created, and no model is called. The reminder is not part of any
 * provider request yet; a later packet-assembly change decides where it goes.
 */
export const buildMissionReminder = (capaPrompt: Pick<CapaPrompt, 'text' | 'skills'>): HarnessMissionReminder => {
  const header = capaPrompt.text.match(AUTHOR_HEADER);
  const author = capaPrompt.skills.find(skill => skill.slot === 'author' && skill.authoring);
  if (!header || header.index === undefined || !author) {
    throw new Error('The Mission Reminder needs an equipped Author skill in the assembled CAPA Prompt.');
  }
  const start = header.index + header[0].length;
  const rest = capaPrompt.text.slice(start);
  const boundary = rest.search(SECTION_BOUNDARY);
  const section = boundary >= 0 ? rest.slice(0, boundary) : rest;
  const excerpt = excerptOf(section);
  const text = [MISSION_REMINDER_OPENING, excerpt ? `Your equipped Author skill (${author.name} v${author.version}) reminds you: ${excerpt}` : `Your equipped Author skill is ${author.name} v${author.version}.`]
    .join('\n').slice(0, MISSION_REMINDER_TEXT_LIMIT);
  return { text, sourceSkill: { id: author.id, version: author.version, name: author.name } };
};
