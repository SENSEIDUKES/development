import {
  Accessibility,
  Anchor,
  BookOpen,
  Compass,
  Feather,
  FileJson,
  Globe,
  Layers,
  ListChecks,
  PenLine,
  ScrollText,
  Shield,
} from "lucide-react";
import type { ReactNode } from "react";
import { getChapterWritingStyleInstruction } from "../shared/lib/chapterWritingStyle";
import type { SceneAnchors, SceneType } from "../shared/lib/sceneRhythm";
import type { ChapterPipelineRun, ChapterPacket } from "../shared/pipeline/types";
import type { ChapterHandoff, ChapterEndState } from "../shared/types";
import ManifestedChapterView from "./ManifestedChapterView";
import {
  Chip,
  Collapsible,
  CopyButton,
  EmptyNote,
  Field,
  WorkspaceCard,
  WorkspaceRegion,
  type ChipTone,
} from "./workspaceUi";

export interface ChapterGenerationWorkspaceProps {
  /** The complete structured four-stage run — consumed directly, never re-parsed from JSON. */
  run: ChapterPipelineRun;
}

const SCENE_TYPE_LABELS: Record<SceneType, string> = {
  worldBuilding: "World-Building",
  conflict: "Conflict",
  progression: "Progression",
};

const EFFECT_KIND_LABELS: Record<string, string> = {
  "narration-metadata": "Narration Metadata",
  "beast-sound": "Beast Sound",
  "world-card": "World Card",
  "system-panel": "System Panel",
  "scene-music": "Scene Music",
  atmosphere: "Atmosphere",
  "narrative-cue": "Narrative Cue",
};

const formatKey = (key: string) =>
  key.replace(/[-_]+/g, " ").replace(/\b\w/g, letter => letter.toUpperCase());

const charCount = (text: string) => `${text.length.toLocaleString()} chars`;

/* -------------------------------------------------------------------------- */
/* Permanent Story Rules                                                       */
/* -------------------------------------------------------------------------- */

