import type { ReactNode } from 'react';
import { FileText, Puzzle } from 'lucide-react';
import type { SoundWord, SoundtrackVocabulary } from '@seihouse/sen/audio';
import { getSenLanguageLabel, normalizeChapterWritingStyle } from '@seihouse/sen/contracts';
import {
  ALWAYS_LOADED_SKILLS, CAPA_SCHEMA, SEN_FATE_SURVIVAL_SKILL, SEN_READING_MODE_SKILLS, SEN_SOUND_CUES_SKILL, SEN_SOUNDTRACK_SKILL,
  buildHarnessOfficialOutputRequirements, harnessSkillKey, resolveStoryLanguagePackage,
  type CapaSlotManager, type HarnessSkillManifest, type HarnessSkillReference, type HarnessSkillSlotId, type HarnessStoryMode,
} from '@seihouse/sen/harness-generation';
import { NarrativePanel as LibraryPanel } from '@seihouse/sen/presentation';
import type { StorySettingsValues } from './storySettingsValues';

type ManagedCapaSlot = (typeof CAPA_SCHEMA)[number] & { managedBy: CapaSlotManager };

/**
 * What a managed slot resolves to for this story right now, from the same
 * rules loadout freezing uses.
 */
const managedSlotInspection = (
  slot: ManagedCapaSlot,
  story: StorySettingsValues,
  fateMode: HarnessStoryMode,
  installedSkills: readonly HarnessSkillManifest[],
  soundWords: readonly SoundWord[],
  soundtrackWords: SoundtrackVocabulary,
): { status: 'Loaded' | 'Not used' | 'No package' | 'Blocked'; summary: string; skill?: HarnessSkillManifest } => {
  switch (slot.managedBy) {
    case 'always': {
      const skill = ALWAYS_LOADED_SKILLS[slot.id];
      const loaded = skill && installedSkills.some(installed => installed.id === skill.id && installed.version === skill.version);
      if (slot.id === 'holdings') {
        return loaded && skill
          ? { status: 'Loaded', skill, summary: `${skill.name} v${skill.version} loads on every chapter: the writer reads what every character has, uses only that, and tags each change.` }
          : { status: 'No package', summary: 'This host has no Holdings skill, so chapters are written without holding tags and nothing new is recorded.' };
      }
      return loaded && skill
        ? { status: 'Loaded', skill, summary: `${skill.name} v${skill.version} loads on every chapter, so the Reader knows who speaks each line.` }
        : { status: 'No package', summary: 'This host has no Speakers skill, so chapters are written without speaker tags and Read Aloud takes every speaker from the narration.' };
    }
    case 'media-loadout':
      if (slot.id === 'soundtrack') {
        const loaded = installedSkills.some(installed => installed.id === SEN_SOUNDTRACK_SKILL.id && installed.version === SEN_SOUNDTRACK_SKILL.version);
        if (!soundtrackWords.moods.length && !soundtrackWords.atmospheres.length) {
          return { status: 'Not used', summary: 'This story has no music moods or atmospheres, so this slot stays empty. It follows the story\'s Media Loadout and is never equipped by hand.' };
        }
        return loaded
          ? { status: 'Loaded', skill: SEN_SOUNDTRACK_SKILL, summary: `${SEN_SOUNDTRACK_SKILL.name} v${SEN_SOUNDTRACK_SKILL.version} loads with this story's ${soundtrackWords.moods.length} music moods and ${soundtrackWords.atmospheres.length} atmospheres: the writer chooses one of each at every chapter's start.` }
          : { status: 'No package', summary: 'This host has no Soundtrack skill, so chapters choose no music or atmosphere and the Reader goes on with what plays.' };
      }
      return soundWords.length
        ? { status: 'Loaded', skill: SEN_SOUND_CUES_SKILL, summary: `${SEN_SOUND_CUES_SKILL.name} v${SEN_SOUND_CUES_SKILL.version} loads with this story's ${soundWords.length} sound words from its Media Loadout.` }
        : { status: 'Not used', summary: 'This story has no sound words, so this slot stays empty. It follows the story\'s Media Loadout and is never equipped by hand.' };
    case 'fate-mode':
      return fateMode === 'survival'
        ? { status: 'Loaded', skill: SEN_FATE_SURVIVAL_SKILL, summary: `${SEN_FATE_SURVIVAL_SKILL.name} v${SEN_FATE_SURVIVAL_SKILL.version} loads on every chapter of this Fate Survival story.` }
        : { status: 'Not used', summary: 'Regular Reader stories leave this slot empty. It follows the story\'s Fate mode and is never equipped by hand.' };
    case 'reading-mode': {
      const mode = normalizeChapterWritingStyle(story.chapterWritingStyle);
      if (mode === 'Standard') return { status: 'Not used', summary: 'The Reading Mode is Standard, so this slot stays empty. It follows the story\'s Reading Mode and is never equipped by hand.' };
      const skill = SEN_READING_MODE_SKILLS[mode];
      return { status: 'Loaded', skill, summary: `${skill.name} v${skill.version} loads on every chapter while the Reading Mode is ${mode}.` };
    }
    case 'story-language': {
      const language = getSenLanguageLabel(story.originalLanguage);
      const support = resolveStoryLanguagePackage(installedSkills, story.originalLanguage);
      switch (support.status) {
        case 'not-needed':
          return { status: 'Not used', summary: 'This story is written in English, so this slot stays empty. It follows the story\'s Story Language and is never equipped by hand.' };
        case 'loaded':
          return { status: 'Loaded', skill: support.skill, summary: `${support.skill.name} v${support.skill.version} writes every chapter in ${language}.` };
        case 'missing':
          return { status: 'No package', summary: `No ${language} writing package is installed. Chapters are written in ${language} from the HARNESS Story Language requirement alone.` };
        case 'ambiguous':
          return { status: 'Blocked', summary: support.message };
      }
    }
  }
};

