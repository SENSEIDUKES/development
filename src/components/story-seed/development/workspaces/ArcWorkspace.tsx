import { useEffect, useState } from 'react';
import { ARC_LENGTH, STORY_LENGTH_ARCS } from '@seihouse/sen/arc-goals';
import { Hourglass, Milestone, Target, Pin } from 'lucide-react';
import { HARD_PIN_LIMIT, HARD_PIN_TEXT_LIMIT, type StorySeedInput, type FunSettingLevel } from '@seihouse/sen/story-seed';
import { getSeedSection } from '../seedSections';
import { patchFunSettings, patchWorldFoundations, funSettings, worldFoundations, type UpdateSeed } from '../seedState';
import { NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { SeedPart } from '../creator/SeedPart';
import { SeedNote, SeedSectionFrame, SeedSegmented } from './SeedSectionFrame';

interface ArcWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
  /** The Blueprint review edits Arc 1's opening goal inside Arc 1's goals instead. */
  showActiveArcGoal?: boolean;
  /** The Blueprint review edits the Story Length beside Arc 1's goals instead. */
  showStoryLength?: boolean;
}

const arcsLabel = (count: number) => `${count} ${count === 1 ? 'arc' : 'arcs'}`;

/** The typed Story Length: a length, blank (`undefined`), or `null` while the text is not a length yet. */
const readStoryLength = (value: string): number | undefined | null => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const count = Number(trimmed);
  return Number.isInteger(count) && count >= STORY_LENGTH_ARCS.min && count <= STORY_LENGTH_ARCS.max ? count : null;
};

type FunSettingKey = 'faceSlap' | 'plotArmor' | 'recognition';

const FUN_LEVELS: ReadonlyArray<{
  value: FunSettingLevel;
  label: string;
}> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const FUN_SETTINGS: ReadonlyArray<{
  key: FunSettingKey;
  id: string;
  label: string;
  /** The one line always shown; `help` is the full explanation behind the info toggle. */
  short: string;
  help: string;
  levelCopy: Record<FunSettingLevel, string>;
}> = [
  {
    key: 'faceSlap',
    id: 'face-slap',
    label: 'Face Slap',
    short: 'How often arrogant rivals get humbled.',
    help: 'Controls how often arrogant rivals, elites, young masters, nobles, rankers, or social superiors underestimate the protagonist and get humbled.',
    levelCopy: {
      low: 'Rare and meaningful. Face-slaps happen only when the story earns them.',
      medium: 'Classic webnovel rhythm. Regular disrespect, rivalry, and payoff.',
      high: 'Frequent arrogant challengers, public humiliation, status reversals, and revenge satisfaction.',
    },
  },
  {
    key: 'plotArmor',
    id: 'plot-armor',
    label: 'Plot Armor',
    short: 'How often fortune bends around the protagonist.',
    help: 'Controls how often fortune bends around the protagonist.',
    levelCopy: {
      low: 'The protagonist survives through cost, sacrifice, and hard consequences.',
      medium: 'Balanced luck. The protagonist gets chances, but still pays for mistakes.',
      high: 'Fate often opens doors: lucky breaks, timely escapes, hidden opportunities, and impossible survival moments.',
    },
  },
  {
    key: 'recognition',
    id: 'recognition',
    label: 'Recognition',
    short: 'How much the world notices the protagonist.',
    help: 'Controls how much the world notices, remembers, and reacts to the protagonist\'s achievements.',
    levelCopy: {
      low: 'Achievements stay hidden, misunderstood, suppressed, or known only by a few.',
      medium: 'Major wins build reputation gradually, region by region.',
      high: 'The protagonist\'s name spreads fast. Wins create fear, respect, enemies, invitations, and status shifts.',
    },
  },
];

