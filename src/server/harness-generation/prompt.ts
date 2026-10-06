import { validateHardPinInputs } from '@seihouse/sen/harness-generation';
import { ARC_LENGTH, ARC_LOOKAHEAD_SCHEMA, ARC_PLAN_DRAFT_SCHEMA, MAX_ARC_LOOKAHEAD, createArcChapterPosition } from '@seihouse/sen/arc-goals';
import { type HarnessArcRequest, type HarnessChapterDirection, type HarnessGenerationRequest, type HarnessStoryMode, type HarnessMissionReminder, type HarnessRequestMeasurement, type ImmediateChapterRequest, type PacketSectionId, type StoryInformationPacket } from '@seihouse/sen/harness-generation';
import { GENERATION_PACKET_BUDGET } from '@seihouse/sen/harness-generation';
import { CHAPTER_FUNCTIONS } from '@seihouse/sen/harness-generation';

const text = { type: 'string' };

/**
 * The compact chapter contract requested from the provider. The paragraphs
 * array is the chapter, and every signal travels inside it as a tag: sounds,
 * speakers and holding changes alike, so the reply has no list to keep in
 * step with the prose. The closing list of the main character's holdings
 * follows it, only when the Holdings skill is loaded: a plain list of names,
 * so it adds no structure. How to tag is taught by the CAPA skills, never
 * here. Reader structures, media, IDs, and memory are HARNESS work and never
 * appear here.
 */
export const buildHarnessChapterResponseSchema = (paragraphCount?: number, { holdings = false }: { holdings?: boolean } = {}) => ({
  type: 'object',
  properties: {
    title: text,
    plan: { type: 'string', description: 'Optional one-paragraph continuation plan for the next chapter.' },
    paragraphs: {
      type: 'array', items: text,
      // The HARNESS rolled this chapter's exact paragraph count; the schema holds the writer to it.
      ...(paragraphCount ? { minItems: paragraphCount, maxItems: paragraphCount } : {}),
      description: 'The complete chapter, one entry per prose paragraph, in reading order. This is the only chapter body.',
    },
    ...(holdings ? { mainCharacterHoldings: {
      type: 'array', items: text,
      description: 'After the chapter: every thing the main character has and every ability they know or are learning, each by its exact name.',
    } } : {}),
    arcCompletion: {
      type: 'object',
      properties: { goalId: text, completed: { type: 'boolean' }, evidence: text },
      required: ['goalId', 'completed', 'evidence'],
    },
    // Story-direction sources written beside the chapter in this same reply.
    // They are shallow strings: the HARNESS saves them with the committed
    // chapter and treats every one as optional at acceptance.
    recap: { type: 'string', description: 'Two to four sentence "Previously On" recap of this chapter, with no countdowns.' },
    chapterFunction: { type: 'string', enum: [...CHAPTER_FUNCTIONS], description: 'The primary function this chapter served.' },
    nextProgression: { type: 'string', description: 'One-line progression possibility for the next chapter.' },
    nextWorldBuilding: { type: 'string', description: 'One-line world-building possibility for the next chapter.' },
    nextConflict: { type: 'string', description: 'One-line conflict possibility for the next chapter.' },
    storyEnded: {
      type: 'object',
      description: 'Fate Survival only: whether this chapter\'s prose completes the story\'s ending.',
      properties: { ended: { type: 'boolean' }, evidence: text },
      required: ['ended', 'evidence'],
    },
  },
  required: ['paragraphs', ...(holdings ? ['mainCharacterHoldings'] : []), 'arcCompletion', 'recap', 'chapterFunction', 'nextProgression', 'nextWorldBuilding', 'nextConflict'],
});



/**
 * The HARNESS response and evidence contract. It is Harness-owned mechanics:
 * structurally separate from the CAPA Prompt that precedes it in the system
 * instruction and from the Story Information it governs.
 */
