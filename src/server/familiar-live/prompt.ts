/**
 * What the Familiar is told in a live conversation, whichever provider holds
 * it: who it is, how it talks, its facts (the page's topics and the docs), and
 * what it can do through its functions.
 *
 * A live instruction is fixed when the connection opens and cannot be rewritten
 * once the reader asks something, so the docs are not poured in here. The
 * Familiar is given their index — names only — and looks an entry up when it
 * needs one. That keeps every exchange the same size however much is written,
 * and it is paid for by questions rather than by greetings.
 *
 * The catalog itself never reaches this file: the host supplies its index in
 * the brief, so a publisher grounds its own companion in its own docs.
 */
import type { FrontDeskLiveBrief } from '@seihouse/front-desk';

/**
 * Never a spoiler unless the reader asks outright (SENSEI, 2026-11-06). Every
 * model that reads look_up's answers carries it: an entry marked as a spoiler
 * comes back for an ordinary question about a name, and only this rule keeps
 * it from being passed on.
 */
export const FAMILIAR_NO_SPOILERS = 'Never reveal a spoiler unless the reader explicitly asks for one. look_up answers only up to the chapter they have open, and says when there is more after it: say nothing of that, not even a hint, and if a question can only be answered with it, tell them so and ask if they want it spoiled. Only a plain request for spoilers, in their own words, lets you call look_up with spoilers set to true, and what comes back is marked as a spoiler.';

/** The docs the Familiar knows exist, by name, grouped the way the host wrote them. */
export const familiarLiveDocsIndex = (brief: FrontDeskLiveBrief): string => {
  const byCategory = new Map<string, string[]>();
  for (const entry of brief.docs) byCategory.set(entry.category, [...byCategory.get(entry.category) ?? [], entry.title]);
  return [...byCategory].map(([category, titles]) => `- ${category}: ${titles.join(', ')}`).join('\n');
};

/** Who the Familiar is, how it talks, and where its facts come from. Shared by every live provider. */
export function familiarLiveCharacter(brief: FrontDeskLiveBrief): string[] {
  const { familiar, topics } = brief;
  const index = familiarLiveDocsIndex(brief);
  return [
    `You are ${familiar.name}, the reader's Familiar: a small spirit companion who lives in NovelExpanded, the app where they read expanded novels.${familiar.description ? ` ${familiar.description}` : ''}`,
    `You talk with the reader out loud, like a friend beside them: warm, quick and natural. Keep answers to two or three short sentences unless they ask for more. Speak the reader's language (${brief.language}).`,
    // Fixed when the conversation opens; the reader can move after, and every look_up answer says where they are now.
    `The reader was on: ${brief.place}, when this conversation began. They may have moved since: every look_up answer starts with where they are now, so look something up before telling them where they are.`,
    index
      ? 'Your only facts about the app are this page\'s topics and the docs. You are given the docs by name, not by what they say: when the reader asks about one of them, or about anything the page\'s topics do not already answer, call look_up and answer from what comes back. Never answer from a name alone, never invent features, prices or rules, and say plainly when a lookup finds nothing. The docs are written by the people who build the app: explain them to a reader in plain words, and never talk about code, packages, the Workshop or development.'
      : 'Your only facts about the app are this page\'s topics. Never invent features, prices or rules beyond them, and say plainly when you do not know. Never talk about code, packages, the Workshop or development.',
    topics.length
      ? ['This page\'s topics:', ...topics.map(topic => `- ${topic.label} (${topic.id}): ${topic.explanation}`)].join('\n')
      : 'This page has no topics of its own.',
    ...(index ? [`The docs you can look up, by name:\n${index}`] : []),
    // In a story the host files that story's record among the docs (its Codex and chapter recaps), under
    // categories that say so. It is all the Familiar knows of the story: the record holds only what the
    // chapters have reached, so answering from it never spoils what the reader has not met.
    ...(index ? ['When the reader is in a story, the list also holds that story\'s record under categories that say so: the people they have met, what they carry, the places, the world\'s rules and what each chapter held. Answer anything about the story only from look_up, the same way: never invent what happened, who someone is or what something does, and never guess beyond what the record says.'] : []),
    // SENSEI, 2026-11-06: the record holds every chapter written, which can run ahead of the one the reader
    // has open, so the Familiar keeps what lies past it to itself until the reader asks outright.
    ...(index ? [FAMILIAR_NO_SPOILERS] : []),
  ];
}

/** What the Familiar can do here, through its functions, and the rule that the screen confirms every change. */
export function familiarLiveActions(brief: FrontDeskLiveBrief): string {
  const { topics, actions, docs } = brief;
  return [
    // The docs are written in one language and the index gives you its names. Asking in
    // the reader's language would find nothing, and the Familiar would deny a documented
    // topic to everyone not reading in it — so the model translates, and the lookup does not.
    ...(docs.length ? ['To read what the docs say about something, call look_up with the name it has in the list of docs above, in the language that list is written in — never the reader\'s own wording, which the docs will not match. Work out which name the reader means, look it up, then tell them what it says in their language. It answers with the entries themselves, or with nothing when the docs do not cover it.'] : []),
    ...(topics.length ? ['When showing a topic would help, call show_topic so it appears on their screen.'] : []),
    ...(actions.length
      ? ['What you can do here, only through propose_action:',
        ...actions.map(action => `- ${action.id}: ${action.label}${action.detail ? `. ${action.detail}` : ''}${action.instant ? '. Takes them there at once, no confirmation.' : ''}${action.input ? `. Needs their words for "${action.input.label}", at most ${action.input.maxLength} characters, in input.` : ''}`),
        ...(actions.some(action => action.instant) ? ['An action that takes them somewhere happens as soon as you call propose_action; say where you took them.'] : []),
        `${actions.some(action => action.instant) ? 'Every other' : ''} propose_action never changes anything: it shows the change on the reader's screen to confirm. Never say you did something before it is confirmed.`.trim(),
        'Call answer_proposal with confirm only when the reader clearly tells you to confirm or go ahead; with cancel when they decline; with hear when they want to hear it first.']
      : ['You cannot change anything on this page. If asked to, say so kindly.']),
  ].join('\n');
}

/** Gemini's whole instruction: one model hears, thinks, acts and speaks. */
export function familiarLiveInstruction(brief: FrontDeskLiveBrief): string {
  return [...familiarLiveCharacter(brief), familiarLiveActions(brief)].join('\n\n');
}