export const ArcWorkspace = ({ seed, updateSeed, showActiveArcGoal = true, showStoryLength = true }: ArcWorkspaceProps) => {
  const section = getSeedSection('arc');
  const settings = funSettings(seed);
  const savedLength = seed.story.optional.arcCount;
  const [lengthText, setLengthText] = useState(() => savedLength === undefined ? '' : String(savedLength));
  // A length saved elsewhere (the Blueprint review, an import) replaces the
  // typed text; text that already reads as the saved length stays as typed.
  useEffect(() => {
    setLengthText(current => readStoryLength(current) === savedLength ? current : savedLength === undefined ? '' : String(savedLength));
  }, [savedLength]);
  const typedLength = readStoryLength(lengthText);
  // Only a whole length is saved; while the text is not one, the Seed keeps the last.
  const changeLength = (value: string) => {
    setLengthText(value);
    const count = readStoryLength(value);
    if (count === null) return;
    updateSeed(current => {
      const { arcCount: _previous, ...optional } = current.story.optional;
      return { ...current, story: { ...current.story, optional: count === undefined ? optional : { ...optional, arcCount: count } } };
    });
  };
  const savedPins = JSON.stringify((seed.story.optional.hardPins ?? []).map(pin => pin.text));
  const [pinDrafts, setPinDrafts] = useState<string[]>(() => JSON.parse(savedPins));
  useEffect(() => {
    setPinDrafts(current => JSON.stringify(current.map(text => text.trim()).filter(Boolean)) === savedPins ? current : JSON.parse(savedPins));
  }, [savedPins]);
  const updatePin = (index: number, text: string) => {
    const next = Array.from({ length: HARD_PIN_LIMIT }, (_, i) => i === index ? text : (pinDrafts[i] ?? ''));
    setPinDrafts(next);
    updateSeed(current => ({ ...current, story: { ...current.story, optional: {
      ...current.story.optional, hardPins: next.map(text => text.trim()).filter(Boolean).map(text => ({ text })),
    } } }));
  };
  // Pins appear one at a time: every written pin plus one empty slot, up to the limit.
  const lastWrittenPin = pinDrafts.reduce((last, text, index) => text.trim() ? index : last, -1);
  const visiblePins = Math.min(HARD_PIN_LIMIT, lastWrittenPin + 2);
  return (
    <SeedSectionFrame section={section} complete={section.isFilled(seed)}>
      {/* A phone shows one part at a time (SeedPart); the Active Arc Goal joins the Ending part. */}
      <SeedPart id="ending">
        <div className="space-y-4 sm:space-y-6">
          <LibraryTextArea id="destined-ending-input" label="Destined Ending" icon={Hourglass} maxLength={1500}
            helpText={<SeedNote moreLabel="More about the Destined Ending" more="The true long-term destination of this novel. If left blank, the Library recommends a fitting ending from your Origin. You can alter this outcome later.">Where the novel ultimately ends. Blank? The Library suggests one.</SeedNote>}
            value={worldFoundations(seed).destinedEnding || ''}
            onChange={value => updateSeed(patchWorldFoundations({ destinedEnding: value }))} rows={3} />
          {showStoryLength && <div>
            <LibraryTextBox id="story-length-input" label="Story Length (arcs)" icon={Milestone}
              type="number" min={STORY_LENGTH_ARCS.min} max={STORY_LENGTH_ARCS.max} step={1} inputMode="numeric"
              helpText={<SeedNote moreLabel="More about Story Length" more={`How many arcs of ${ARC_LENGTH} chapters the story takes to reach its Destined Ending. Leave it blank and the World Blueprint suggests a length you can change.`}>{`Arcs of ${ARC_LENGTH} chapters. Blank? The Blueprint suggests one.`}</SeedNote>}
              value={lengthText} invalid={typedLength === null}
              error={typedLength === null ? `Choose a whole number of arcs from ${STORY_LENGTH_ARCS.min} to ${STORY_LENGTH_ARCS.max}.` : undefined}
              onChange={changeLength} />
            {typeof typedLength === 'number' && (
              <p className="mt-2 text-xs text-neutral-400" data-testid="story-length-summary">
                {arcsLabel(typedLength)} · {(typedLength * ARC_LENGTH).toLocaleString('en-US')} chapters. Arc {typedLength}, the final arc, reaches the Destined Ending.
              </p>
            )}
          </div>}
        </div>
      </SeedPart>
      <SeedPart id="pins">
        <section aria-labelledby="arc-hard-pins-title" className="glass-panel p-4 sm:p-5">
          <h3 id="arc-hard-pins-title" className="font-display text-lg text-[#DDC58A]">Hard Pins</h3>
          <p className="mb-3 text-xs text-neutral-400">Promises the story must keep on the way to its ending. Up to {HARD_PIN_LIMIT}, all optional.</p>
          <div className="space-y-3">
            {Array.from({ length: visiblePins }, (_, index) => (
              <LibraryTextBox key={index} id={`hard-pin-${index + 1}`} label={`Hard Pin ${index + 1}`} icon={Pin}
                maxLength={HARD_PIN_TEXT_LIMIT} value={pinDrafts[index] ?? ''} onChange={value => updatePin(index, value)} />
            ))}
          </div>
        </section>
      </SeedPart>
      {showActiveArcGoal && <SeedPart id="ending">
        <LibraryTextBox id="active-arc-goal-input" label="Active Arc Goal" icon={Target}
          helpText={<SeedNote moreLabel="More about the Active Arc Goal" more="The Blueprint plans Arc 1 around it; each later arc is planned when it begins, and you review its goals then.">What Arc 1 works toward first. Blank? The Blueprint suggests one you can review.</SeedNote>}
          value={seed.story.optional.activeArcGoal?.text ?? ''}
          onChange={text => updateSeed(current => ({ ...current, story: { ...current.story, optional: {
            ...current.story.optional, activeArcGoal: text.trim() ? { id: current.story.optional.activeArcGoal?.id ?? 'arc-1-initial', text, chapters: ARC_LENGTH } : undefined,
          } } }))} />
      </SeedPart>}
      <SeedPart id="fun">
        <section className="glass-panel p-4 sm:p-5" aria-labelledby="arc-fun-settings-title">
          <h3 id="arc-fun-settings-title" className="font-sc text-xs font-bold uppercase tracking-[0.18em] text-[#DDC58A]">
            Fun Settings
          </h3>
          <p className="mt-1 font-sans text-xs leading-relaxed text-neutral-400">
            Ingredients the story makes room for because they make it more enjoyable.
          </p>
          <div className="mt-3 grid grid-cols-1 divide-y divide-neutral-800/70 md:grid-cols-3 md:gap-4 md:divide-y-0">
            {FUN_SETTINGS.map(setting => (
              <fieldset key={setting.key} className="min-w-0 py-3 first:pt-0 last:pb-0 md:py-0">
                <legend className="mb-1.5 flex items-center font-display text-base font-bold tracking-wide text-[#F3EDE0]">
                  {setting.label}
                </legend>
                <p id={`arc-${setting.id}-summary`} className="mb-2 font-sans text-[11px] leading-relaxed text-neutral-400">
                  {setting.short === setting.help ? setting.help : <SeedNote moreLabel={`More about ${setting.label}`} more={setting.help}>{setting.short}</SeedNote>}
                </p>
                <SeedSegmented label={`${setting.label} level`} idPrefix={`arc-${setting.id}`}
                  describedBy={`arc-${setting.id}-summary`}
                  value={settings[setting.key] || 'medium'}
                  options={FUN_LEVELS.map(level => ({ ...level, description: setting.levelCopy[level.value] }))}
                  onSelect={level => updateSeed(patchFunSettings({ [setting.key]: level }))} />
              </fieldset>
            ))}
          </div>
        </section>
      </SeedPart>
    </SeedSectionFrame>
  );
};
