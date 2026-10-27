import { type StorySeedFaction, type StorySeedInput, SEED_FACTION_LIMIT } from '@seihouse/sen/story-seed';
import { getSeedSection } from '../seedSections';
import { setFactions, worldFoundations, type UpdateSeed } from '../seedState';
import { SeedSectionFrame } from './SeedSectionFrame';
import { SENStorySeedIcon } from '../SENStorySeedIcon';
import { FactionFields } from './FactionFields';
import { usePhone } from '../../../library-shell/development/workspaceMedia';
import { WorldListGrid } from '../blueprint/WorldCardGrid';

interface FactionsWorkspaceProps {
  seed: StorySeedInput;
  updateSeed: UpdateSeed;
}

/** The Seed's faction editor; the Seed workspace and Blueprint review share it. */
export const FactionsEditor = ({ seed, updateSeed }: FactionsWorkspaceProps) => {
  // A phone shows the factions as Codex cards, each opening its fields in a sheet.
  const phone = usePhone();
  const factions = worldFoundations(seed).factions || [];

  const updateFaction = (index: number, patch: Partial<StorySeedFaction>) => {
    const next = [...factions];
    next[index] = { ...next[index], ...patch };
    updateSeed(setFactions(next));
  };

  if (phone) return <WorldListGrid seed={seed} updateSeed={updateSeed} field="factions" heading={false} />;
  return (
    <>
      {factions.map((faction, index) => (
        <div key={faction.id} className="glass-panel relative space-y-3 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="flex items-center gap-2 font-sc text-xs font-bold uppercase tracking-widest text-signal">
              <SENStorySeedIcon name="ally-faction" size={15} aria-hidden="true" />
              Faction {index + 1}
              <SENStorySeedIcon name="enemy-faction" size={15} aria-hidden="true" className="text-human/80" />
            </h4>
            <button
              type="button"
              onClick={() => updateSeed(setFactions(factions.filter((_, i) => i !== index)))}
              className="font-sc text-xs uppercase tracking-widest text-neutral-400 transition-colors hover:text-human"
            >
              Remove
            </button>
          </div>
          <FactionFields faction={faction} index={index} onChange={patch => updateFaction(index, patch)} />
        </div>
      ))}
      {factions.length < SEED_FACTION_LIMIT && (
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
          + Add Faction ({factions.length}/{SEED_FACTION_LIMIT})
        </button>
      )}
    </>
  );
};

/** Optional World workspace (`world.optional.worldFoundations.factions`). */
export const FactionsWorkspace = ({ seed, updateSeed }: FactionsWorkspaceProps) => {
  const section = getSeedSection('factions');
  return (
    <SeedSectionFrame section={section} complete={section.isFilled(seed)}>
      <p className="font-sans text-xs text-neutral-400">
        Pre-define factions or sects for your world. Include their alignment, power level, and connection
        to the main character. Left empty, the Library invents the powers that fit your Story.
      </p>
      <FactionsEditor seed={seed} updateSeed={updateSeed} />
    </SeedSectionFrame>
  );
};
