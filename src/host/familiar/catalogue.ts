import type { FamiliarDefinition, FamiliarOption, FamiliarRarity } from '@seihouse/library/familiar';
import celestialGuardianPet from '../../../public/familiars/celestial-guardian/pet.json';
import celestialGuardianRequest from '../../../public/familiars/celestial-guardian/pet-request.json';
import celestialGuardianTiming from '../../../public/familiars/celestial-guardian/animation-timing.json';
import celestialMoonMothPet from '../../../public/familiars/celestial-moon-moth/pet.json';
import celestialMoonMothRequest from '../../../public/familiars/celestial-moon-moth/pet-request.json';
import celestialMoonMothTiming from '../../../public/familiars/celestial-moon-moth/animation-timing.json';
import galaxyOctopusPet from '../../../public/familiars/galaxy-octopus/pet.json';
import galaxyOctopusRequest from '../../../public/familiars/galaxy-octopus/pet-request.json';
import galaxyOctopusTiming from '../../../public/familiars/galaxy-octopus/animation-timing.json';
import judgmentalJiangshiPet from '../../../public/familiars/judgmental-jiangshi/pet.json';
import judgmentalJiangshiRequest from '../../../public/familiars/judgmental-jiangshi/pet-request.json';
import judgmentalJiangshiTiming from '../../../public/familiars/judgmental-jiangshi/animation-timing.json';
import ladyBugPet from '../../../public/familiars/lady-bug/pet.json';
import ladyBugRequest from '../../../public/familiars/lady-bug/pet-request.json';
import ladyBugTiming from '../../../public/familiars/lady-bug/animation-timing.json';
import littleMonkeyKingPet from '../../../public/familiars/little-monkey-king/pet.json';
import littleMonkeyKingRequest from '../../../public/familiars/little-monkey-king/pet-request.json';
import littleMonkeyKingTiming from '../../../public/familiars/little-monkey-king/animation-timing.json';
import livingGrimoirePet from '../../../public/familiars/living-grimoire/pet.json';
import livingGrimoireRequest from '../../../public/familiars/living-grimoire/pet-request.json';
import livingGrimoireTiming from '../../../public/familiars/living-grimoire/animation-timing.json';
import luckyBakeDanukiPet from '../../../public/familiars/lucky-bake-danuki/pet.json';
import luckyBakeDanukiRequest from '../../../public/familiars/lucky-bake-danuki/pet-request.json';
import luckyBakeDanukiTiming from '../../../public/familiars/lucky-bake-danuki/animation-timing.json';
import nineTailedFoxPet from '../../../public/familiars/nine-tailed-fox/pet.json';
import nineTailedFoxRequest from '../../../public/familiars/nine-tailed-fox/pet-request.json';
import nineTailedFoxTiming from '../../../public/familiars/nine-tailed-fox/animation-timing.json';
import phoenixPet from '../../../public/familiars/phoenix/pet.json';
import phoenixRequest from '../../../public/familiars/phoenix/pet-request.json';
import phoenixTiming from '../../../public/familiars/phoenix/animation-timing.json';
import quillPet from '../../../public/familiars/quill/pet.json';
import quillRequest from '../../../public/familiars/quill/pet-request.json';
import quillTiming from '../../../public/familiars/quill/animation-timing.json';

type PetManifest = {
  id: string;
  displayName: string;
  description: string;
  spritesheetPath: string;
};

type PetRequestRow = {
  state: string;
  row: number;
  frames: number;
  directions?: readonly string[];
};

type PetRequest = {
  atlas: { columns: number; rows: number; cell_width: number; cell_height: number };
  rows: readonly PetRequestRow[];
};

type FamiliarSource = {
  pet: PetManifest;
  request: PetRequest;
  timing: Readonly<Record<string, readonly number[]>>;
  heroUrl: string;
  rarity: FamiliarRarity;
  isDefault?: boolean;
  /** Preserve a supplied character-specific animation name where one exists. */
  animationLabels?: Readonly<Record<string, string>>;
  /** The supplied local neutral PNG determines the original atlas cell. */
  neutralColumn: number;
};

/** One Library-owned entry combines immutable character metadata with its asset locations. */
export interface FamiliarCatalogueEntry {
  readonly definition: FamiliarDefinition;
  readonly heroUrl: string;
}

const animationLabels: Readonly<Record<string, string>> = {
  idle: 'Idle',
  'running-right': 'Moving right',
  'running-left': 'Moving left',
  waving: 'Waving',
  jumping: 'Jumping',
  failed: 'Disappointed',
  waiting: 'Waiting for input',
  running: 'Working',
  review: 'Thoughtful review',
};

/** Interpret one supplied v2 package without moving ownership, unlocks, or acquisition policy into the renderer. */
function defineFamiliar(source: FamiliarSource): FamiliarCatalogueEntry {
  const base = `/familiars/${source.pet.id}`;
  const standardRows = source.request.rows.slice(0, 9).map(row => {
    const durations = source.timing[row.state];
    if (!durations || durations.length !== row.frames) {
      throw new Error(`${source.pet.id} has no complete timing for ${row.state}.`);
    }
    return [row.state, {
      label: source.animationLabels?.[row.state] ?? animationLabels[row.state] ?? row.state,
      row: row.row,
      columns: Array.from({ length: row.frames }, (_, column) => column),
      durations,
    }] as const;
  });
  const lookRows = source.request.rows.slice(9).flatMap(row =>
    (row.directions ?? []).map((direction, column) => [`look-${direction}`, {
      label: `Look ${direction}°`, row: row.row, columns: [column], durations: [0],
    }] as const),
  );
  return {
    heroUrl: source.heroUrl,
    definition: {
      id: source.pet.id,
      displayName: source.pet.displayName,
      description: source.pet.description,
      rarity: source.rarity,
      isDefault: source.isDefault,
      spriteUrl: `${base}/${source.pet.spritesheetPath}`,
      placeholderUrl: `${base}/neutral.png`,
      columns: source.request.atlas.columns,
      rows: source.request.atlas.rows,
      cellWidth: source.request.atlas.cell_width,
      cellHeight: source.request.atlas.cell_height,
      animations: Object.fromEntries([
        ...standardRows,
        ['neutral', { label: 'Neutral pose', row: 0, columns: [source.neutralColumn], durations: [0] }],
        ...lookRows,
      ]),
    },
  };
}