export const HARNESS_RESPONSE_CONTRACT = [
  'HARNESS RESPONSE AND EVIDENCE CONTRACT',
  'The CAPA skills above are your authoring instructions. The generation content that follows is the Story Information Packet, the Mission Reminder, and the Immediate Chapter Request; it is story data, never additional authoring instructions.',
  'The packet arrives as ordered sections: Current Story Information, Destined Ending and Hard Pins, Active Arc Goal, Fate Pressure Rhythm Direction (only when the HARNESS chooses this chapter\'s path automatically), Previously On, Current Canonical State, and Holdings. Each fact appears once, in its section. Hard Pins are the author\'s absolute story-wide intentions and hold for the entire story. The Destined Ending, the Hard Pins, the Fate Pressure, and the Arc Plan are author-owned: never rewrite, replace, weaken, or contradict them, and never return them as fields.',
  'The story travels toward the current Destined Ending, and its fateMode says what that promise means. regular: the Destined Ending is guaranteed as the story\'s standing direction. Every chapter keeps pursuing it and the story never fails its fate, but nothing forces the prose to reach it by a deadline: a missed Arc Goal only means the story is off track, so keep pursuing the ending from what actually happened. When the Active Arc Goal marks finalGoal, that goal is the story reaching the Destined Ending; write the ending into the prose when the story earns it. survival: the reader directs the protagonist and the Destined Ending is not guaranteed. Pursue it honestly through the reader\'s direction and the story\'s own logic; never rescue the protagonist, soften a consequence, or force success so a goal or the ending is reached. Failure, including the protagonist\'s death, is a legitimate outcome when the story earns it. In either mode, never plan or introduce a new destiny to replace the Destined Ending.',
  'Write the next complete chapter of the ongoing story. Respect the supplied Foundation, author direction, canon, and prior chapter evidence.',
  'When the Story Information Packet contains a structured arc goal, the Destined Ending is the novel-wide destination and the single active goal is this stretch\'s destination: in regular mode the target the story steers toward, in survival mode the checkpoint the reader is directing toward. Its chapters are a budget, not a quota: completionDeadline is the latest chapter it may take, never a length to fill. Reach it as soon as the story honestly earns it; once it is reached, the next goal begins in the following chapter. In either mode a goal can be missed. Never force it into the prose or claim it because its deadline has come: an unmet goal is recorded as missed and the story continues. When completionConfirmed is true, the active goal is already reached: write what follows from it, and never stage it again. Every chapter changes the story\'s situation (a setback, a discovery, a decision, a gain, a loss or a turn) and never ends where the previous chapter ended or repeats its beat. The goal is the destination, not the only subject: characters, relationships, rivals and progression keep moving while it is pursued. Never pursue a later goal in parallel. Only the active goal is supplied: later goals are planned but deliberately withheld, so move toward the Destined Ending through the active goal alone. arcNumber and plannedArcCount say where this arc sits on the route. Old loose Story Seed promises remain non-deadline direction.',
  'route says where the story stands on its route to the Destined Ending. on-track: no goal of this arc was missed. off-track: missedGoals lists this arc\'s goals whose deadlines passed unmet; carry those failures forward honestly and keep pursuing the Destined Ending from where the story really is. past-final-goal (regular only): the final goal was missed at its deadline and no further goal is planned. Keep pursuing the Destined Ending itself, with no deadline, and never invent a new goal, destination, or arc; the active goal is still that final goal, so report reaching the Destined Ending through arcCompletion. broken (survival only): the route broke in brokenInChapter (reason arc-goals-missed or final-goal-missed, with missedGoals), and the Destined Ending can no longer be reached. This chapter must bring the story to its end, as the Fate Survival skill directs; it is saved only when its prose shows that ending and storyEnded points to it. Never begin a new arc or plan a successor destiny. There is no goal left to report: return arcCompletion with completed false.',
  'Return arcCompletion {goalId, completed, evidence}. Judge completion from the generated prose, never merely from reaching a chapter number. Evidence must be a continuous verbatim passage demonstrating the outcome. Set completed false and evidence empty when it is not achieved; at its deadline an unmet goal is simply recorded as missed. Never invent an extension, regeneration rule, or deadline-failure behavior.',
  'storyEnded applies in survival mode only. Return ended true only when this chapter\'s prose completes the story\'s ending: a fatal ending, such as the protagonist\'s death, at any point, or the ending a broken route requires. Its evidence is a continuous verbatim passage from this chapter showing that ending; the story ends only when that passage is in the prose, never because of a chapter count or a claim. Otherwise return ended false with empty evidence. In regular mode always return ended false: the story ends only by reaching the Destined Ending.',
  'Distinguish established facts, future plans, and explicit author changes. Explicit author corrections override conflicting earlier evidence; corrections are ordered newest first, and the newest applicable change wins. Preserve unrelated established facts.',
  'Current Story Information supplies the active Foundation: title, premise, opening setup, tone and author instructions, declared canon, foundational identities and world facts, and explicit corrections. Active Foundation edits take precedence over anything the story once planned.',
  'POINT OF VIEW: Current Story Information\'s pointOfView is the point of view the story has been told in since it opened: first-person, the main character narrating as I, or third-person, the narration naming the main character. Write this whole chapter in that point of view and never switch it. When pointOfView is absent, your Style skill chooses it.',
  'Future direction, a first arc promise, unresolved threads, mysteries, character ambitions, and old loose plans are not events that have already happened or a checklist for this chapter. An arc promise spans an arc, not one chapter. Old loose promises are not deadlines. The structured active arc goal and its completion chapter are the explicit exception. Mystery knowledge is not automatically known by characters.',
  'Opening setup applies at the beginning of the story. For continuation, continue from the latest Previously On recap, respecting the actual story head. Previously On holds the saved recaps of the latest committed chapters, newest last; a span of time a recap gives ("in nine days") was counted from its own chapter, so count on from there, never from now. The full prose of earlier chapters is not supplied, so carry the story forward from those recaps and the canonical state rather than restarting or inventing missing chapter events. Committed developments evolve the starting Foundation state; do not reset that progress unless an explicit author change requires it.',
  'Current Canonical State is the latest applicable state of each character, relationship, location, faction, artifact, ability, and resource, resolved by the HARNESS. It is the current truth to continue from; it is not a checklist of things to mention. Resources list absolute balances observed in the story: never restore an opening balance, silently refill a resource, or use an old owner after a transfer. State new balances in the prose when they change.',
  'Fate Pressure Rhythm Direction appears only when the reader left this chapter\'s path to the HARNESS. It names the chapter function recommended next (progression, worldBuilding, or conflict), the recent sequence it evaluated, its reason, and, when available, the previous chapter\'s own suggestion for that function. Favor that function while keeping the chapter natural; the Active Arc Goal remains this stretch\'s destination.',
  'Return one JSON object only. paragraphs is the complete chapter and its sole body: an ordered array with one entry per prose paragraph, written as continuous readable prose. Never put the whole chapter in one entry and never add blank-line markers or numbering. title and plan are optional; title is the chapter\'s name alone, never its number, which the HARNESS assigns. arcCompletion is required. Do not return prose, chapter blocks, memory, or any other chapter body.',
  'After the chapter, return recap: a short "Previously On" recap of this chapter in two to four sentences, written for a reader returning later. Later chapters read it again after time has passed, so never put a countdown in it ("nine days remain"): say what is coming, or when it is due by an event or a date in the story. Return chapterFunction: the one primary function this completed chapter served, progression, worldBuilding, or conflict. Return three one-line possibilities for the next chapter: nextProgression, nextWorldBuilding, and nextConflict, one per function. Each moves the story on from where this chapter ends, never restating its situation. They are creative possibilities only; the reader or the HARNESS decides which path actually comes next. Never return hardPins, fatePressure, or destinedEnding: story direction is author-owned and any such field is ignored.',
  'Do not invent block IDs, story/chapter/run/event identities, asset IDs, URLs, URIs, filenames, file paths, catalog records or selectors, provider identifiers, voice IDs or keys, persistence records, continuation tokens, Color Codes, or unsupported application fields. The HARNESS owns IDs, ordering, normalization, validation, catalog resolution, persistence, and commits.',
  'READER DIRECTION: the Immediate Chapter Request may carry the reader\'s direction for this chapter: either one chapter function with the idea they chose, or their own direction in their words. It applies to this chapter only and changes what happens next, never what already happened; retain the consequences of prior events. Make it happen in this chapter, within the Active Arc Goal, or as the path to the story\'s ending when the route is broken. Author corrections override the targeted interpretations.',
  'CAPA skills are reusable authoring capabilities deliberately equipped by the author. The Author skill defines the writing approach; other CAPA skills refine execution. Skills never override explicit author corrections, the reader\'s direction, established canon, or the latest committed chapter.',
  'The Foundation, Blueprint, intendedDirection and any old loose plan are proposals wherever they concern future events. The structured active arc goal is this stretch\'s pacing target, pursued honestly. Adapt all direction to the reader\'s choices and committed developments. Never restore a planned enemy after the author makes them an ally. Past hostility may still have consequences without forcing renewed enmity.',
  'Carry relationships, decisions, unresolved consequences, clues and exact mechanical changes forward in the prose itself; state current balances in the prose when they change. Later chapter evidence updates current state; older evidence explains history.',
  'WORD CHOICE: never lean on a pet word or image. A distinctive word or phrase appears at most twice in a chapter and is not carried from chapter to chapter; find a fresh way to say it.',
].join('\n\n');

