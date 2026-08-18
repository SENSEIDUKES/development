import { Compass, Hourglass, ShieldAlert, Sparkles, Swords, Target } from 'lucide-react';
import type {
  StorySeedInput,
  StorySeedStorySauceLevel,
} from '../../shared/storySeedSchema';
import { getSeedSection } from '../seedSections';
import {
  patchPlotAndTropeSettings,
  patchWorldFoundations,
  plotAndTropeSettings,
  setAdditionalStoryDirection,
  setMakeItWorkInstruction,
  worldFoundations,
  type UpdateSeed,
} from '../seedState';
import { LibraryTextArea, LibraryTextBox } from '../../../library';
import { WorkspaceShell } from './WorkspaceShell';
import { handleRadioGroupKeyDown } from '../radioGroupKeyboard';

interface ArcWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

type StorySauceKey = 'faceSlap' | 'plotArmor' | 'recognition';

const STORY_SAUCE_LEVELS: ReadonlyArray<{
  value: StorySeedStorySauceLevel;
  label: string;
}> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const MAKE_IT_WORK_PLACEHOLDER = [
  'The main character cultivates immortality through toe kung fu. Make it work.',
  'Every major fighter in this world uses a wheelchair. Make it work.',
  'The weakest bloodline is secretly the only one heaven fears.',
  'The villain is correct, but still has to be stopped.',
  'The protagonist can only grow stronger by losing public fights.',
].join('\n');

const STORY_SAUCE_SETTINGS: ReadonlyArray<{
  key: StorySauceKey;
  id: string;
  label: string;
  help: string;
  levelCopy: Record<StorySeedStorySauceLevel, string>;
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

/**
 * Optional ARC workspace. Story sauce extends the existing
 * `story.optional.plotAndTropeSettings` branch; plot direction, Make It Work,
 * and Destined Ending keep their own canonical paths.
 */
export const ArcWorkspace = ({ seed, updateSeed }: ArcWorkspaceProps) => {
  const section = getSeedSection('arc');
  const settings = plotAndTropeSettings(seed);

  return (
    <WorkspaceShell section={section} complete={section.isFilled(seed)}>
      <section className="glass-panel p-4 sm:p-5" aria-labelledby="arc-story-sauce-title">
        <div className="mb-4">
          <h3
            id="arc-story-sauce-title"
            className="font-sc text-xs font-bold uppercase tracking-[0.18em] text-[#DDC58A]"
          >
            Story Sauce
          </h3>
          <p className="mt-1 font-sans text-xs leading-relaxed text-neutral-400">
            Tune recurring payoff while keeping the story's core direction intact.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {STORY_SAUCE_SETTINGS.map(setting => {
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
                  {STORY_SAUCE_LEVELS.map(option => {
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
                        onClick={() => updateSeed(patchPlotAndTropeSettings({ [setting.key]: option.value }))}
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

      <LibraryTextArea
        id="desired-plot-direction-input"
        label="Story Direction"
        icon={Compass}
        maxLength={1500}
        helpText="Extra direction for the journey — must-have elements, things to avoid, pacing, or plot emphasis."
        value={seed.story.optional.additionalStoryDirection || ''}
        onChange={(value) => updateSeed(setAdditionalStoryDirection(value))}
        rows={3}
        placeholder="e.g. Revenge focused, slow sect building, kingdom conquering..."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <LibraryTextBox
          id="a11y-control-jolpc3b"
          label="Long-term Goal"
          icon={Target}
          value={settings.longTermGoal || ''}
          onChange={(value) => updateSeed(patchPlotAndTropeSettings({ longTermGoal: value }))}
          placeholder="e.g., Shatter the heavens..."
        />
        <LibraryTextBox
          id="a11y-control-6a6tmbf"
          label="First Major Conflict"
          icon={Swords}
          value={settings.firstMajorConflict || ''}
          onChange={(value) => updateSeed(patchPlotAndTropeSettings({ firstMajorConflict: value }))}
          placeholder="e.g., Sect tournament, survival trial..."
        />
        <div className="sm:col-span-2">
          <LibraryTextBox
            id="main-antagonist-pressure-input"
            label="Main Opposition"
            icon={ShieldAlert}
            helpText="Who or what pushes back against the main character the hardest."
            value={settings.mainAntagonistPressure || ''}
            onChange={(value) => updateSeed(patchPlotAndTropeSettings({ mainAntagonistPressure: value }))}
            placeholder="e.g., The celestial court's fate auditors..."
          />
        </div>
      </div>

      <LibraryTextArea
        id="destined-ending-input"
        label="Destined Ending"
        icon={Hourglass}
        maxLength={1500}
        helpText="The intended final destination of this story or arc. If left blank, the Library recommends a fitting ending from your Origin and ARC direction. You can alter this outcome later."
        value={worldFoundations(seed).destinedEnding || ''}
        onChange={(value) => updateSeed(patchWorldFoundations({ destinedEnding: value }))}
        rows={3}
        placeholder="e.g. The kingdom falls, the MC ascends, or the lovers are separated..."
      />

      <LibraryTextArea
        id="make-it-work-instruction-input"
        label="Make It Work"
        icon={Sparkles}
        maxLength={1500}
        helpText="Use this for strange, difficult, contradictory, or highly specific ideas the Library must preserve and make believable inside the story."
        value={seed.story.optional.makeItWorkInstruction || ''}
        onChange={(value) => updateSeed(setMakeItWorkInstruction(value))}
        rows={5}
        placeholder={MAKE_IT_WORK_PLACEHOLDER}
      />
    </WorkspaceShell>
  );
};
