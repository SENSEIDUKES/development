/**
 * What the Familiar is told in a live conversation, whichever provider holds
 * it: who it is, how it talks, its facts (the page's topics and the
 * NovelExpanded Docs), and what it can do through its functions.
 */
import type { FamiliarLiveBrief } from '@seihouse/library/familiar';
import { docsCategories } from '../../workshop/docs/catalog';

/**
 * The NovelExpanded Docs (`src/workshop/docs/catalog.ts`): the product's own
 * explanations, the Familiar's facts beyond the page. Only explained topics.
 */
export const familiarLiveDocs = (): string => docsCategories
  .flatMap(category => category.topics.filter(topic => topic.definition)
    .map(topic => `- ${topic.title} (${category.title}): ${topic.definition}${topic.howItFits ? ` ${topic.howItFits}` : ''}`))
  .join('\n');

/** Who the Familiar is, how it talks, and its facts: the page's topics and the NovelExpanded Docs. Shared by every live provider. */
export function familiarLiveCharacter(brief: FamiliarLiveBrief): string[] {
  const docs = familiarLiveDocs();
  const { familiar, topics } = brief;
  return [
    `You are ${familiar.name}, the reader's Familiar: a small spirit companion who lives in the Celestial Library, the reading app Expanded Novels.${familiar.description ? ` ${familiar.description}` : ''}`,
    `You talk with the reader out loud, like a friend beside them: warm, quick and natural. Keep answers to two or three short sentences unless they ask for more. Speak the reader's language (${brief.language}).`,
    `The reader is on: ${brief.place}.`,
    'Your only facts about the app are this page\'s topics and the NovelExpanded Docs below. Never invent features, prices or rules beyond them, and say plainly when you do not know. The docs are written by the people who build the app: explain them to a reader in plain words, and never talk about code, packages, the Workshop or development.',
    topics.length
      ? ['This page\'s topics:', ...topics.map(topic => `- ${topic.label} (${topic.id}): ${topic.explanation}`)].join('\n')
      : 'This page has no topics of its own.',
    ...(docs ? [`The NovelExpanded Docs:\n${docs}`] : []),
  ];
}

/** What the Familiar can do here, through its functions, and the rule that the screen confirms every change. */
export function familiarLiveActions(brief: FamiliarLiveBrief): string {
  const { topics, actions } = brief;
  return [
    ...(topics.length ? ['When showing a topic would help, call show_topic so it appears on their screen.'] : []),
    ...(actions.length
      ? ['What you can do here, only through propose_action:',
        ...actions.map(action => `- ${action.id}: ${action.label}${action.detail ? `. ${action.detail}` : ''}${action.input ? `. Needs their words for "${action.input.label}", at most ${action.input.maxLength} characters, in input.` : ''}`),
        'propose_action never changes anything: it shows the change on the reader\'s screen to confirm. Never say you did something before it is confirmed.',
        'Call answer_proposal with confirm only when the reader clearly tells you to confirm or go ahead; with cancel when they decline; with hear when they want to hear it first.']
      : ['You cannot change anything on this page. If asked to, say so kindly.']),
  ].join('\n');
}

/** Gemini's whole instruction: one model hears, thinks, acts and speaks. */
export function familiarLiveInstruction(brief: FamiliarLiveBrief): string {
  return [...familiarLiveCharacter(brief), familiarLiveActions(brief)].join('\n\n');
}

