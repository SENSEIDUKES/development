import { useEffect, useState } from 'react';
import { ARC_LENGTH } from '@seihouse/sen/arc-goals';
import { Hourglass, Target, Pin } from 'lucide-react';
import { HARD_PIN_LIMIT, HARD_PIN_TEXT_LIMIT, type StorySeedInput, type FunSettingLevel } from '@seihouse/sen/story-seed';
import { getSeedSection } from '../seedSections';
import { patchFunSettings, patchWorldFoundations, funSettings, worldFoundations, type UpdateSeed } from '../seedState';
import { NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { WorkspaceShell } from './WorkspaceShell';
import { handleRadioGroupKeyDown } from '../radioGroupKeyboard';

interface ArcWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
  /** The Blueprint review edits Arc 1's opening goal inside its roadmap instead. */
  showActiveArcGoal?: boolean;
}

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
  help: string;
  levelCopy: Record<FunSettingLevel, string>;
}> = [
  {
    key: 'faceSlap',
    id: 'face-slap',
    label: 'Face Slap',
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
    help: 'Controls how much the world notices, remembers, and reacts to the protagonist\'s achievements.',
    levelCopy: {
      low: 'Achievements stay hidden, misunderstood, suppressed, or known only by a few.',
      medium: 'Major wins build reputation gradually, region by region.',
      high: 'The protagonist\'s name spreads fast. Wins create fear, respect, enemies, invitations, and status shifts.',
    },
  },
];

export const ArcWorkspace = ({ seed, updateSeed, showActiveArcGoal = true }: ArcWorkspaceProps) => {
  const section = getSeedSection('arc');
  const settings = funSettings(seed);
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
  return (
    <WorkspaceShell section={section} complete={section.isFilled(seed)}>
      <LibraryTextArea id="destined-ending-input" label="Destined Ending" icon={Hourglass} maxLength={1500}
        helpText="The true long-term destination of this novel. If left blank, the Library recommends a fitting ending from your Origin. You can alter this outcome later."
        value={worldFoundations(seed).destinedEnding || ''}
        onChange={value => updateSeed(patchWorldFoundations({ destinedEnding: value }))} rows={3} />
      <section aria-labelledby="arc-hard-pins-title" className="glass-panel p-4 sm:p-5">
        <h3 id="arc-hard-pins-title" className="font-display text-lg text-[#DDC58A]">Hard Pins</h3>
        <p className="mb-4 text-xs text-neutral-400">Long-term promises the story must keep on the way to its Destined Ending. Up to three, all optional.</p>
        <div className="space-y-3">
          {Array.from({ length: HARD_PIN_LIMIT }, (_, index) => (
            <LibraryTextBox key={index} id={`hard-pin-${index + 1}`} label={`Hard Pin ${index + 1}`} icon={Pin}
              maxLength={HARD_PIN_TEXT_LIMIT} value={pinDrafts[index] ?? ''} onChange={value => updatePin(index, value)} />
          ))}
        </div>
      </section>
      {showActiveArcGoal && <>
        <LibraryTextBox id="active-arc-goal-input" label="Active Arc Goal" icon={Target}
          helpText="The first goal of Arc 1: what the story works toward right now. The Blueprint plans every arc from here to the Destined Ending, and you review that whole roadmap before the story begins."
          value={seed.story.optional.activeArcGoal?.text ?? ''}
          onChange={text => updateSeed(current => ({ ...current, story: { ...current.story, optional: {
            ...current.story.optional, activeArcGoal: text.trim() ? { id: current.story.optional.activeArcGoal?.id ?? 'arc-1-initial', text, chapters: ARC_LENGTH } : undefined,
          } } }))} />
        <p className="text-xs text-neutral-400">Leave the goal blank for a Blueprint suggestion you can review.</p>
      </>}
      <section className="glass-panel p-4 sm:p-5" aria-labelledby="arc-fun-settings-title">
        <div className="mb-4">
          <h3
            id="arc-fun-settings-title"
            className="font-sc text-xs font-bold uppercase tracking-[0.18em] text-[#DDC58A]"
          >
            Fun Settings
          </h3>
          <p className="mt-1 font-sans text-xs leading-relaxed text-neutral-400">
            Optional ingredients you want the story to make room for because they make it more enjoyable.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {FUN_SETTINGS.map(setting => {
            const selected = settings[setting.key] || 'medium';
            return (
              <fieldset
                key={setting.key}
                className="min-w-0 rounded-xl border border-neutral-800/90 bg-neutral-950/45 p-3"
              >
                <legend className="px-1 font-display text-base font-bold tracking-wide text-[#F3EDE0]">
                  {setting.label}
                </legend>
                <p
                  id={`arc-${setting.id}-summary`}
                  className="mt-1 min-h-12 font-sans text-[11px] leading-relaxed text-neutral-400 md:min-h-16"
                >
                  {setting.help}
                </p>
                <div
                  role="radiogroup"
                  aria-label={`${setting.label} level`}
                  aria-describedby={`arc-${setting.id}-summary arc-${setting.id}-description`}
                  className="mt-3 grid grid-cols-3 gap-1.5"
                >
                  {FUN_LEVELS.map(option => {
                    const isSelected = selected === option.value;
                    return (
                      <button
                        key={option.value}
                        id={`arc-${setting.id}-${option.value}`}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        title={setting.levelCopy[option.value]}
                        onClick={() => updateSeed(patchFunSettings({ [setting.key]: option.value }))}
                        onKeyDown={handleRadioGroupKeyDown}
                        className={`min-h-11 cursor-pointer rounded-lg border px-1.5 font-sc text-[10px] font-bold uppercase tracking-[0.08em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB271]/70 ${
                          isSelected
                            ? 'border-[#CDB271]/55 bg-[#CDB271]/10 text-[#F3EDE0] shadow-[0_0_12px_rgba(205,178,113,0.1)]'
                            : 'border-neutral-800 bg-neutral-950/70 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <p
                  id={`arc-${setting.id}-description`}
                  aria-live="polite"
                  className="mt-3 font-sans text-[11px] leading-relaxed text-neutral-300"
                >
                  {setting.levelCopy[selected]}
                </p>
              </fieldset>
            );
          })}
        </div>
      </section>

    </WorkspaceShell>
  );
};
