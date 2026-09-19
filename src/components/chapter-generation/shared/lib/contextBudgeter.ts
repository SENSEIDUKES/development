/**
 * Verbatim port of Light-Novels `src/server/contextBudgeter.ts` (verified
 * against `main`). Pure — no network/DB — safe to run in the Workshop. This
 * is the token-budget allocator that decides which context sections get
 * included, demoted to brief, or dropped under the 24k v2 memory+history cap.
 */
import { ChapterContract, ContextBlock, ContextManifestSection, ContextManifestSectionKey } from '../../../../narrative/chapter';
import { renderChapterContractLines } from "./chapterHandoff";
import { estimateTokens } from "./helpers";
import { RenderedEntityCard } from "./entityCards";

export const CONTEXT_BUDGET_DEFAULTS = {
  totalBudgetTokens: 24000,
  sectionCaps: {
    premiseAndMcState: 1500,
    chapterContract: 500,
    anchor: 2000,
    recentFull: 6000,
    pinnedEntities: 2000,
    scoredEntities: 3000,
    threads: 1500,
    olderRecent: 3000,
    rag: 2000,
    arcSummaries: 1000,
  },
} as const;

export interface SectionOutcome {
  key: ContextManifestSectionKey;
  includedItems: string[];
  demotedItems: string[];
  omittedItems: string[];
  estimatedTokens: number;
  protectedOverflowTokens?: number;
  omissionReason?: ContextManifestSection["omissionReason"];
}

export interface BudgetedContext {
  promptSections: { key: ContextManifestSectionKey; text: string }[];
  outcomes: SectionOutcome[];
  totalBudgetTokens: number;
  estimatedTokens: number;
  protectedOverflowTokens: number;
}

type BudgetableEntityCard = RenderedEntityCard & {
  briefText?: string;
  briefEstimatedTokens?: number;
};

type SelectedCard = {
  card: BudgetableEntityCard;
  text: string;
  tier: "full" | "brief";
};

const OUTCOME_ORDER: ContextManifestSectionKey[] = [
  "pinnedRules",
  "premise",
  "chapterContract",
  "anchor",
  "recentChapters",
  "entityCards",
  "threads",
  "rag",
  "arcSummaries",
];

const KIND_LABELS: Record<RenderedEntityCard["kind"], string> = {
  character: "Character",
  faction: "Faction",
  location: "Location",
  artifact: "Artifact",
};

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const blockLabel = (block: ContextBlock, suffix?: string) => {
  const chapter = typeof block.chapterNumber === "number"
    ? `Chapter ${block.chapterNumber}`
    : "Unnumbered context";
  return suffix ? `${chapter} (${suffix})` : chapter;
};

const cardLabel = (card: RenderedEntityCard, tier?: "full" | "brief") =>
  `${KIND_LABELS[card.kind]}: ${card.name}${tier ? ` (${tier})` : ""}`;

const threadLabel = (thread: string) =>
  thread.length > 180 ? `${thread.slice(0, 177)}...` : thread;

const sectionText = (heading: string, body: string) =>
  body.trim() ? `--- ${heading} ---\n${body.trim()}` : "";

const trimFromFrontToTokens = (text: string, maxTokens: number) => {
  if (maxTokens <= 0) return "";
  if (estimateTokens(text) <= maxTokens) return text;

  const marker = "[Earlier text trimmed to preserve the immediate continuation]\n";
  const markerTokens = estimateTokens(marker);
  const availableChars = Math.max(0, (maxTokens - markerTokens) * 4);
  if (availableChars === 0) {
    return text.slice(-Math.max(1, maxTokens * 4));
  }

  const tail = text.slice(-availableChars);
  const firstBreak = tail.indexOf("\n");
  const cleanTail = firstBreak >= 0 && firstBreak < Math.floor(tail.length / 3)
    ? tail.slice(firstBreak + 1)
    : tail;
  let result = `${marker}${cleanTail}`;
  while (result && estimateTokens(result) > maxTokens) {
    result = result.slice(1);
  }
  return result;
};

