import { useCallback, useEffect, useState } from 'react';
/**
 * The reader's Model Router choice, per capability, kept in this browser.
 *
 * The Model Router page writes it; generation surfaces read it as their
 * starting model and write it back when their own selector changes, so there
 * is one choice everywhere. The server still validates every model it is sent.
 */
export type ModelPreferenceCapability = 'chapters';

const STORAGE_KEY = 'seihouse.model-router.selection.v1';
const CHANGE_EVENT = 'seihouse:model-router-selection';

type Selection = Partial<Record<ModelPreferenceCapability, string>>;

const readAll = (): Selection => {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Selection : {};
  } catch {
    return {};
  }
};

export const readModelPreference = (capability: ModelPreferenceCapability): string | undefined => {
  const value = readAll()[capability];
  return typeof value === 'string' && value ? value : undefined;
};

export const writeModelPreference = (capability: ModelPreferenceCapability, model: string): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(), [capability]: model }));
  } catch {
    // Storage can be unavailable (private mode); the choice still applies to this page.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { capability, model } }));
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
