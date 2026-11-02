import { useCallback, useEffect, useState } from 'react';
import { ENERGY_TIER_MODELS, modelEnergyGrade, type EnergyGrade, type GradedEnergyKind } from '@seihouse/library/energy';
/**
 * The reader's Model Router choice, per capability, kept in this browser.
 *
 * The Model Router page writes it; generation surfaces read it as their
 * starting model and write it back when their own selector changes, so there
 * is one choice everywhere. The server still validates every model it is sent.
 */
export type ModelPreferenceCapability = 'chapters' | 'images' | 'live';

/** Browser convenience only; the server independently enforces the local-development gate. */
export const isLocalDevelopmentModel = (model?: string): boolean =>
  import.meta.env.DEV && model === 'lmstudio/loaded';

const STORAGE_KEY = 'seihouse.model-router.selection.v1';
const CHANGE_EVENT = 'seihouse:model-router-selection';

/**
 * The Router's Chapter Tagger choice: a model of its own for the tagging call
 * (absent: the same model that wrote the chapter) and how hard it thinks
 * (absent: as little as that model allows). Kept apart from the chapter
 * model's reasoning so the same model can write at one level and tag at
 * another.
 */
export interface TaggerPreference {
  model?: string;
  reasoningLevel?: string;
}

/** The Energy kind each Router capability is priced as. */
export const CAPABILITY_ENERGY_KIND: Record<ModelPreferenceCapability, GradedEnergyKind> = { chapters: 'chapter', images: 'image', live: 'live-minute' };

type Selection = Partial<Record<ModelPreferenceCapability, string>> & {
  /** The reader's tier per capability; with no exact model picked, the tier's model is used. */
  tier?: Partial<Record<ModelPreferenceCapability, EnergyGrade>>;
  /** Tier models set on this device, for the team to try before a choice is made for everyone. */
  tierModels?: Partial<Record<ModelPreferenceCapability, Partial<Record<EnergyGrade, string>>>>;
  /** Router Advanced settings: reasoning level per model id. */
  reasoning?: Record<string, string>;
  tagger?: TaggerPreference;
};

const readAll = (): Selection => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Selection : {};
  } catch {
    return {};
  }
};

const save = (selection: Selection, detail: unknown) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Storage can be unavailable (private mode); the choice still applies to this page.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail }));
};

const GRADES: readonly EnergyGrade[] = ['mortal', 'immortal', 'heaven'];
const isGrade = (value: unknown): value is EnergyGrade => GRADES.includes(value as EnergyGrade);

/** The exact model the reader picked in the Router, if any: it wins over their tier. */
export const readExactModel = (capability: ModelPreferenceCapability): string | undefined => {
  const value = readAll()[capability];
  return typeof value === 'string' && value ? value : undefined;
};

/** The reader's tier, if they chose one. */
export const readTierPreference = (capability: ModelPreferenceCapability): EnergyGrade | undefined => {
  const tier = readAll().tier?.[capability];
  return isGrade(tier) ? tier : undefined;
};

/** The model behind a tier: the one set on this device, otherwise the team's. */
export const tierModel = (capability: ModelPreferenceCapability, tier: EnergyGrade): string | undefined => {
  const local = readAll().tierModels?.[capability]?.[tier];
  return typeof local === 'string' && local ? local : ENERGY_TIER_MODELS[CAPABILITY_ENERGY_KIND[capability]][tier];
};

/**
 * The model to generate with: the reader's exact pick, else the model behind
 * their tier, else none (the server's default, the Mortal model).
 */
export const readModelPreference = (capability: ModelPreferenceCapability): string | undefined => {
  const exact = readExactModel(capability);
  if (exact) return exact;
  const tier = readTierPreference(capability);
  return tier ? tierModel(capability, tier) : undefined;
};

/**
 * The grade a generation is priced at: the tier the reader chose when its
 * model made it, otherwise the model's own grade (an exact pick, or the default).
 */
export const chosenEnergyGrade = (capability: ModelPreferenceCapability, model?: string): EnergyGrade => {
  const exact = readExactModel(capability);
  const tier = readTierPreference(capability);
  if (!exact && tier && (model === undefined || model === tierModel(capability, tier))) return tier;
  return modelEnergyGrade(model ?? exact);
};

/** An exact model pick: it wins over the tier until the reader goes back to tiers. */
export const writeModelPreference = (capability: ModelPreferenceCapability, model: string): void =>
  save({ ...readAll(), [capability]: model }, { capability, model });

