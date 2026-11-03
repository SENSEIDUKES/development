import { useContext } from 'react';
import { type StorySeedInput, type FunSettingLevel } from '@seihouse/sen/story-seed';
import { SeedConfirmationContext } from '../creator/SeedPart';
import { funSettings, patchFunSettings, type UpdateSeed } from '../seedState';
import { SeedNote, SeedSegmented } from './SeedSectionFrame';

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

/** The same settings in Origin and the Blueprint's Origin snapshot. */
export function FunSettingsPanel({ seed, updateSeed }: { seed: StorySeedInput; updateSeed: UpdateSeed }) {
  const settings = funSettings(seed);
  const confirm = useContext(SeedConfirmationContext);
  return (
    <section className="glass-panel p-4 sm:p-5" aria-labelledby="origin-fun-settings-title">
      <h3 id="origin-fun-settings-title" className="font-sc text-xs font-bold uppercase tracking-[0.18em] text-[#DDC58A]">
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
            <p id={`origin-${setting.id}-summary`} className="mb-2 font-sans text-[11px] leading-relaxed text-neutral-400">
              {setting.short === setting.help ? setting.help : <SeedNote moreLabel={`More about ${setting.label}`} more={setting.help}>{setting.short}</SeedNote>}
            </p>
            <SeedSegmented label={`${setting.label} level`} idPrefix={`origin-${setting.id}`}
              describedBy={`origin-${setting.id}-summary`}
              value={settings[setting.key] || 'medium'}
              options={FUN_LEVELS.map(level => ({ ...level, description: setting.levelCopy[level.value] }))}
              onSelect={level => { updateSeed(patchFunSettings({ [setting.key]: level })); confirm('origin.fun'); }} />
          </fieldset>
        ))}
      </div>
    </section>
  );
}
