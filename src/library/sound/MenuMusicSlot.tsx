import { useId, useRef, useState } from 'react';
import { NarrativeButton } from '@seihouse/sen/presentation';
import { mediaPackKey, type SoundscapePack } from '../media/mediaPacks';

export interface MenuMusicSlotProps {
  packs: readonly SoundscapePack[];
  selectedKey: string;
  defaultLabel: string;
  onChange: (key: string) => void;
  /** Validates and keeps the recordings on this device before equipping the pack. */
  onImport: (file: File) => Promise<void>;
}

/** The menu's own SPP slot, independent of any story's Media Loadout. */
export function MenuMusicSlot({ packs, selectedKey, defaultLabel, onChange, onImport }: MenuMusicSlotProps) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const [importing, setImporting] = useState(false);
  const [problem, setProblem] = useState<string>();
  const selected = packs.find(pack => mediaPackKey(pack) === selectedKey);
  const importFile = async (file: File) => {
    if (pending.current) return;
    pending.current = true;
    setImporting(true);
    setProblem(undefined);
    try { await onImport(file); }
    catch (error) { setProblem(error instanceof Error ? error.message : 'This music package could not be installed.'); }
    finally { pending.current = false; setImporting(false); }
  };
  return <article className="mt-4 rounded-xl border border-white/15 bg-black/20 p-4" aria-labelledby={`${id}-title`} data-menu-music-slot>
    <h3 id={`${id}-title`} className="font-sans text-sm font-semibold text-neutral-100">Menu Music</h3>
    <p className="mt-1 font-sans text-xs text-neutral-400">Choose the music that plays on the menus, or upload a music .spp.</p>
    <label htmlFor={`${id}-pack`} className="mt-3 block font-sans text-xs text-neutral-400">Music pack</label>
    <select id={`${id}-pack`} value={selectedKey} disabled={importing}
      onChange={event => { setProblem(undefined); onChange(event.target.value); }}
      className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-white/15 bg-black/35 px-3 font-sans text-sm text-neutral-100 outline-none focus:border-[var(--color-sen-portal)]">
      <option value="">{defaultLabel}</option>
      {selectedKey && !selected && <option value={selectedKey} disabled>Saved pack unavailable</option>}
      {packs.map(pack => <option key={mediaPackKey(pack)} value={mediaPackKey(pack)}>{pack.displayName} · v{pack.version}</option>)}
    </select>
    {selected && <p className="mt-2 font-sans text-xs text-neutral-400" role="status">{selected.entries.length} {selected.entries.length === 1 ? 'song' : 'songs'}</p>}
    <input ref={fileInput} type="file" accept=".spp" className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="menu-music-import-file"
      onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void importFile(file);
      }} />
    <NarrativeButton type="button" variant="ghost" disabled={importing} className="mt-3" onClick={() => fileInput.current?.click()}>
      {importing ? 'Installing…' : 'Upload .spp'}
    </NarrativeButton>
    {problem && <p role="alert" className="mt-2 whitespace-pre-wrap font-sans text-xs text-human">{problem}</p>}
  </article>;
}