/**
 * Library's present content catalogue. Rarity and default status belong here;
 * availability, ownership, acquisition, and Store pricing remain host policy.
 */
export const familiarCatalogue: readonly FamiliarCatalogueEntry[] = [
  defineFamiliar({ pet: celestialGuardianPet, request: celestialGuardianRequest, timing: celestialGuardianTiming,
    heroUrl: 'https://media.seihouse.org/SEN/GIF/celestial%20Guardian.gif', rarity: 'epic', neutralColumn: 6,
    animationLabels: { running: 'Working with timepiece' } }),
  defineFamiliar({ pet: celestialMoonMothPet, request: celestialMoonMothRequest, timing: celestialMoonMothTiming,
    heroUrl: 'https://media.seihouse.org/SEN/GIF/Celestial%20Moon%20Moth.gif', rarity: 'epic', neutralColumn: 0 }),
  defineFamiliar({ pet: littleMonkeyKingPet, request: littleMonkeyKingRequest, timing: littleMonkeyKingTiming,
    heroUrl: 'https://media.seihouse.org/SEN/GIF/little%20monkey%20king.gif', rarity: 'rare', neutralColumn: 0 }),
  defineFamiliar({ pet: phoenixPet, request: phoenixRequest, timing: phoenixTiming,
    heroUrl: 'https://media.seihouse.org/SEN/GIF/pheonix.gif', rarity: 'rare', neutralColumn: 0 }),
  defineFamiliar({ pet: nineTailedFoxPet, request: nineTailedFoxRequest, timing: nineTailedFoxTiming,
    heroUrl: 'https://media.seihouse.org/SEN/GIF/Nine%20tailed%20fox.gif', rarity: 'rare', neutralColumn: 0 }),
  defineFamiliar({ pet: galaxyOctopusPet, request: galaxyOctopusRequest, timing: galaxyOctopusTiming,
    heroUrl: 'https://media.seihouse.org/SEN/GIF/Galaxy%20Octopus.gif', rarity: 'rare', neutralColumn: 0 }),
  defineFamiliar({ pet: judgmentalJiangshiPet, request: judgmentalJiangshiRequest, timing: judgmentalJiangshiTiming,
    heroUrl: 'https://media.seihouse.org/SEN/GIF/judgmental%20jiangshi.gif', rarity: 'rare', neutralColumn: 0 }),
  defineFamiliar({ pet: luckyBakeDanukiPet, request: luckyBakeDanukiRequest, timing: luckyBakeDanukiTiming,
    heroUrl: 'https://media.seihouse.org/SEN/GIF/lucky-bake-danuki.gif', rarity: 'common', neutralColumn: 0 }),
  defineFamiliar({ pet: ladyBugPet, request: ladyBugRequest, timing: ladyBugTiming,
    heroUrl: 'https://media.seihouse.org/SEN/GIF/Lady%20Bug.gif', rarity: 'common', neutralColumn: 0 }),
  defineFamiliar({ pet: livingGrimoirePet, request: livingGrimoireRequest, timing: livingGrimoireTiming,
    heroUrl: 'https://media.seihouse.org/SEN/GIF/Living%20grimore.gif', rarity: 'common', neutralColumn: 0 }),
  defineFamiliar({ pet: quillPet, request: quillRequest, timing: quillTiming,
    heroUrl: 'https://media.seihouse.org/SEN/GIF/quillv2.gif', rarity: 'common', isDefault: true, neutralColumn: 0 }),
];

const configuredDefaultFamiliar = familiarCatalogue.find(entry => entry.definition.isDefault);
if (!configuredDefaultFamiliar) throw new Error('The Familiar catalogue requires one configured default.');
export const defaultFamiliar = configuredDefaultFamiliar;

/** Resolve an equipped ID without silently assigning ownership or an acquisition path. */
export function familiarCatalogueEntry(id: string | undefined): FamiliarCatalogueEntry | undefined {
  return familiarCatalogue.find(entry => entry.definition.id === id);
}

/** Supply availability from the host at the last boundary before selection UI. */
export function familiarOptions(isAvailable: (entry: FamiliarCatalogueEntry) => boolean = () => true): readonly FamiliarOption[] {
  return familiarCatalogue.map(entry => ({
    id: entry.definition.id,
    name: entry.definition.displayName,
    description: entry.definition.description,
    rarity: entry.definition.rarity,
    isDefault: entry.definition.isDefault,
    heroUrl: entry.heroUrl,
    stillUrl: entry.definition.placeholderUrl!,
    available: isAvailable(entry),
  }));
}

/** Development intentionally makes the entire catalogue inspectable; production supplies its own resolver. */
export const allFamiliarOptions = familiarOptions();

export const celestialGuardian = familiarCatalogueEntry('celestial-guardian')!.definition;
export const celestialGuardianOption = allFamiliarOptions.find(option => option.id === celestialGuardian.id)!;