/**
 * The story's CAPA skill slots, as Story Settings shows them: the hand-equipped
 * slots (Author, Pacing, Continuity, Style) to choose from the host's installed
 * skills, and the managed slots that follow the story's own choices (Fate mode,
 * Reading Mode, Story Language, Media Loadout) or load on every chapter. With
 * `inspect` (the HARNESS developer page) it also shows each skill's
 * instructions, the Official Requirements and the slot uploads.
 */
export function StorySkillSlots({
  story,
  fateMode,
  installedSkills,
  soundWords,
  soundtrackWords,
  busy,
  onChange,
  renderSlotSkillImport,
  onInstalled,
  inspect = false,
  stacked = false,
}: {
  /** The story's settings, or a story being created: what it will start with. */
  story: StorySettingsValues;
  /** The story's Fate mode, which fills the mode-managed Fate slot. */
  fateMode: HarnessStoryMode;
  installedSkills: readonly HarnessSkillManifest[];
  /** The story's sound words, which fill the Media Loadout-managed Sound Cues slot. */
  soundWords: readonly SoundWord[];
  /** The story's music moods and atmospheres, which fill the Media Loadout-managed Soundtrack slot. */
  soundtrackWords: SoundtrackVocabulary;
  busy: boolean;
  onChange: (slot: HarnessSkillSlotId, reference?: HarnessSkillReference) => void;
  renderSlotSkillImport?: (slot: HarnessSkillSlotId, busy: boolean, equip: (skill: HarnessSkillManifest) => Promise<void>) => ReactNode;
  onInstalled?: (slot: HarnessSkillSlotId, skill: HarnessSkillManifest) => Promise<void>;
  /** The developer page's inspection: the CAPA Prompt's terms, skill instructions and the Official Requirements. */
  inspect?: boolean;
  /** One slot per row, for a narrow place such as a settings sheet. */
  stacked?: boolean;
}) {
  const installedByKey = new Map(installedSkills.map(skill => [harnessSkillKey(skill), skill]));
  // Managed slots follow story state, so only hand-equipped slots count here.
  const equippableSlots = CAPA_SCHEMA.filter(slot => !slot.managedBy);
  const managedCount = CAPA_SCHEMA.length - equippableSlots.length;
  const equippedCount = equippableSlots.filter(slot => story.skillLoadout?.[slot.id]).length;
  const missingCount = equippableSlots
    .map(slot => story.skillLoadout?.[slot.id])
    .filter(reference => reference && !installedByKey.has(harnessSkillKey(reference))).length;
  const readingModeLoaded = normalizeChapterWritingStyle(story.chapterWritingStyle) !== 'Standard';
  const translationLoaded = resolveStoryLanguagePackage(installedSkills, story.originalLanguage).status === 'loaded';
  const officialRequirements = buildHarnessOfficialOutputRequirements({
    originalLanguage: story.originalLanguage,
    accessibility: readingModeLoaded,
    translation: translationLoaded,
  });

  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-skills-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Puzzle size={18} className="text-cyan-200" aria-hidden="true" />
            <h2 id="harness-skills-title" className="font-display text-xl text-white">CAPA skill slots</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
            {inspect
              ? 'The Author skill tells the model how to write. Equipped generation skills are assembled once, in schema order, into the CAPA Prompt frozen with each chapter attempt. Fate, Accessibility, Translation, Sound Cues and Soundtrack follow the story\'s Fate mode, Reading Mode, Story Language and Media Loadout; Speakers and Holdings load on every chapter.'
              : 'The skills every chapter is written with. Choose the Author, Pacing, Continuity and Style skills; the rest follow your story\'s Fate mode, Reading Mode, Story Language and media, or load on every chapter. A change applies to chapters written from then on.'}
          </p>
        </div>
        {inspect && <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-cyan-100">
          {equippedCount}/{equippableSlots.length} equipped · {managedCount} managed
        </span>}
      </div>

      {missingCount > 0 && (
        <p role="alert" className="mt-4 rounded-xl border border-human/30 bg-human-brand/10 p-3 text-sm text-human">
          {missingCount} equipped {missingCount === 1 ? 'skill is' : 'skills are'} unavailable in this host. Reinstall or empty the affected slot before generation.
        </p>
      )}

      <div className={`mt-5 grid gap-3 ${stacked ? '' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
        {CAPA_SCHEMA.map(slot => {
          if (slot.managedBy) {
            const managed = managedSlotInspection(slot as ManagedCapaSlot, story, fateMode, installedSkills, soundWords, soundtrackWords);
            const loaded = managed.status === 'Loaded';
            const blocked = managed.status === 'Blocked';
            return (
              <article key={slot.id} data-testid={`harness-${slot.id}-slot`} data-status={managed.status} className={`rounded-xl border p-4 ${loaded ? 'border-cyan-300/30 bg-cyan-400/[0.07]' : blocked ? 'border-human/30 bg-human-brand/[0.06]' : 'border-white/10 bg-black/20'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <Puzzle size={16} className="shrink-0 text-cyan-200/75" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-white">{slot.label}</h3>
                  </div>
                  <span className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] ${loaded ? 'text-cyan-100' : blocked ? 'text-human' : 'text-neutral-500'}`}>
                    {managed.status}
                  </span>
                </div>
                <p className="mt-2 min-h-10 text-xs leading-relaxed text-neutral-500">{slot.description}</p>
                <p className="mt-3 text-xs leading-relaxed text-neutral-300">{managed.summary}</p>
                {inspect && managed.skill?.instructions && (
                  <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <summary className="cursor-pointer text-[11px] font-medium text-cyan-100">View skill instructions</summary>
                    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-neutral-300">{managed.skill.instructions}</pre>
                  </details>
                )}
              </article>
            );
          }
          const reference = story.skillLoadout?.[slot.id];
          const selectedKey = reference ? harnessSkillKey(reference) : '';
          const selected = reference ? installedByKey.get(selectedKey) : undefined;
          const slotSkills = installedSkills.filter(skill => skill.slot === slot.id);
          const missing = Boolean(reference && !selected);
          const applications = selected?.applications.map(value => value.replace(/-/g, ' ')).join(' · ');
          return (
            <article key={slot.id} className={`rounded-xl border p-4 ${selected ? 'border-cyan-300/30 bg-cyan-400/[0.07]' : missing ? 'border-human/30 bg-human-brand/[0.06]' : 'border-white/10 bg-black/20'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Puzzle size={16} className="shrink-0 text-cyan-200/75" aria-hidden="true" />
                  <h3 className="text-sm font-semibold text-white">{slot.label}</h3>
                </div>
                <span className={`shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] ${selected ? 'text-cyan-100' : missing ? 'text-human' : 'text-neutral-500'}`}>
                  {selected ? 'Equipped' : missing ? 'Missing' : 'Empty'}
                </span>
              </div>
              <p className="mt-2 min-h-10 text-xs leading-relaxed text-neutral-500">{slot.description}</p>
              <label className="mt-3 block text-[10px] uppercase tracking-[0.14em] text-neutral-500" htmlFor={`harness-skill-${slot.id}`}>Installed skill</label>
              <select
                id={`harness-skill-${slot.id}`}
                value={selectedKey}
                disabled={busy}
                onChange={event => {
                  const manifest = installedByKey.get(event.target.value);
                  onChange(slot.id, manifest ? { id: manifest.id, version: manifest.version } : undefined);
                }}
                className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-neutral-100 outline-none focus:border-cyan-300/60"
              >
                {slot.id !== 'author' && <option value="">No skill equipped</option>}
                {missing && <option value={selectedKey}>{selectedKey} · unavailable</option>}
                {slotSkills.map(skill => <option key={harnessSkillKey(skill)} value={harnessSkillKey(skill)}>
                  {skill.name} · v{skill.version}
                </option>)}
              </select>
              {selected ? (
                <div className="mt-3 border-t border-white/10 pt-3">
                  <p className="text-xs leading-relaxed text-neutral-300">{selected.description}</p>
                  {inspect && <>
                    <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">{applications}</p>
                    {selected.assetCount !== undefined && <p className="mt-1 text-[11px] text-neutral-500">{selected.assetCount} packaged assets</p>}
                    {selected.runtimeLabel && <p className="mt-1 text-[11px] text-neutral-500">Runtime: {selected.runtimeLabel}</p>}
                  </>}
                  {inspect && selected.instructions && (
                    <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      <summary className="cursor-pointer text-[11px] font-medium text-cyan-100">View skill instructions</summary>
                      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-neutral-300">{selected.instructions}</pre>
                    </details>
                  )}
                </div>
              ) : slotSkills.length === 0 && !missing ? (
                <p className="mt-3 text-[11px] text-neutral-500">No installed skill is available for this slot.</p>
              ) : null}
              {/* Direct intake: the package is validated against this slot and
                  equipped here, without a separate global install step. */}
              {renderSlotSkillImport && onInstalled && (
                <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-cyan-100">Upload SPP to {slot.label}</summary>
                  <div className="mt-3">
                    {renderSlotSkillImport(slot.id, busy, skill => onInstalled(slot.id, skill))}
                  </div>
                </details>
              )}
            </article>
          );
        })}
        {inspect && <article className="rounded-xl border border-gold-accent/30 bg-gold-accent/[0.07] p-4" data-testid="harness-official-requirements">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileText size={17} className="shrink-0 text-gold-accent" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-white">Official Requirements</h3>
            </div>
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-gold-accent">
              Locked
            </span>
          </div>
          <p className="mt-2 min-h-10 text-xs leading-relaxed text-neutral-400">
            Permanent HARNESS rules added after the CAPA Skills when a chapter needs them: when Accessibility or Translation loads, or the story is not written in English.
          </p>
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">
            {officialRequirements ? 'Sent with this story\'s chapters · not replaceable' : 'Not sent for this story'}
          </p>
          {officialRequirements && (
            <details className="mt-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <summary className="cursor-pointer text-[11px] font-medium text-gold-accent">View official requirements</summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-neutral-300">{officialRequirements}</pre>
            </details>
          )}
        </article>}
      </div>
    </LibraryPanel>
  );
}

