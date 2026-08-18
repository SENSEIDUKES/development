import type { StorySeedFaction, StorySeedInput } from '../../shared/storySeedSchema';
import { normalizeCodexAliases, parseCodexAliases } from '../../shared/codexContext';
import { getSeedSection } from '../seedSections';
import { setFactions, worldFoundations, type UpdateSeed } from '../seedState';
import { LibraryTextArea, LibraryTextBox } from '../../../library';
import { WorkspaceShell } from './WorkspaceShell';

interface FactionsWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/** Optional World workspace (`world.optional.worldFoundations.factions`). */
export const FactionsWorkspace = ({ seed, updateSeed }: FactionsWorkspaceProps) => {
  const section = getSeedSection('factions');
  const factions = worldFoundations(seed).factions || [];

  const updateFaction = (index: number, patch: Partial<StorySeedFaction>) => {
    const next = [...factions];
    next[index] = { ...next[index], ...patch };
    updateSeed(setFactions(next));
  };

  return (
    <WorkspaceShell section={section} complete={section.isFilled(seed)}>
      <p className="font-sans text-xs text-neutral-400">
        Pre-define factions or sects for your world. Include their alignment, power level, and connection
        to the main character. Left empty, the Library invents the powers that fit your Story.
      </p>
      {factions.map((faction, index) => (
        <div key={faction.id} className="glass-panel relative space-y-3 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-sc text-xs font-bold uppercase tracking-widest text-signal">Faction {index + 1}</h4>
            <button
              type="button"
              onClick={() => updateSeed(setFactions(factions.filter((_, i) => i !== index)))}
              className="font-sc text-xs uppercase tracking-widest text-neutral-400 transition-colors hover:text-human"
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <LibraryTextBox
              size="compact"
              label="Name"
              id={index === 0 ? 'a11y-control-xhc59yh' : `faction-name-${faction.id}`}
              value={faction.name || ''}
              onChange={(val) => updateFaction(index, { name: val })}
              placeholder="e.g. Heavenly Sword Sect"
            />
            <LibraryTextBox
              size="compact"
              label="Role"
              id={`faction-role-${faction.id}`}
              value={faction.role || ''}
              onChange={(val) => updateFaction(index, { role: val })}
              placeholder="e.g. Ruling Power, Assassin Guild..."
            />
            <LibraryTextBox
              size="compact"
              label="Power Level"
              id={`faction-power-${faction.id}`}
              value={faction.powerLevel || ''}
              onChange={(val) => updateFaction(index, { powerLevel: val })}
              placeholder="e.g. Mid Tier, Universal Force..."
            />
            <LibraryTextBox
              size="compact"
              label="Alignment (Good/Bad)"
              id={`faction-alignment-${faction.id}`}
              value={faction.alignment || ''}
              onChange={(val) => updateFaction(index, { alignment: val })}
              placeholder="e.g. Righteous, Demonic, Neutral..."
            />
            <div className="md:col-span-2">
              <LibraryTextBox
                size="compact"
                label="Connection to MC"
                id={`mc-faction-connection-${faction.id}`}
                value={faction.connectionToMC || ''}
                onChange={(val) => updateFaction(index, { connectionToMC: val })}
                placeholder="e.g. MC's starting sect, Sworn enemies..."
              />
            </div>
            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <LibraryTextArea
                size="compact"
                label="Aliases / Known Titles"
                key={`${faction.id}-${normalizeCodexAliases(faction.aliases, faction.name).join('|')}`}
                id={`faction-aliases-${faction.id}`}
                rows={2}
                defaultValue={normalizeCodexAliases(faction.aliases, faction.name).join(', ')}
                onBlur={(e) => {
                  const aliases = parseCodexAliases(e.currentTarget.value, faction.name);
                  e.currentTarget.value = aliases.join(', ');
                  updateFaction(index, { aliases });
                }}
                placeholder="e.g. Azure Hall; Eastern Pavilion"
              />
              <p className="mt-1 font-sans text-[9px] text-neutral-400">User-authored only. Separate names or titles with commas, semicolons, or new lines.</p>
            </div>
            <div className="col-span-1 sm:col-span-2 md:col-span-3">
              <LibraryTextArea
                size="compact"
                label="Detailed Description & Hierarchy"
                id={`faction-description-${faction.id}`}
                value={faction.description || ''}
                onChange={(val) => updateFaction(index, { description: val })}
                maxLength={1200}
                rows={2}
                placeholder="Organizational hierarchy, core beliefs, regional influence, elders, hidden rules..."
              />
            </div>
          </div>
        </div>
      ))}
      {factions.length < 5 && (
        <button
          type="button"
          onClick={() => {
            updateSeed(setFactions([
              ...factions,
              { id: crypto.randomUUID(), name: '', aliases: [], role: '', powerLevel: '', alignment: '', connectionToMC: '', description: '' },
            ]));
          }}
          className="w-full rounded-xl border border-dashed border-neutral-700/70 py-2.5 font-sc text-xs uppercase tracking-widest text-neutral-400 transition-all hover:border-portal/50 hover:bg-portal/5 hover:text-portal"
        >
          + Add Faction ({factions.length}/5)
        </button>
      )}
    </WorkspaceShell>
  );
};