function PermanentStoryRules({ packet }: { packet: ChapterPacket }) {
  const { storyConstitution: constitution, generationRules, culturalProse } = packet;
  const accessibilityInstruction = getChapterWritingStyleInstruction(constitution.accessibilityStyle);
  const proseSourceLabel = culturalProse.source === "story-setting"
    ? "Story setting"
    : culturalProse.source === "workshop-override" ? "Workshop override" : "Fallback";

  return (
    <WorkspaceRegion
      title="Permanent Story Rules"
      description="Fixed story inputs assembled into every Chapter Packet. They stay mostly constant across the novel — large instruction texts stay collapsed."
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <WorkspaceCard icon={<BookOpen size={13} />} title="Story Seed & Blueprint">
          <Field label="Premise">{constitution.corePremise}</Field>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip tone="cyan">{constitution.genre}</Chip>
            {constitution.storyTags.map(tag => <Chip key={tag}>{tag}</Chip>)}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Main Character">{constitution.mainCharacterName}</Field>
            <Field label="Story Style">
              {constitution.storyStyle ? formatKey(constitution.storyStyle) : "Not set on this story"}
            </Field>
          </div>
          <Field label="Destined Ending">{constitution.destinedEnding}</Field>
          {constitution.glossaryEntries.length > 0 && (
            <Field label={`Glossary (${constitution.glossaryEntries.length} terms)`}>
              <span className="flex flex-wrap gap-1">
                {constitution.glossaryEntries.map(entry => (
                  <Chip key={entry.term} tone="violet">{entry.canonicalTerm || entry.term}</Chip>
                ))}
              </span>
            </Field>
          )}
          <Collapsible title="Style Bible" meta={charCount(constitution.styleBible)} copyText={constitution.styleBible}>
            <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-white/60">{constitution.styleBible}</p>
          </Collapsible>
          <Collapsible title="Trope Rules" meta={charCount(constitution.tropeRules)} copyText={constitution.tropeRules}>
            <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-white/60">{constitution.tropeRules}</p>
          </Collapsible>
        </WorkspaceCard>

        <div className="flex min-w-0 flex-col gap-4">
          <WorkspaceCard icon={<Feather size={13} />} title="Story Style & Cultural Prose">
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip tone="cyan">{culturalProse.label ?? "No Cultural Prose style"}</Chip>
              <Chip tone={culturalProse.source === "fallback" ? "neutral" : "emerald"}>{proseSourceLabel}</Chip>
            </div>
            {culturalProse.instruction
              ? (
                <Collapsible title="Cultural Prose instruction" meta={charCount(culturalProse.instruction)} copyText={culturalProse.instruction}>
                  <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-white/60">{culturalProse.instruction}</p>
                </Collapsible>
              )
              : <EmptyNote>No Cultural Prose instruction — the fallback narration style applies.</EmptyNote>}
          </WorkspaceCard>

          <WorkspaceCard icon={<Accessibility size={13} />} title="Accessibility">
            <Field label="Chapter Writing Style">{constitution.accessibilityStyle}</Field>
            <p className="text-[11px] leading-relaxed text-white/50">
              {accessibilityInstruction || "No prose adjustment — the story's default narrative voice is used."}
            </p>
          </WorkspaceCard>

          <WorkspaceCard icon={<Shield size={13} />} title="Fate Survival">
            {constitution.fateSurvival ? (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip tone={constitution.fateSurvival.enabled ? "rose" : "neutral"}>
                    {constitution.fateSurvival.enabled ? "Enabled" : "Disabled"}
                  </Chip>
                  <Chip>Visibility: {constitution.fateSurvival.visibility}</Chip>
                  <Chip>Pressure: {constitution.fateSurvival.pressure}</Chip>
                </div>
                <p className="text-[11px] leading-relaxed text-white/50">
                  Configured on the story. Whether it fires is a per-chapter decision — see Step 2 below.
                </p>
              </>
            ) : (
              <EmptyNote>
                Not configured for this story, so no fate event is manufactured. The preview's Fate
                Pressure control is only a planning signal and appears in Step 2.
              </EmptyNote>
            )}
          </WorkspaceCard>
        </div>

        <WorkspaceCard icon={<Globe size={13} />} title="World & Narration Rules">
          <Field label="Power System">{constitution.powerSystem}</Field>
          {constitution.worldRules.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {constitution.worldRules.map(rule => (
                <li key={rule} className="flex items-start gap-2 text-xs leading-relaxed text-white/70">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                  <span className="min-w-0 break-words">{rule}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote>No permanent world rules recorded for this story.</EmptyNote>
          )}
        </WorkspaceCard>

        <WorkspaceCard icon={<ScrollText size={13} />} title="Permanent Generation & Effect Rules">
          <p className="text-[11px] leading-relaxed text-white/50">
            The standing instructions every chapter is written under. They ship inside the packet and
            go straight to the writing call — they are not separate generation steps.
          </p>
          <Collapsible title="System instruction" meta={charCount(generationRules.systemInstruction)} copyText={generationRules.systemInstruction}>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-white/60 [overflow-wrap:anywhere]">{generationRules.systemInstruction}</pre>
          </Collapsible>
          <Collapsible title="Permanent writing instructions" meta={charCount(generationRules.permanentWritingInstructions)} copyText={generationRules.permanentWritingInstructions}>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-white/60 [overflow-wrap:anywhere]">{generationRules.permanentWritingInstructions}</pre>
          </Collapsible>
          <Collapsible title="Chapter-effect rules" meta={charCount(generationRules.effectRules)} copyText={generationRules.effectRules}>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-white/60 [overflow-wrap:anywhere]">{generationRules.effectRules}</pre>
          </Collapsible>
        </WorkspaceCard>
      </div>
    </WorkspaceRegion>
  );
}

/* -------------------------------------------------------------------------- */
/* Current Chapter Run — shared pieces                                         */
/* -------------------------------------------------------------------------- */

function AnchorList({ anchors }: { anchors: SceneAnchors }) {
  return (
    <div className="flex flex-col gap-1.5">
      {(Object.keys(SCENE_TYPE_LABELS) as SceneType[]).map(type => (
        <div key={type} className="flex min-w-0 items-start gap-2">
          <span className="mt-0.5 shrink-0"><Chip tone="cyan">{SCENE_TYPE_LABELS[type]}</Chip></span>
          <span className="min-w-0 break-words text-xs leading-relaxed text-white/70">{anchors[type]}</span>
        </div>
      ))}
    </div>
  );
}

function EndStateFields({ endState }: { endState: ChapterEndState }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {endState.location && <Field label="Location">{endState.location}</Field>}
      {endState.timeMarker && <Field label="Time">{endState.timeMarker}</Field>}
      {endState.charactersPresent && endState.charactersPresent.length > 0 && (
        <Field label="Characters Present">{endState.charactersPresent.join(", ")}</Field>
      )}
      {endState.mcCondition && <Field label="Protagonist Condition">{endState.mcCondition}</Field>}
      {endState.openTension && (
        <div className="sm:col-span-2"><Field label="Open Tension">{endState.openTension}</Field></div>
      )}
    </div>
  );
}

function HandoffSummary({ handoff }: { handoff: ChapterHandoff }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <EndStateFields endState={handoff.endState} />
      {handoff.completedEvents.length > 0 && (
        <Field label="Completed Events">
          <ul className="flex flex-col gap-1">
            {handoff.completedEvents.map(event => (
              <li key={event} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                <span className="min-w-0 break-words">{event}</span>
              </li>
            ))}
          </ul>
        </Field>
      )}
      {handoff.nextImmediateAction && (
        <Field label="Next Immediate Action">{handoff.nextImmediateAction}</Field>
      )}
    </div>
  );
}

