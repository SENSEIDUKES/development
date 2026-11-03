import { useContext, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { type StorySeedInput, type FunSettingLevel } from '@seihouse/sen/story-seed';
import { SeedConfirmationContext } from '../creator/SeedPart';
import { funSettings, patchFunSettings, type UpdateSeed } from '../seedState';
import './fun-settings.css';

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

/** The same settings in Origin and the Blueprint's Origin snapshot. */
export function FunSettingsPanel({ seed, updateSeed }: { seed: StorySeedInput; updateSeed: UpdateSeed }) {
  const settings = funSettings(seed);
  const confirm = useContext(SeedConfirmationContext);
  const [focused, setFocused] = useState<FunSettingKey>('faceSlap');
  const touch = useRef<{ x: number; y: number } | null>(null);
  const select = (key: FunSettingKey, index: number) => {
    const level = FUN_LEVELS[Math.max(0, Math.min(FUN_LEVELS.length - 1, index))].value;
    setFocused(key);
    updateSeed(patchFunSettings({ [key]: level }));
    confirm('origin.fun');
  };
  const active = FUN_SETTINGS.find(setting => setting.key === focused)!;
  return (
    <section className="glass-panel seed-fun-settings" aria-labelledby="origin-fun-settings-title">
      <h3 id="origin-fun-settings-title">Fun Settings</h3>
      <div className="seed-fun-list">
        {FUN_SETTINGS.map(setting => {
          const value = settings[setting.key] || 'medium';
          const index = FUN_LEVELS.findIndex(level => level.value === value);
          return <div key={setting.key} className="seed-fun-row" onFocusCapture={() => setFocused(setting.key)}>
            <span id={`origin-${setting.id}-label`}>{setting.label}</span>
            <div className="seed-fun-stepper" role="group" aria-label={`${setting.label} level`}
              aria-describedby={focused === setting.key ? 'origin-fun-help' : undefined}
              onKeyDown={event => {
                const step = ['ArrowLeft', 'ArrowDown'].includes(event.key) ? -1 : ['ArrowRight', 'ArrowUp'].includes(event.key) ? 1 : 0;
                if (step || event.key === 'Home' || event.key === 'End') {
                  event.preventDefault();
                  select(setting.key, event.key === 'Home' ? 0 : event.key === 'End' ? FUN_LEVELS.length - 1 : index + step);
                }
              }}
              onTouchStart={event => { const first = event.touches[0]; touch.current = first ? { x: first.clientX, y: first.clientY } : null; }}
              onTouchEnd={event => {
                const first = event.changedTouches[0];
                const start = touch.current; touch.current = null;
                if (!first || !start) return;
                const dx = first.clientX - start.x;
                if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(first.clientY - start.y)) {
                  event.preventDefault(); select(setting.key, index + (dx < 0 ? 1 : -1));
                }
              }}>
              <button id={`origin-${setting.id}-decrease`} type="button" aria-label={`Decrease ${setting.label}`} disabled={index === 0}
                onClick={() => select(setting.key, index - 1)}><ChevronLeft size={16} aria-hidden="true" /></button>
              <output id={`origin-${setting.id}-value`} aria-live="polite" aria-labelledby={`origin-${setting.id}-label`}>{FUN_LEVELS[index].label}</output>
              <button id={`origin-${setting.id}-increase`} type="button" aria-label={`Increase ${setting.label}`} disabled={index === FUN_LEVELS.length - 1}
                onClick={() => select(setting.key, index + 1)}><ChevronRight size={16} aria-hidden="true" /></button>
            </div>
          </div>;
        })}
      </div>
      <p id="origin-fun-help" className="seed-fun-help" aria-live="polite">{active.help} {active.levelCopy[settings[focused] || 'medium']}</p>
      <button type="button" className="seed-fun-restore" onClick={() => {
        updateSeed(patchFunSettings({ faceSlap: 'medium', plotArmor: 'medium', recognition: 'medium' })); confirm('origin.fun');
      }}>Restore defaults</button>
    </section>
  );
}