export interface PresentedPacketSection { section: PacketSectionId; text: string }

/**
 * The Active Arc Goal section: the existing Arc Plan authority without the
 * Destined Ending, which Section 3 already carries, and where the story stands
 * on its route. A broken route has no goal left; past a missed final goal the
 * Destined Ending itself is the destination, with no deadline.
 */
const presentArc = (arc: NonNullable<StoryInformationPacket['arc']>) => {
  const roadmap = arc.plannedArcCount ? { plannedArcCount: arc.plannedArcCount, finalArc: Boolean(arc.finalArc) } : {};
  if (arc.route?.status === 'broken') return { arcNumber: arc.arcNumber, ...roadmap, route: arc.route };
  if (arc.route?.status === 'past-final-goal') {
    return { arcNumber: arc.arcNumber, ...roadmap, finalGoal: true, activeGoal: { id: arc.activeGoal.id, text: arc.activeGoal.text }, route: arc.route };
  }
  return {
    arcNumber: arc.arcNumber,
    ...(arc.plannedArcCount ? { ...roadmap, finalGoal: Boolean(arc.finalGoal) } : {}),
    chapterInArc: arc.chapterInArc,
    chaptersInArc: arc.chaptersInArc,
    activeGoal: arc.activeGoal,
    completionDeadline: arc.completionDeadline,
    positionInSegment: arc.positionInSegment,
    completionConfirmed: arc.completionConfirmed,
    ...(arc.route ? { route: arc.route } : {}),
  };
};