const deriveBriefText = (card: BudgetableEntityCard) => {
  if (card.briefText) return card.briefText;
  if (card.tier === "brief") return card.text;

  const lines = card.text
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
  const authorNote = lines.find(line => line.toLocaleLowerCase().startsWith("author note:"));
  const status = lines.find(line => line.toLocaleLowerCase().startsWith("status:"));
  const relationship = lines.find(line =>
    line.toLocaleLowerCase().startsWith("relationship to mc:"),
  );
  const role = lines.find(line => {
    const normalized = line.toLocaleLowerCase();
    return normalized.startsWith("role:")
      || normalized.startsWith("type:")
      || normalized.startsWith("character:")
      || normalized.startsWith("faction:")
      || normalized.startsWith("location:")
      || normalized.startsWith("artifact:");
  });
  const body = authorNote
    ? authorNote.slice(authorNote.indexOf(":") + 1).trim()
    : [role, relationship, status]
      .filter(Boolean)
      .map(line => line!.slice(line!.indexOf(":") + 1).trim())
      .join(", ");
  const fallback = body || KIND_LABELS[card.kind].toLocaleLowerCase();
  const prefix = `${card.name} — `;
  const available = Math.max(0, 160 - prefix.length);
  const clipped = fallback.length > available
    ? `${fallback.slice(0, Math.max(0, available - 3)).trimEnd()}...`
    : fallback;
  return `${prefix}${clipped}`.slice(0, 160);
};

const renderSelectedCards = (cards: SelectedCard[]) =>
  cards.map(card => card.text).join("\n\n");

const selectEntityCards = (
  cards: BudgetableEntityCard[],
  maxTokens: number,
  allowDrop: boolean,
) => {
  const selected: SelectedCard[] = cards.map(card => ({
    card,
    text: card.text,
    tier: card.tier,
  }));
  const demotedItems: string[] = [];
  const omittedItems: string[] = [];

  for (let index = selected.length - 1;
    index >= 0 && estimateTokens(renderSelectedCards(selected)) > maxTokens;
    index -= 1) {
    if (selected[index].tier === "brief") continue;
    selected[index] = {
      ...selected[index],
      text: deriveBriefText(selected[index].card),
      tier: "brief",
    };
    demotedItems.push(`${cardLabel(selected[index].card, "full")} -> brief`);
  }

  if (allowDrop) {
    while (selected.length > 0 && estimateTokens(renderSelectedCards(selected)) > maxTokens) {
      const dropped = selected.pop()!;
      omittedItems.push(cardLabel(dropped.card));
    }
  }

  return {
    selected,
    demotedItems,
    omittedItems,
    estimatedTokens: estimateTokens(renderSelectedCards(selected)),
  };
};

const parseThreadAge = (thread: string) => {
  const marker = "Thread open for ";
  const markerIndex = thread.lastIndexOf(marker);
  if (markerIndex < 0) return 0;
  const suffix = thread.slice(markerIndex + marker.length);
  const chapterIndex = suffix.indexOf(" chapter");
  if (chapterIndex <= 0) return 0;
  const rawAge = suffix.slice(0, chapterIndex);
  return /^\d+$/.test(rawAge) ? Number(rawAge) : 0;
};

const selectThreads = (threads: string[], maxTokens: number) => {
  if (threads.length === 0 || maxTokens <= 0) {
    return { included: [] as string[], omitted: [...threads] };
  }

  const ages = threads.map(parseThreadAge);
  const oldestAge = Math.max(0, ...ages);
  const priorityOrder = threads
    .map((thread, index) => ({
      thread,
      index,
      isOldestAged: oldestAge > 0 && ages[index] === oldestAge,
    }))
    .sort((a, b) =>
      Number(b.isOldestAged) - Number(a.isOldestAged)
      || b.index - a.index,
    );

  const selectedIndexes = new Set<number>();
  let body = "";
  for (const candidate of priorityOrder) {
    const nextBody = body ? `${body}\n${candidate.thread}` : candidate.thread;
    if (estimateTokens(nextBody) <= maxTokens) {
      selectedIndexes.add(candidate.index);
      body = nextBody;
    }
  }

  return {
    included: threads.filter((_, index) => selectedIndexes.has(index)),
    omitted: threads.filter((_, index) => !selectedIndexes.has(index)),
  };
};

const sortByChapterDescending = (a: ContextBlock, b: ContextBlock) =>
  (b.chapterNumber ?? -1) - (a.chapterNumber ?? -1);

