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
import type { FamiliarLiveBrief } from '@seihouse/library/familiar';

/** The docs the Familiar knows exist, by name, grouped the way the host wrote them. */
export const familiarLiveDocsIndex = (brief: FamiliarLiveBrief): string => {
  const byCategory = new Map<string, string[]>();
  for (const entry of brief.docs) byCategory.set(entry.category, [...byCategory.get(entry.category) ?? [], entry.title]);
  return [...byCategory].map(([category, titles]) => `- ${category}: ${titles.join(', ')}`).join('\n');
};

/** Who the Familiar is, how it talks, and where its facts come from. Shared by every live provider. */
export function familiarLiveCharacter(brief: FamiliarLiveBrief): string[] {
  const { familiar, topics } = brief;
  const index = familiarLiveDocsIndex(brief);
  return [
    `You are ${familiar.name}, the reader's Familiar: a small spirit companion who lives in NovelExpanded, the app where they read expanded novels.${familiar.description ? ` ${familiar.description}` : ''}`,
    `You talk with the reader out loud, like a friend beside them: warm, quick and natural. Keep answers to two or three short sentences unless they ask for more. Speak the reader's language (${brief.language}).`,
    `The reader is on: ${brief.place}.`,
    index
      ? 'Your only facts about the app are this page\'s topics and the docs. You are given the docs by name, not by what they say: when the reader asks about one of them, or about anything the page\'s topics do not already answer, call look_up and answer from what comes back. Never answer from a name alone, never invent features, prices or rules, and say plainly when a lookup finds nothing. The docs are written by the people who build the app: explain them to a reader in plain words, and never talk about code, packages, the Workshop or development.'
      : 'Your only facts about the app are this page\'s topics. Never invent features, prices or rules beyond them, and say plainly when you do not know. Never talk about code, packages, the Workshop or development.',
    topics.length
      ? ['This page\'s topics:', ...topics.map(topic => `- ${topic.label} (${topic.id}): ${topic.explanation}`)].join('\n')
      : 'This page has no topics of its own.',
    ...(index ? [`The docs you can look up, by name:\n${index}`] : []),
  ];
}

/** What the Familiar can do here, through its functions, and the rule that the screen confirms every change. */
export function familiarLiveActions(brief: FamiliarLiveBrief): string {
  const { topics, actions, docs } = brief;
  return [
    ...(docs.length ? ['To read what the docs say about something, call look_up with the reader\'s question in your own words. It answers with the entries themselves, or with nothing when the docs do not cover it.'] : []),
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
export function familiarLiveInstruction(brief: FamiliarLiveBrief): string {
  return [...familiarLiveCharacter(brief), familiarLiveActions(brief)].join('\n\n');
}