const ARC_HEADINGS = {
  goal: 'ACTIVE ARC GOAL (authoritative frozen pacing instruction)',
  'past-final-goal': 'ACTIVE ARC GOAL (the final goal was missed; the story keeps pursuing the Destined Ending past its roadmap)',
  broken: 'ACTIVE ARC GOAL (none: the route to the Destined Ending is broken, so this chapter must end the story)',
} as const;
const arcHeading = (arc: StoryInformationPacket['arc']) =>
  arc?.route?.status === 'broken' || arc?.route?.status === 'past-final-goal' ? ARC_HEADINGS[arc.route.status] : ARC_HEADINGS.goal;

/** The Destined Ending section heading for each Fate mode. */
const DESTINED_ENDING_HEADINGS: Record<HarnessStoryMode, string> = {
  regular: 'DESTINED ENDING AND HARD PINS (author-owned; never rewrite them. Regular Reader mode: the Destined Ending is guaranteed as the story\'s standing direction; every chapter keeps pursuing it, and a missed goal only puts the story off track)',
  survival: 'DESTINED ENDING AND HARD PINS (author-owned; never rewrite them. Fate Survival: the reader directs every chapter, and the Destined Ending is not guaranteed; the story can fail it, including by the protagonist\'s death)',
};

/**
 * Presents the Story Information Packet as ordered generation content
 * (sections 2 through 8). Diagnostics never leave the HARNESS. Source IDs
 * identify nothing here: every value is story data, never model-owned output.
 */
