import { type StorySeedFaction } from '@seihouse/sen/story-seed';
import { normalizeCodexAliases, parseCodexAliases } from '@seihouse/sen/story-seed';
import { NarrativeTextArea as LibraryTextArea, NarrativeTextBox as LibraryTextBox } from '@seihouse/sen/presentation';
import { WorldCardSlotFields } from './WorldCardFields';

/**
 * The faction card's own slots, beside the fields the Seed already asks for by
 * hand. They come from the Codex's one definition of a faction card.
 */
export const CHAPTER_ZERO_FACTION_SLOTS = ['factionKind', 'standing', 'seat', 'leader', 'appearance', 'ties'];

/**
 * One faction's fields: the Seed's list editor and the Blueprint's faction
 * sheet share them.
 */
export const FactionFields = ({ faction, index, onChange }: {
  faction: StorySeedFaction;
  /** Its place in the list; the first keeps the Seed's original field id. */
  index: number;
  onChange: (patch: Partial<StorySeedFaction>) => void;
}) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
    <LibraryTextBox
      size="compact"
      label="Name"
      id={index === 0 ? 'a11y-control-xhc59yh' : `faction-name-${faction.id}`}
      value={faction.name || ''}
      onChange={(val) => onChange({ name: val })}
      placeholder="e.g. Heavenly Sword Sect"
    />
    <LibraryTextBox
      size="compact"
      label="Role"
      id={`faction-role-${faction.id}`}
      value={faction.role || ''}
      onChange={(val) => onChange({ role: val })}
      placeholder="e.g. Ruling Power, Assassin Guild..."
    />
    <LibraryTextBox
      size="compact"
      label="Power Level"
      id={`faction-power-${faction.id}`}
      value={faction.powerLevel || ''}
      onChange={(val) => onChange({ powerLevel: val })}
      placeholder="e.g. Mid Tier, Universal Force..."
    />
    <LibraryTextBox
      size="compact"
      label="Alignment (Good/Bad)"
      id={`faction-alignment-${faction.id}`}
      value={faction.alignment || ''}
      onChange={(val) => onChange({ alignment: val })}
      placeholder="e.g. Righteous, Demonic, Neutral..."
    />
    <div className="md:col-span-2">
      <LibraryTextBox
        size="compact"
        label="Connection to MC"
        id={`mc-faction-connection-${faction.id}`}
        value={faction.connectionToMC || ''}
        onChange={(val) => onChange({ connectionToMC: val })}
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
          onChange({ aliases });
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
        onChange={(val) => onChange({ description: val })}
        maxLength={1200}
        rows={2}
        placeholder="Organizational hierarchy, core beliefs, regional influence, elders, hidden rules..."
      />
    </div>
    {/* The rest of its Codex card, as the world stands at Chapter 0. */}
    <WorldCardSlotFields
      kind="faction"
      card={faction}
      idPrefix={`faction-world-${faction.id}`}
      only={CHAPTER_ZERO_FACTION_SLOTS}
      onChange={patch => onChange(patch as Partial<StorySeedFaction>)}
    />
  </div>
);