export function assembleContext(input: {
  blocks: ContextBlock[];
  entityCards: RenderedEntityCard[];
  threads: string[];
  pinned: { premise: string; mcStateCard: string };
  worldRules: string[];
  chapterContract?: ChapterContract;
  totalBudgetTokens?: number;
}): BudgetedContext {
  const totalBudgetTokens = input.totalBudgetTokens
    ?? CONTEXT_BUDGET_DEFAULTS.totalBudgetTokens;
  const caps = CONTEXT_BUDGET_DEFAULTS.sectionCaps;
  const promptSections: BudgetedContext["promptSections"] = [];
  const outcomes = new Map<ContextManifestSectionKey, SectionOutcome>(
    OUTCOME_ORDER.map(key => [key, {
      key,
      includedItems: [],
      demotedItems: [],
      omittedItems: [],
      estimatedTokens: 0,
      protectedOverflowTokens: 0,
    }]),
  );
  let usedTokens = 0;
  let carryTokens = 0;

  const allocateSection = (cap: number) => {
    const remainingTotal = Math.max(0, totalBudgetTokens - usedTokens);
    return Math.min(cap + carryTokens, remainingTotal);
  };

  const bodyTokensForAllocation = (allocation: number, heading: string) => {
    return Math.max(0, allocation - estimateTokens(`--- ${heading} ---\n`));
  };

  const finishAllocation = (allocation: number, actualTokens: number) => {
    carryTokens = Math.max(0, allocation - actualTokens);
  };

  const recordProtectedOverflow = (
    key: ContextManifestSectionKey,
    allocation: number,
    actualTokens: number,
  ) => {
    const overflow = Math.max(0, actualTokens - allocation);
    if (overflow > 0) {
      const outcome = outcomes.get(key)!;
      outcome.protectedOverflowTokens =
        (outcome.protectedOverflowTokens || 0) + overflow;
    }
  };

  const recordSection = (
    key: ContextManifestSectionKey,
    heading: string,
    body: string,
    decision: Omit<SectionOutcome, "key" | "estimatedTokens">,
  ) => {
    const text = sectionText(heading, body);
    const tokens = estimateTokens(text);
    if (text) {
      promptSections.push({ key, text });
      usedTokens += tokens;
    }
    const outcome = outcomes.get(key)!;
    outcome.includedItems.push(...decision.includedItems);
    outcome.demotedItems.push(...decision.demotedItems);
    outcome.omittedItems.push(...decision.omittedItems);
    outcome.estimatedTokens += tokens;
    if (decision.omissionReason) {
      outcome.omissionReason = decision.omissionReason;
    }
    return tokens;
  };

  const pinnedHeading = "PINNED STORY RULES & MAIN-CHARACTER STATE";
  const pinnedCore = input.pinned.mcStateCard.trim();
  const premiseHeading = "CURRENT CHAPTER PREMISE";
  const premiseAndStateAllocation = allocateSection(caps.premiseAndMcState);
  const mandatoryPremiseAndStateTokens =
    estimateTokens(sectionText(pinnedHeading, pinnedCore))
    + estimateTokens(sectionText(premiseHeading, input.pinned.premise));
  const optionalWorldRuleLimit = Math.max(
    0,
    premiseAndStateAllocation - mandatoryPremiseAndStateTokens,
  );
  const includedWorldRules: string[] = [];
  const omittedWorldRules: string[] = [];
  let pinnedBody = pinnedCore;
  let worldRulesBody = "";
  for (const rule of input.worldRules.filter(Boolean)) {
    const renderedRule = `World rule: ${rule}`;
    const candidate = worldRulesBody
      ? `${worldRulesBody}\n${renderedRule}`
      : renderedRule;
    if (estimateTokens(candidate) <= optionalWorldRuleLimit) {
      includedWorldRules.push(rule);
      worldRulesBody = candidate;
    } else {
      omittedWorldRules.push(rule);
    }
  }
  if (worldRulesBody) {
    pinnedBody = pinnedBody ? `${pinnedBody}\n${worldRulesBody}` : worldRulesBody;
  }
  const pinnedRuleTokens = recordSection("pinnedRules", pinnedHeading, pinnedBody, {
    includedItems: [
      pinnedCore ? "Main-character state" : "",
      ...includedWorldRules.map((_, index) => `World rule ${index + 1}`),
    ],
    demotedItems: [],
    omittedItems: omittedWorldRules.map(rule => `World rule: ${threadLabel(rule)}`),
    omissionReason: omittedWorldRules.length > 0 ? "budget_drop" : undefined,
  });

  const premiseTokens = recordSection("premise", premiseHeading, input.pinned.premise, {
    includedItems: input.pinned.premise.trim() ? ["Chapter premise"] : [],
    demotedItems: [],
    omittedItems: [],
  });
  recordProtectedOverflow(
    "premise",
    premiseAndStateAllocation,
    pinnedRuleTokens + premiseTokens,
  );
  finishAllocation(
    premiseAndStateAllocation,
    pinnedRuleTokens + premiseTokens,
  );

  if (input.chapterContract) {
    const contractHeading = "CHAPTER CONTRACT";
    const contractAllocation = allocateSection(caps.chapterContract);
    const contractLimit = bodyTokensForAllocation(contractAllocation, contractHeading);
    const { coreLines, doNotRepeatLines } = renderChapterContractLines(
      input.chapterContract,
    );
    let contractBody = coreLines.join("\n");
    const includedContractItems: string[] = coreLines.length > 0
      ? ["Contract core"]
      : [];
    const omittedContractItems: string[] = [];
    if (doNotRepeatLines.length > 0) {
      const [dnrHeader, ...dnrEntries] = doNotRepeatLines;
      let keptEntries = dnrEntries.length;
      const renderWith = (count: number) => [
        contractBody,
        count > 0 ? [dnrHeader, ...dnrEntries.slice(0, count)].join("\n") : "",
      ].filter(Boolean).join("\n");
      while (keptEntries > 0 && estimateTokens(renderWith(keptEntries)) > contractLimit) {
        keptEntries -= 1;
      }
      contractBody = renderWith(keptEntries);
      includedContractItems.push(
        ...dnrEntries.slice(0, keptEntries).map(threadLabel),
      );
      omittedContractItems.push(
        ...dnrEntries.slice(keptEntries).map(threadLabel),
      );
    }
    const contractTokens = recordSection(
      "chapterContract",
      contractHeading,
      contractBody,
      {
        includedItems: includedContractItems,
        demotedItems: [],
        omittedItems: omittedContractItems,
        omissionReason: omittedContractItems.length > 0 ? "budget_drop" : undefined,
      },
    );
    recordProtectedOverflow("chapterContract", contractAllocation, contractTokens);
    finishAllocation(contractAllocation, contractTokens);
  } else {
    finishAllocation(allocateSection(caps.chapterContract), 0);
  }

  const anchorBlocks = input.blocks.filter(block => block.kind === "anchor");
  const anchorAllocation = allocateSection(caps.anchor);
  const anchorTokens = recordSection(
    "anchor",
    "IMMEDIATE CONTINUATION ANCHOR",
    anchorBlocks.map(block => block.text).join("\n\n"),
    {
      includedItems: anchorBlocks.map(block => blockLabel(block, "anchor")),
      demotedItems: [],
      omittedItems: [],
    },
  );
  recordProtectedOverflow("anchor", anchorAllocation, anchorTokens);
  finishAllocation(anchorAllocation, anchorTokens);

  const recentBlocks = input.blocks
    .filter(block =>
      block.kind === "recent-full" || block.kind === "recent-summary",
    )
    .sort(sortByChapterDescending);
  const newestRecentBlock = recentBlocks[0];
  if (newestRecentBlock) {
    const heading = "MOST RECENT CHAPTER";
    const recentAllocation = allocateSection(caps.recentFull);
    const limit = bodyTokensForAllocation(recentAllocation, heading);
    const rendered = trimFromFrontToTokens(newestRecentBlock.text, limit);
    const wasTrimmed = rendered !== newestRecentBlock.text;
    const sourceTier = newestRecentBlock.kind === "recent-full" ? "full" : "summary";
    const recentTokens = recordSection("recentChapters", heading, rendered, {
      includedItems: rendered
        ? [blockLabel(
            newestRecentBlock,
            wasTrimmed ? `${sourceTier}, front-trimmed` : sourceTier,
          )]
        : [],
      demotedItems: wasTrimmed
        ? [blockLabel(newestRecentBlock, "front-trimmed")]
        : [],
      omittedItems: rendered ? [] : [blockLabel(newestRecentBlock, sourceTier)],
      omissionReason: rendered
        ? (wasTrimmed ? "token_budget" : undefined)
        : "budget_drop",
    });
    finishAllocation(recentAllocation, recentTokens);
  } else {
    const recentAllocation = allocateSection(caps.recentFull);
    finishAllocation(recentAllocation, 0);
  }

  const pinnedCards = (input.entityCards as BudgetableEntityCard[])
    .filter(card => card.pinned);
  const scoredCards = (input.entityCards as BudgetableEntityCard[])
    .filter(card => !card.pinned);
  const pinnedEntityHeading = "CODEX MEMORY CARDS — PINNED";
  const pinnedEntityAllocation = allocateSection(caps.pinnedEntities);
  const pinnedSelection = selectEntityCards(
    pinnedCards,
    pinnedCards.length > 0
      ? bodyTokensForAllocation(pinnedEntityAllocation, pinnedEntityHeading)
      : pinnedEntityAllocation,
    false,
  );
  const pinnedEntityTokens = recordSection(
    "entityCards",
    pinnedEntityHeading,
    renderSelectedCards(pinnedSelection.selected),
    {
      includedItems: pinnedSelection.selected.map(
        ({ card, tier }) => cardLabel(card, tier),
      ),
      demotedItems: pinnedSelection.demotedItems,
      omittedItems: [],
      omissionReason: pinnedSelection.demotedItems.length > 0
        ? "demoted_to_brief"
        : undefined,
    },
  );
  recordProtectedOverflow(
    "entityCards",
    pinnedEntityAllocation,
    pinnedEntityTokens,
  );
  finishAllocation(pinnedEntityAllocation, pinnedEntityTokens);

  const scoredEntityHeading = "CODEX MEMORY CARDS — RELEVANCE-RANKED";
  const scoredEntityAllocation = allocateSection(caps.scoredEntities);
  const scoredSelection = selectEntityCards(
    scoredCards,
    scoredCards.length > 0
      ? bodyTokensForAllocation(scoredEntityAllocation, scoredEntityHeading)
      : scoredEntityAllocation,
    true,
  );
  const scoredEntityTokens = recordSection(
    "entityCards",
    scoredEntityHeading,
    renderSelectedCards(scoredSelection.selected),
    {
      includedItems: scoredSelection.selected.map(
        ({ card, tier }) => cardLabel(card, tier),
      ),
      demotedItems: scoredSelection.demotedItems,
      omittedItems: scoredSelection.omittedItems,
      omissionReason: scoredSelection.omittedItems.length > 0
        ? "budget_drop"
        : scoredSelection.demotedItems.length > 0
          ? "demoted_to_brief"
          : undefined,
    },
  );
  finishAllocation(scoredEntityAllocation, scoredEntityTokens);

  const threadsHeading = "ACTIVE PLOT THREADS";
  const threadAllocation = allocateSection(caps.threads);
  const threadLimit = bodyTokensForAllocation(threadAllocation, threadsHeading);
  const threadSelection = selectThreads(input.threads.filter(Boolean), threadLimit);
  const threadTokens = recordSection(
    "threads",
    threadsHeading,
    threadSelection.included.join("\n"),
    {
      includedItems: threadSelection.included.map(threadLabel),
      demotedItems: [],
      omittedItems: threadSelection.omitted.map(threadLabel),
      omissionReason: threadSelection.omitted.length > 0 ? "budget_drop" : undefined,
    },
  );
  finishAllocation(threadAllocation, threadTokens);

  const olderRecentBlocks = recentBlocks.slice(1);
  const olderHeading = "EARLIER RECENT CHAPTERS";
  const olderRecentAllocation = allocateSection(caps.olderRecent);
  const olderLimit = bodyTokensForAllocation(olderRecentAllocation, olderHeading);
  let olderBody = "";
  const includedOlder: string[] = [];
  const demotedOlder: string[] = [];
  const omittedOlder: string[] = [];
  for (const block of olderRecentBlocks) {
    const rendered = olderBody ? `${olderBody}\n\n${block.text}` : block.text;
    if (estimateTokens(rendered) <= olderLimit) {
      olderBody = rendered;
      includedOlder.push(blockLabel(
        block,
        block.kind === "recent-full" ? "full" : "summary",
      ));
      continue;
    }

    if (block.kind === "recent-full" && block.summaryText?.trim()) {
      const summary = typeof block.chapterNumber === "number"
        ? `Chapter ${block.chapterNumber} Summary: ${block.summaryText.trim()}`
        : block.summaryText.trim();
      const degradedBody = summary
        ? (olderBody ? `${olderBody}\n\n${summary}` : summary)
        : olderBody;
      if (summary && estimateTokens(degradedBody) <= olderLimit) {
        olderBody = degradedBody;
        includedOlder.push(blockLabel(block, "summary"));
        demotedOlder.push(blockLabel(block, "full -> summary"));
        continue;
      }
    }

    omittedOlder.push(blockLabel(
      block,
      block.kind === "recent-full" ? "full" : "summary",
    ));
  }
  const olderRecentTokens = recordSection("recentChapters", olderHeading, olderBody, {
    includedItems: includedOlder,
    demotedItems: demotedOlder,
    omittedItems: omittedOlder,
    omissionReason: omittedOlder.length > 0
      ? "budget_drop"
      : demotedOlder.length > 0
        ? "token_budget"
        : undefined,
  });
  finishAllocation(olderRecentAllocation, olderRecentTokens);

  const ragBlocks = input.blocks.filter(block => block.kind === "rag");
  const ragHeading = "RECOVERED RELEVANT MEMORIES";
  const ragAllocation = allocateSection(caps.rag);
  const ragLimit = bodyTokensForAllocation(ragAllocation, ragHeading);
  let ragBody = "";
  const includedRag: ContextBlock[] = [];
  const omittedRag: ContextBlock[] = [];
  for (const block of ragBlocks) {
    const candidate = ragBody ? `${ragBody}\n\n${block.text}` : block.text;
    if (estimateTokens(candidate) <= ragLimit) {
      ragBody = candidate;
      includedRag.push(block);
    } else {
      omittedRag.push(block);
    }
  }
  const ragTokens = recordSection("rag", ragHeading, ragBody, {
    includedItems: includedRag.map(block => blockLabel(block)),
    demotedItems: [],
    omittedItems: omittedRag.map(block => blockLabel(block)),
    omissionReason: omittedRag.length > 0 ? "budget_drop" : undefined,
  });
  finishAllocation(ragAllocation, ragTokens);

  const arcBlocks = input.blocks.filter(block => block.kind === "arc-summary");
  const arcHeading = "COARSE HISTORY (ARC SUMMARIES)";
  const arcAllocation = allocateSection(caps.arcSummaries);
  const arcLimit = bodyTokensForAllocation(arcAllocation, arcHeading);
  let arcBody = "";
  const includedArcIndexes = new Set<number>();
  for (let index = arcBlocks.length - 1; index >= 0; index -= 1) {
    const candidate = arcBody
      ? `${arcBlocks[index].text}\n\n${arcBody}`
      : arcBlocks[index].text;
    if (estimateTokens(candidate) <= arcLimit) {
      arcBody = candidate;
      includedArcIndexes.add(index);
    }
  }
  const arcItem = (block: ContextBlock, index: number) => {
    const firstLine = block.text.split("\n", 1)[0]?.trim();
    return firstLine
      ? threadLabel(firstLine)
      : `Arc summary ${index + 1}`;
  };
  const arcTokens = recordSection("arcSummaries", arcHeading, arcBody, {
    includedItems: arcBlocks
      .map(arcItem)
      .filter((_, index) => includedArcIndexes.has(index)),
    demotedItems: [],
    omittedItems: arcBlocks
      .map(arcItem)
      .filter((_, index) => !includedArcIndexes.has(index)),
    omissionReason: includedArcIndexes.size < arcBlocks.length ? "budget_drop" : undefined,
  });
  finishAllocation(arcAllocation, arcTokens);

  const normalizedOutcomes = OUTCOME_ORDER.map(key => {
    const outcome = outcomes.get(key)!;
    return {
      ...outcome,
      includedItems: unique(outcome.includedItems),
      demotedItems: unique(outcome.demotedItems),
      omittedItems: unique(outcome.omittedItems),
    };
  });
  const protectedOverflowTokens = normalizedOutcomes.reduce(
    (sum, outcome) => sum + (outcome.protectedOverflowTokens || 0),
    0,
  );

  return {
    promptSections,
    outcomes: normalizedOutcomes,
    totalBudgetTokens,
    estimatedTokens: usedTokens,
    protectedOverflowTokens,
  };
}