function StepShell({ step, title, icon, aside, children }: {
  step: number;
  title: string;
  icon: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <WorkspaceCard
      icon={icon}
      kicker={`Step ${step} of 4`}
      title={title}
      headerAside={aside}
    >
      {children}
    </WorkspaceCard>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 1 — Chapter Packet                                                     */
/* -------------------------------------------------------------------------- */

function ChapterPacketStep({ packet }: { packet: ChapterPacket }) {
  const { chapterMission: mission, livingStoryState: state } = packet;
  const previousEnding = state.previousHandoff;

  return (
    <StepShell
      step={1}
      title="Chapter Packet"
      icon={<Layers size={13} />}
      aside={<Chip tone="cyan">{packet.arcChapterPosition.display}</Chip>}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Mission">
          Chapter {mission.number}{mission.title ? ` — ${mission.title}` : ""}
        </Field>
        <Field label="Pacing Directive">{mission.pacingDirective}</Field>
      </div>
      <Field label="Chapter Premise">{mission.premise}</Field>
      {mission.contract && <Field label="Contract Objective">{mission.contract.objective}</Field>}

      <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-3 sm:grid-cols-2">
        <Field label="Current Power Stage">{state.characterState.currentPowerStage}</Field>
        <Field label="Recent Scene Rhythm">
          {state.scene.recentSceneTypes.length > 0 ? (
            <span className="flex flex-wrap gap-1">
              {state.scene.recentSceneTypes.map((type, index) => (
                <Chip key={`${type}-${index}`}>{SCENE_TYPE_LABELS[type]}</Chip>
              ))}
            </span>
          ) : "No recent scenes recorded"}
        </Field>
      </div>
      {state.threads.unresolved.length > 0 && (
        <Field label={`Open Threads (${state.threads.unresolved.length})`}>
          <ul className="flex flex-col gap-1">
            {state.threads.unresolved.map(thread => (
              <li key={thread.description} className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                <span className="min-w-0 break-words">
                  {thread.description}
                  <span className="text-white/30"> (since chapter {thread.originChapter})</span>
                </span>
              </li>
            ))}
          </ul>
        </Field>
      )}

      <div className="border-t border-white/5 pt-3">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Previous Ending</div>
        {previousEnding
          ? <HandoffSummary handoff={previousEnding} />
          : <EmptyNote>First chapter of the story — there is no previous ending to continue from.</EmptyNote>}
      </div>

      <div className="border-t border-white/5 pt-3">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Existing Anchors</div>
        {packet.existingAnchors
          ? <AnchorList anchors={packet.existingAnchors} />
          : <EmptyNote>No carried ending anchors — the plan starts from the mission and current state.</EmptyNote>}
      </div>

      <div className="border-t border-white/5 pt-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Relevant Retrieved Context</div>
          <span className="font-mono text-[10px] text-white/30">
            ~{packet.contextManifest.totalEstimatedTokens.toLocaleString()} tokens
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {packet.relevantContext.sections.map(section => (
            <Chip key={section.key}>
              {formatKey(section.key)} · ~{section.estimatedTokens.toLocaleString()} tok
            </Chip>
          ))}
        </div>
        <div className="mt-2">
          <Collapsible title="Assembled context text" meta={charCount(packet.relevantContext.assembledText)} copyText={packet.relevantContext.assembledText}>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-white/60 [overflow-wrap:anywhere]">{packet.relevantContext.assembledText}</pre>
          </Collapsible>
        </div>
      </div>
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 2 — Chapter Plan                                                       */
/* -------------------------------------------------------------------------- */

function ChapterPlanStep({ run }: { run: ChapterPipelineRun }) {
  const plan = run.chapterPlan;
  const fate = plan.fateSurvival;

  return (
    <StepShell
      step={2}
      title="Chapter Plan"
      icon={<Compass size={13} />}
      aside={<Chip tone="violet">{SCENE_TYPE_LABELS[plan.resolvedSceneType]}</Chip>}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Recent Rhythm Response">
          <span className="flex flex-wrap items-center gap-1">
            {plan.rhythmResponse.recentSceneTypes.length > 0
              ? plan.rhythmResponse.recentSceneTypes.map((type, index) => (
                <Chip key={`${type}-${index}`}>{SCENE_TYPE_LABELS[type]}</Chip>
              ))
              : <span className="text-white/40">No recent scenes</span>}
          </span>
        </Field>
        <Field label="Selected Pressure Tier">{plan.rhythmResponse.selectedPressureTier}</Field>
      </div>
      <p className="text-xs leading-relaxed text-white/60">{plan.rhythmResponse.direction}</p>

      <div className="border-t border-white/5 pt-3">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Selected Path</div>
        {plan.selectedScenePath ? (
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip tone="cyan">{SCENE_TYPE_LABELS[plan.selectedScenePath.type]}</Chip>
              {plan.selectedScenePath.blocked.length > 0 && (
                <Chip tone="amber">
                  Blocked: {plan.selectedScenePath.blocked.map(type => SCENE_TYPE_LABELS[type]).join(", ")}
                </Chip>
              )}
            </div>
            <p className="break-words text-xs leading-relaxed text-white/70">{plan.selectedScenePath.anchor}</p>
            <p className="text-[11px] leading-relaxed text-white/40">{plan.selectedScenePath.reason}</p>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-white/60">
            No anchor path selected — the plan falls back to a{" "}
            <span className="text-white/85">{SCENE_TYPE_LABELS[plan.resolvedSceneType]}</span> chapter.
          </p>
        )}
      </div>

      <div className="border-t border-white/5 pt-3">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Fate Survival Decision</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone={fate.configured ? "cyan" : "neutral"}>{fate.configured ? "Configured" : "Not configured"}</Chip>
          <Chip tone={fate.applies ? "rose" : "neutral"}>{fate.applies ? "Applies this chapter" : "Does not apply"}</Chip>
          {fate.visibility && <Chip>Visibility: {fate.visibility}</Chip>}
          {fate.pressure && <Chip>Pressure: {fate.pressure}</Chip>}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-white/60">{fate.approach}</p>
      </div>

      <div className="border-t border-white/5 pt-3">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Chosen Effects</div>
        <ul className="flex flex-col gap-1.5">
          {plan.effects.map(effect => (
            <li key={effect.kind} className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 flex shrink-0 items-center gap-1">
                <Chip tone="violet">{EFFECT_KIND_LABELS[effect.kind] ?? effect.kind}</Chip>
                <Chip tone={effect.required ? "emerald" : "neutral"}>{effect.required ? "Required" : "Optional"}</Chip>
              </span>
              <span className="min-w-0 break-words text-xs leading-relaxed text-white/60">{effect.intent}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-white/5 pt-3">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Scene Progression</div>
        <ol className="flex flex-col gap-2">
          {plan.sceneProgression.map(scene => (
            <li key={scene.order} className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 font-mono text-[10px] text-white/30">{scene.order}</span>
              <div className="min-w-0">
                <p className="break-words text-xs leading-relaxed text-white/75">{scene.purpose}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/35">{scene.pacing}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-3 sm:grid-cols-2">
        <Field label="Pacing Decision">{plan.pacing.directive}</Field>
        <Field label="Pacing Shape">{plan.pacing.shape}</Field>
      </div>
      <Field label="Intended Ending">{plan.intendedEnding}</Field>
      <Field label="Next-Chapter Handoff Target">{plan.nextChapterHandoffTarget}</Field>
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Step 4 — Chapter Results                                                    */
/* -------------------------------------------------------------------------- */

const SEVERITY_TONES: Record<string, ChipTone> = {
  info: "neutral",
  warning: "amber",
  serious: "rose",
};

function ChapterResultsStep({ run }: { run: ChapterPipelineRun }) {
  const result = run.processingResult;
  const findingList = (findings: typeof result.continuityFindings, emptyNote: string) => (
    findings.length > 0 ? (
      <ul className="flex flex-col gap-1.5">
        {findings.map(finding => (
          <li key={finding.code} className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 shrink-0"><Chip tone={SEVERITY_TONES[finding.severity]}>{finding.severity}</Chip></span>
            <span className="min-w-0 break-words text-xs leading-relaxed text-white/65">{finding.message}</span>
          </li>
        ))}
      </ul>
    ) : <EmptyNote>{emptyNote}</EmptyNote>
  );

  return (
    <StepShell
      step={4}
      title="Chapter Results"
      icon={<ListChecks size={13} />}
      aside={(
        <Chip tone={result.missionCompletion.completed ? "emerald" : "rose"}>
          {result.missionCompletion.completed ? "Mission Complete" : "Mission Incomplete"}
        </Chip>
      )}
    >
      <Field label="Mission Completion Evidence">{result.missionCompletion.evidence}</Field>
      {run.repairApplied && (
        <Chip tone="amber">A repair pass ran after a serious finding; results describe the repaired chapter.</Chip>
      )}

      <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-3 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-widest text-white/40">Continuity Findings</div>
          {findingList(result.continuityFindings, "No continuity findings.")}
        </div>
        <div>
          <div className="mb-1.5 text-[10px] uppercase tracking-widest text-white/40">Repetition Findings</div>
          {findingList(result.repetitionFindings, "No repetition findings.")}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-3 sm:grid-cols-2">
        <Field label="Character Changes">
          {result.characterChanges.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {result.characterChanges.map(change => <li key={change} className="break-words">{change}</li>)}
            </ul>
          ) : <EmptyNote>No character state changes.</EmptyNote>}
        </Field>
        <Field label="World Changes">
          {result.worldStateChanges.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {result.worldStateChanges.map(change => <li key={change} className="break-words">{change}</li>)}
            </ul>
          ) : <EmptyNote>No world state changes.</EmptyNote>}
        </Field>
      </div>

      <div className="border-t border-white/5 pt-3">
        <div className="mb-1.5 text-[10px] uppercase tracking-widest text-white/40">Thread Changes</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone="emerald">{result.threads.completed.length} completed</Chip>
          <Chip tone="cyan">{result.threads.changed.length} changed</Chip>
          <Chip>{result.threads.unresolved.length} still open</Chip>
        </div>
        {result.threads.unresolved.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1">
            {result.threads.unresolved.map(thread => (
              <li key={thread.description} className="flex items-start gap-2 text-xs leading-relaxed text-white/60">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                <span className="min-w-0 break-words">
                  {thread.description}
                  <span className="text-white/30"> (since chapter {thread.originChapter})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {result.newAnchors && (
        <div className="border-t border-white/5 pt-3">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-white/40">
            <Anchor size={11} /> Newly Generated Anchors
          </div>
          <AnchorList anchors={result.newAnchors} />
        </div>
      )}

      <div className="border-t border-white/5 pt-3">
        <div className="mb-2 text-[10px] uppercase tracking-widest text-white/40">Next-Chapter Handoff</div>
        <HandoffSummary handoff={result.nextChapterHandoff} />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
        <span className="text-[10px] uppercase tracking-widest text-white/40">Proposed Next Position</span>
        <Chip tone="cyan">{result.proposedLivingStoryState.position.display}</Chip>
        <span className="text-[10px] italic text-white/30">
          Proposal only — nothing is committed to the story in this pass.
        </span>
      </div>
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Technical Details                                                           */
/* -------------------------------------------------------------------------- */

function TechnicalDetails({ run }: { run: ChapterPipelineRun }) {
  const finalOutputJson = JSON.stringify(run.finalOutput, null, 2);

  return (
    <details className="group min-w-0 rounded-lg border border-white/10 bg-black/30">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <FileJson size={13} className="shrink-0 text-white/40" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold uppercase tracking-widest text-white/70">Technical Details</span>
          <span className="mt-0.5 block text-[10px] normal-case tracking-normal text-white/35">
            Raw packets, prompts, token estimates, and JSON for debugging.
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-white/30">
          {run.modelCalls.join(" → ")}
        </span>
      </summary>
      <div className="flex flex-col gap-2 border-t border-white/10 px-3 py-3">
        {run.stages.map(stage => (
          <Collapsible
            key={stage.key}
            title={<span>{stage.name} <span className="text-white/30">— {stage.description}</span></span>}
            meta={`${stage.sizeChars.toLocaleString()} chars · ~${stage.tokenEstimate.toLocaleString()} tok`}
            copyText={stage.content}
          >
            <pre className="max-h-72 overflow-auto overscroll-contain whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-emerald-200/70 [overflow-wrap:anywhere]">
              {stage.content}
            </pre>
          </Collapsible>
        ))}
        <Collapsible
          title="Final Output — ChapterContent with attached contract, context manifest, and handoff"
          meta={charCount(finalOutputJson)}
          copyText={finalOutputJson}
        >
          <pre className="max-h-72 overflow-auto overscroll-contain whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-emerald-200/70 [overflow-wrap:anywhere]">
            {finalOutputJson}
          </pre>
        </Collapsible>
      </div>
    </details>
  );
}

/* -------------------------------------------------------------------------- */
/* Workspace                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The Development Chapter Generation workspace: permanent story rules on top,
 * the current four-stage run below it, and all raw JSON tucked into one
 * collapsed Technical Details section. The Reference inspector stays the
 * technical comparison.
 */
export function ChapterGenerationWorkspace({ run }: ChapterGenerationWorkspaceProps) {
  const chapterForReading = run.repairApplied ? run.finalOutput : run.manifestedChapter;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 overflow-x-hidden px-3 py-6 sm:px-4">
      <PermanentStoryRules packet={run.chapterPacket} />

      <WorkspaceRegion
        title="Current Chapter Run"
        description="Everything on this run changes chapter to chapter: one packet assembled in code, one plan, one manifested chapter, one processing result."
        headerAside={<Chip tone="cyan">{run.chapterPacket.arcChapterPosition.display}</Chip>}
      >
        <div className="flex flex-col gap-4">
          <ChapterPacketStep packet={run.chapterPacket} />
          <ChapterPlanStep run={run} />
          <StepShell step={3} title="Manifested Chapter" icon={<PenLine size={13} />}>
            <ManifestedChapterView
              chapter={chapterForReading}
              title={run.chapterPacket.chapterMission.title}
              repaired={run.repairApplied}
            />
          </StepShell>
          <ChapterResultsStep run={run} />
        </div>
      </WorkspaceRegion>

      <TechnicalDetails run={run} />
    </div>
  );
}

export default ChapterGenerationWorkspace;