/** Choose a tier: its model is used from now on, and any exact pick is cleared. */
export const writeTierPreference = (capability: ModelPreferenceCapability, tier: EnergyGrade): void => {
  const current = readAll();
  const { [capability]: _exact, ...rest } = current;
  save({ ...rest, tier: { ...(current.tier ?? {}), [capability]: tier } }, { capability, tier });
};

/** Set the model behind a tier on this device; `undefined` returns it to the team's. */
export const writeTierModel = (capability: ModelPreferenceCapability, tier: EnergyGrade, model: string | undefined): void => {
  const current = readAll();
  const forCapability = { ...(current.tierModels?.[capability] ?? {}) };
  if (model) forCapability[tier] = model; else delete forCapability[tier];
  save({ ...current, tierModels: { ...(current.tierModels ?? {}), [capability]: forCapability } }, { capability, tier, model });
};

/** The saved reasoning level for a model, or undefined for the model's own default. */
export const readReasoningPreference = (model: string): string | undefined => {
  const reasoning = readAll().reasoning;
  const level = reasoning && typeof reasoning === 'object' ? reasoning[model] : undefined;
  return typeof level === 'string' && level ? level : undefined;
};

/** Save a model's reasoning level; `undefined` returns it to the model's default. */
export const writeReasoningPreference = (model: string, level: string | undefined): void => {
  const current = readAll();
  const reasoning = { ...(current.reasoning ?? {}) };
  if (level) reasoning[model] = level; else delete reasoning[model];
  save({ ...current, reasoning }, { model, reasoning: level });
};

const readTagger = (selection: Selection): TaggerPreference => {
  const tagger = selection.tagger;
  if (!tagger || typeof tagger !== 'object') return {};
  return {
    ...(typeof tagger.model === 'string' && tagger.model ? { model: tagger.model } : {}),
    ...(typeof tagger.reasoningLevel === 'string' && tagger.reasoningLevel ? { reasoningLevel: tagger.reasoningLevel } : {}),
  };
};

/** The saved Chapter Tagger choice; `{}` means the chapter's own writer, thinking as little as it allows. */
export const readTaggerPreference = (): TaggerPreference => readTagger(readAll());

/** Save the Chapter Tagger choice; an absent model or level returns that part to its default. */
export const writeTaggerPreference = (tagger: TaggerPreference): void => {
  const next = readTagger({ tagger });
  save({ ...readAll(), tagger: next }, { tagger: next });
};

/** The saved choice when the server still offers it, otherwise the server default. */
export const preferredModel = (
  capability: ModelPreferenceCapability,
  available: ReadonlyArray<{ id: string }>,
  serverDefault: string,
): string => {
  const saved = readModelPreference(capability);
  return saved && available.some(option => option.id === saved) ? saved : serverDefault;
};

/** Follow choices made in another tab or another surface on this page. */
export const subscribeModelPreference = (listener: () => void): (() => void) => {
  const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) listener(); };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, listener);
  };
};

/** React binding: the saved choice for a capability, kept in step across surfaces. */
export function useModelPreference(capability: ModelPreferenceCapability): [string | undefined, (model: string) => void] {
  const [value, setValue] = useState(() => readModelPreference(capability));
  useEffect(() => subscribeModelPreference(() => setValue(readModelPreference(capability))), [capability]);
  const update = useCallback((model: string) => writeModelPreference(capability, model), [capability]);
  return [value, update];
}

/** React binding: the reader's tier and exact pick for a capability, and the model behind each tier. */
export function useTierPreference(capability: ModelPreferenceCapability) {
  const read = () => ({
    tier: readTierPreference(capability),
    exact: readExactModel(capability),
    models: Object.fromEntries(GRADES.map(grade => [grade, tierModel(capability, grade)])) as Record<EnergyGrade, string | undefined>,
    local: { ...(readAll().tierModels?.[capability] ?? {}) } as Partial<Record<EnergyGrade, string>>,
  });
  const [value, setValue] = useState(read);
  useEffect(() => subscribeModelPreference(() => setValue(read())), [capability]);
  return value;
}

/** React binding: the saved Chapter Tagger choice, kept in step across surfaces. */
export function useTaggerPreference(): [TaggerPreference, (tagger: TaggerPreference) => void] {
  const [value, setValue] = useState(readTaggerPreference);
  useEffect(() => subscribeModelPreference(() => setValue(readTaggerPreference())), []);
  return [value, writeTaggerPreference];
}

/** React binding: the saved reasoning levels for every model. */
export function useReasoningPreferences(): [Record<string, string>, (model: string, level: string | undefined) => void] {
  const read = () => ({ ...(readAll().reasoning ?? {}) });
  const [value, setValue] = useState(read);
  useEffect(() => subscribeModelPreference(() => setValue(read())), []);
  return [value, writeReasoningPreference];
}