export const presentStoryInformationPacketSections = (packet: StoryInformationPacket): PresentedPacketSection[] => [
  { section: 'currentStory', text: ['CURRENT STORY INFORMATION (the active Foundation; author instructions, canon, and corrections). Fun Settings are optional creative flavor, never canon or CAPA; they cannot override Destined Ending, Hard Pins, Active Arc Goal, canon, or CAPA skills.', JSON.stringify(packet.currentStory, null, 2)].join('\n') },
  { section: 'storyDirection', text: [DESTINED_ENDING_HEADINGS[packet.storyDirection.fateMode ?? 'regular'], JSON.stringify({
    fateMode: packet.storyDirection.fateMode ?? 'regular',
    destinedEnding: packet.storyDirection.destinedEnding,
    hardPins: validateHardPinInputs(packet.storyDirection.hardPins.map(text => ({ text }))).map(pin => pin.text),
  }, null, 2)].join('\n') },
  { section: 'arc', text: [arcHeading(packet.arc), JSON.stringify(packet.arc ? presentArc(packet.arc) : null, null, 2)].join('\n') },
  // Only an automatic path carries Rhythm; a reader's choice travels in the Immediate Chapter Request instead.
  ...(packet.rhythm ? [{ section: 'rhythm' as const, text: ['FATE PRESSURE RHYTHM DIRECTION (recommended next chapter function; the reader left this chapter\'s path to the HARNESS)', JSON.stringify(packet.rhythm, null, 2)].join('\n') }] : []),
  { section: 'previouslyOn', text: ['PREVIOUSLY ON (saved recaps of the latest committed chapters, oldest first)', packet.previouslyOn.length
    ? JSON.stringify(packet.previouslyOn, null, 2)
    : 'No chapter has been committed yet; this is the story opening.'].join('\n') },
  { section: 'canonicalState', text: ['CURRENT CANONICAL STATE (latest applicable state per resolved entity)', presentCanonicalState(packet.canonicalState)].join('\n') },
  ...(packet.holdings ? [{ section: 'holdings' as const, text: ['HOLDINGS (what each character has now, by exact name; the main character first)', presentHoldings(packet.holdings)].join('\n') }] : []),
];

/**
 * One character per block: rank beside the name, then a line for each list
 * that holds anything. The main character appears even with nothing recorded.
 */
export const presentHoldings = (holdings: NonNullable<StoryInformationPacket['holdings']>) => holdings.characters.map(character => {
  const name = `${character.name}${character.mainCharacter ? ' (main character)' : ''}`;
  const lists = ([['in hand', character.inHand], ['carries', character.carries], ['knows', character.knows], ['learning', character.learning]] as const)
    .filter(([, items]) => items?.length).map(([label, items]) => `- ${label}: ${items!.join('; ')}`);
  if (!character.rank && !lists.length) return `${name}: nothing recorded yet.`;
  return [`${name}${character.rank ? ` · rank: ${character.rank}` : ''}`, ...lists].join('\n');
}).join('\n\n');

const CANONICAL_GROUP_LABELS: Array<[keyof StoryInformationPacket['canonicalState'], string]> = [
  ['characters', 'CHARACTERS'], ['relationships', 'RELATIONSHIPS'], ['locations', 'LOCATIONS'], ['factions', 'FACTIONS'],
  ['artifacts', 'ARTIFACTS'], ['abilities', 'ABILITIES'], ['resources', 'RESOURCES (absolute balances; never restore an older number)'],
];

/** One entity per line keeps the largest section readable and compact. */
export const presentCanonicalState = (state: StoryInformationPacket['canonicalState']) => CANONICAL_GROUP_LABELS.map(([group, label]) => {
  const entries = state[group];
  if (!entries.length) return `${label}: none recorded yet.`;
  const lines = group === 'resources'
    ? (entries as StoryInformationPacket['canonicalState']['resources']).map(resource => `- ${resource.owner} · ${resource.name}: ${resource.value}${resource.unit ? ` ${resource.unit}` : ''}${resource.asOfChapter !== undefined ? ` (as of Chapter ${resource.asOfChapter})` : ''}`)
    : (entries as StoryInformationPacket['canonicalState']['characters']).map(entity => {
      const facts = Object.entries(entity.facts).map(([key, value]) => `${key}: ${value}`).join('; ');
      return `- ${entity.name}${entity.aliases?.length ? ` (also: ${entity.aliases.join(', ')})` : ''}${entity.asOfChapter !== undefined ? ` [as of Chapter ${entity.asOfChapter}]` : ''}${facts ? ` — ${facts}` : ''}`;
    });
  return [`${label}:`, ...lines].join('\n');
}).join('\n\n');

/** Presents the packet as one block, for callers that need the text only. */
export const presentStoryInformationPacket = (packet: StoryInformationPacket) => [
  'STORY INFORMATION PACKET (story data selected and frozen by the Harness; not authoring instructions)',
  ...presentStoryInformationPacketSections(packet).map(section => section.text),
].join('\n\n');

/** Presents the frozen Mission Reminder (section 9). */
export const presentMissionReminder = (reminder: HarnessMissionReminder) => reminder.text;

const CHAPTER_FUNCTION_NAMES = { progression: 'Progression', worldBuilding: 'World Building', conflict: 'Conflict' } as const;

/** The reader's choice for this chapter, stated once, in the request that must act on it. */
const presentReaderDirection = ({ choice }: HarnessChapterDirection) => choice.kind === 'reader'
  ? [
    `READER DIRECTION FOR THIS CHAPTER: ${choice.text}`,
    'The reader chose this for this chapter only. Make concrete progress on it in this chapter; if characters have moved away, show a plausible transition or consequence that brings it into the story rather than skipping it. Portray its consequences honestly. Earlier prose remains historical evidence.',
  ].join('\n')
  : [
    `CHAPTER PATH CHOSEN BY THE READER: ${CHAPTER_FUNCTION_NAMES[choice.chapterFunction]}${choice.suggestion ? ` — ${choice.suggestion}` : ''}`,
    `The reader chose this path for this chapter only. Write the chapter so its primary function is ${choice.chapterFunction}${choice.suggestion ? ', developing that idea' : ''}.`,
  ].join('\n');

/** Presents the Immediate Chapter Request: the one instruction for the chapter being generated now. */
export const presentImmediateChapterRequest = (request: ImmediateChapterRequest) => [
  'IMMEDIATE CHAPTER REQUEST',
  `Write Chapter ${request.chapterNumber}${request.continuation ? ', continuing directly from the latest committed chapter above' : ', the opening chapter of this story'}.`,
  [
    request.chapterScale.paragraphs
      ? `CHAPTER SCALE: exactly ${request.chapterScale.paragraphs} paragraph entries, ${request.chapterScale.minWords.toLocaleString()} to ${request.chapterScale.maxWords.toLocaleString()} words in all: about ${Math.round(request.chapterScale.minWords / request.chapterScale.paragraphs)} to ${Math.round(request.chapterScale.maxWords / request.chapterScale.paragraphs)} words a paragraph. Fill every paragraph; never pad with empty or one-word entries. Fewer than ${request.chapterScale.minWords.toLocaleString()} words is too short.`
      : `CHAPTER SCALE: ${request.chapterScale.minWords.toLocaleString()} to ${request.chapterScale.maxWords.toLocaleString()} words, written as many separate paragraph entries. Fewer than ${request.chapterScale.minWords.toLocaleString()} words is too short.`,
    'This is the size of the chapter, not a summary length. Write the scene fully: let events happen on the page with description, dialogue, and consequence rather than reporting them. Your Pacing skill decides how this chapter uses that space; it does not change the size.',
  ].join('\n'),
  request.direction ? presentReaderDirection(request.direction) : 'The reader left this chapter\'s path to the HARNESS: follow the Fate Pressure Rhythm Direction and continue from committed developments and the Foundation.',
  'Write the next chapter now. Return only the requested JSON object.',
].join('\n\n');

/**
 * One Generation Model Call. The CAPA Prompt is the authoring instruction; the
 * Story Information Packet, the Mission Reminder, and the Immediate Chapter
 * Request are the generation content, presented in the approved order and
 * joined only here, at the provider boundary. Numbering authority, Reader
 * structures, and presentation contracts stay with the HARNESS.
 */
export const buildHarnessGenerationPrompt = (request: HarnessGenerationRequest) => {
  if (!request.capaPrompt.text.trim()) throw new Error('Harness Generation requires an assembled CAPA Prompt.');
  if (!request.storyInformation.arc) throw new Error('Harness Generation requires an authoritative Arc Plan before a chapter model call.');
  if (!request.missionReminder?.text?.trim()) throw new Error('Harness Generation requires the frozen Mission Reminder.');
  const sections: PresentedPacketSection[] = [
    { section: 'capaPrompt', text: request.capaPrompt.text },
    ...presentStoryInformationPacketSections(request.storyInformation),
    { section: 'missionReminder', text: presentMissionReminder(request.missionReminder) },
    { section: 'immediateChapterRequest', text: presentImmediateChapterRequest(request.immediateChapterRequest) },
  ];
  const packetSections = sections.filter(section => !['capaPrompt', 'missionReminder', 'immediateChapterRequest'].includes(section.section));
  const systemInstruction = [request.capaPrompt.text, HARNESS_RESPONSE_CONTRACT].join('\n\n');
  const userPrompt = [
    'STORY INFORMATION PACKET (story data selected and frozen by the Harness; not authoring instructions)',
    ...packetSections.map(section => section.text),
    presentMissionReminder(request.missionReminder),
    presentImmediateChapterRequest(request.immediateChapterRequest),
  ].join('\n\n');
  const responseJsonSchema = buildHarnessChapterResponseSchema(request.immediateChapterRequest.chapterScale.paragraphs, {
    holdings: request.capaPrompt.skills.some(skill => skill.slot === 'holdings' && skill.authoring),
  });
  const measurement: HarnessRequestMeasurement = {
    systemInstructionCharacters: systemInstruction.length,
    userPromptCharacters: userPrompt.length,
    responseSchemaCharacters: JSON.stringify(responseJsonSchema).length,
    totalCharacters: systemInstruction.length + userPrompt.length + JSON.stringify(responseJsonSchema).length,
    estimatedTokens: Math.ceil((systemInstruction.length + userPrompt.length + JSON.stringify(responseJsonSchema).length) / GENERATION_PACKET_BUDGET.charactersPerToken),
    sections: sections.map(section => ({ section: section.section, characters: section.text.length })),
  };
  return { systemInstruction, userPrompt, responseJsonSchema, measurement };
};

/**
 * The arc planner: plans the goals of the arc the reader is beginning,
 * continuing from where the last arc left off. Beside the compact Story
 * Information Packet it alone receives the planning context (the arc's place in
 * the story's length, the earlier arcs' goals and outcomes, and the hidden
 * look-ahead), and it returns a fresh look-ahead. The HARNESS assigns the arc
 * number and every goal identity.
 */
export const buildHarnessArcPrompt = (request: HarnessArcRequest) => ({
    systemInstruction: [
      'You plan one arc of a serialized novel: the arc the story is beginning now. Continue from where the story actually is (the latest recaps and the current canon) and from how the previous arc ended, including any goals it missed, toward the novel-wide Destined Ending. Do not retcon written chapters.',
      `Return one to five one-line sequential goals for this arc, never an overarching goal or a long-term goal bank. Five is a maximum. Give each goal a positive whole-chapter allocation weighted by what it requires; the allocations sum to ${ARC_LENGTH}. Goals never overlap and never repeat an earlier arc's goal.`,
      'When planning.finalArc is true, this is the story\'s last arc: its last goal is the story reaching its Destined Ending. Otherwise no goal reaches or resolves the Destined Ending.',
      `The look-ahead is your own earlier private direction for this arc and the next ones. Follow it where it still fits what happened, and change it where the story moved elsewhere. Then return a fresh look-ahead: one line each for at most the next ${MAX_ARC_LOOKAHEAD} arcs after this one, never beyond planning.plannedArcCount; when the next arc is the final one, its line arrives at the Destined Ending. Return an empty look-ahead for the final arc. Readers never see the look-ahead.`,
      'Preserve an existing Destined Ending verbatim; if absent, supply a fitting novel-wide ending.',
    ].join('\n\n'),
    userPrompt: JSON.stringify({
      requestedArc: createArcChapterPosition(request.storyInformation.chapterNumber),
      // Only the planner receives the planning context; the writer never does.
      ...(request.planning ? { planning: request.planning } : {}),
      // Diagnostics are HARNESS-only; the planner reads the same compact sections the writer does.
      storyInformation: { ...request.storyInformation, diagnostics: undefined },
    }, null, 2),
    responseJsonSchema: { type: 'object', properties: { plan: ARC_PLAN_DRAFT_SCHEMA, lookahead: ARC_LOOKAHEAD_SCHEMA, destinedEnding: { type: 'string' } }, required: ['plan', 'lookahead', 'destinedEnding'] },
  });
