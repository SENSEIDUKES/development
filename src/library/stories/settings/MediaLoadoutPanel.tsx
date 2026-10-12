import { useEffect, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { SoundWord } from '@seihouse/sen/audio';
import { NarrativeButton as LibraryButton, NarrativePanel as LibraryPanel } from '@seihouse/sen/presentation';
import { isMediaPackEntitlementActive, mediaPackKey, type MediaPack, type MediaPackEntitlement, type MediaPackReference, type StoryMediaLoadoutSlot } from '../../media/mediaPacks';
import type { StorySettingsValues } from './storySettingsValues';

const NO_DEFAULTS: Partial<Record<StoryMediaLoadoutSlot, string>> = {};

/** One sound word a pack's recordings answer, as a chip; its example (and meaning) show on hover. */
function SoundWordChip({ sound }: { sound: SoundWord }) {
  return (
    <li
      className="rounded-full border border-emerald-300/20 bg-black/25 px-2.5 py-1 text-[11px] text-emerald-50"
      title={[sound.example && `e.g. "${sound.example}"`, sound.meaning].filter(Boolean).join(' · ') || undefined}
    >
      {sound.word}
    </li>
  );
}

/**
 * The story's Media Loadout in Story Settings: the Soundscapes, Sound Cues
 * and Atmospheres slots, each taking a registered pack the reader has unlocked or installed
 * (`onImport`). A slot with no pack plays the host's own media (`defaults`),
 * and shows it equipped. The words the writer may name are the story's
 * own Sound Words (`SoundWordsPanel`), never the pack's. With `inspect` (the
 * HARNESS developer page) it explains what reaches the writer.
 */
export function MediaLoadoutPanel({
  story,
  packs,
  entitlements,
  busy,
  onGrant,
  onChange,
  onImport,
  defaults = NO_DEFAULTS,
  inspect = false,
  stacked = false,
}: {
  /** The story's settings, or a story being created: what it will start with. */
  story: StorySettingsValues;
  packs: readonly MediaPack[];
  entitlements: readonly MediaPackEntitlement[];
  busy: boolean;
  onGrant?: (reference: MediaPackReference) => void;
  onChange: (slot: StoryMediaLoadoutSlot, reference?: MediaPackReference) => void;
  /** Installs a Soundscape, Sound Cue or Atmosphere `.spp` package, when the host offers it; the panel then equips it. */
  onImport?: (file: Blob) => Promise<MediaPack>;
  /** What each slot plays with no pack: the host's own media, by name. Such a slot counts as equipped. */
  defaults?: Partial<Record<StoryMediaLoadoutSlot, string>>;
  /** The developer page's inspection: what reaches the writer, and the empty registry. */
  inspect?: boolean;
  /** One slot per row, for a narrow place such as a settings sheet. */
  stacked?: boolean;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [entitlementClock, setEntitlementClock] = useState(() => Date.now());
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    const scheduleNextExpiration = () => {
      const now = Date.now();
      setEntitlementClock(now);
      const nearestBoundary = entitlements
        .flatMap(item => [Date.parse(item.unlockedAt), item.expiresAt ? Date.parse(item.expiresAt) : Number.NaN])
        .filter(boundary => Number.isFinite(boundary) && boundary > now)
        .sort((left, right) => left - right)[0];
      if (nearestBoundary === undefined || cancelled) return;
      timeout = setTimeout(scheduleNextExpiration, Math.min(nearestBoundary - now + 1, 2_147_483_647));
    };
    scheduleNextExpiration();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [entitlements]);
  const checkedAt = new Date(entitlementClock).toISOString();
  const entitled = new Set(entitlements
    .filter(item => isMediaPackEntitlementActive(item, checkedAt))
    .map(item => mediaPackKey(item.pack)));
  const slots: Array<{ id: StoryMediaLoadoutSlot; type: MediaPack['type']; label: string }> = [
    { id: 'soundscapes', type: 'soundscape', label: 'Soundscapes' },
    { id: 'soundCues', type: 'sound-cue', label: 'Sound Cues' },
    { id: 'atmospheres', type: 'atmosphere', label: 'Atmospheres' },
  ];
  const validEquipped = new Set(slots.flatMap(slot => {
    const reference = story.mediaLoadout?.[slot.id];
    if (!reference) return [];
    const key = mediaPackKey(reference);
    return packs.some(pack => pack.type === slot.type && mediaPackKey(pack) === key) ? [key] : [];
  }));
  // A slot with no pack plays the host's own media, when it has some: that is equipped too.
  const slotStates = Object.fromEntries(slots.map(slot => {
    const reference = story.mediaLoadout?.[slot.id];
    const key = reference ? mediaPackKey(reference) : '';
    const state = !reference ? defaults[slot.id] ? 'Equipped' : 'Empty'
      : !validEquipped.has(key) ? 'Missing' : entitled.has(key) ? 'Equipped' : 'Locked';
    return [slot.id, state];
  })) as Record<StoryMediaLoadoutSlot, 'Equipped' | 'Empty' | 'Missing' | 'Locked'>;
  const equippedCount = slots.filter(slot => slotStates[slot.id] === 'Equipped').length;
  const importFile = async (file: File) => {
    if (!onImport) return;
    setImporting(true);
    setProblem(undefined);
    try {
      const pack = await onImport(file);
      const slot = slots.find(item => item.type === pack.type)!;
      onChange(slot.id, { id: pack.id, version: pack.version });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'This package could not be installed.');
    } finally {
      setImporting(false);
    }
  };
  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-media-loadout-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Volume2 size={18} className="text-emerald-200" aria-hidden="true" />
            <h2 id="harness-media-loadout-title" className="font-display text-xl text-white">Media Loadout</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
            {inspect
              ? 'Reward unlocks make registered packs available. Equipping is a separate story choice. Recordings, URLs and entitlements never enter the model request: the writer names only the story\'s own Sound Words that a recording here answers.'
              : 'The recordings your story plays. A pack you have unlocked can replace the Library\'s own; your story\'s Sound Words stay as they are.'}
          </p>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-100" data-testid="media-loadout-count">
          {equippedCount}/{slots.length} equipped
        </span>
      </div>

      {onImport && <div className="mt-4 flex flex-wrap items-center gap-3">
        <input ref={fileInput} type="file" accept=".spp" className="sr-only" tabIndex={-1} aria-hidden="true" data-testid="media-pack-import-file"
          onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void importFile(file);
          }} />
        <button type="button" disabled={busy || importing} onClick={() => fileInput.current?.click()}
          className="min-h-11 rounded-full border border-emerald-300/40 px-4 text-sm text-emerald-50 hover:border-emerald-300/70 disabled:opacity-40">
          {importing ? 'Installing…' : 'Import .spp'}
        </button>
        <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-neutral-500">A Soundscape, Sound Cue or Atmosphere package is kept on this device and equipped in its slot.</p>
      </div>}
      {problem && <p role="alert" className="mt-2 whitespace-pre-wrap text-xs text-human">{problem}</p>}

      <div className={`mt-5 grid gap-3 ${stacked ? '' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
        {slots.map(slot => {
          const slotPacks = packs.filter(pack => pack.type === slot.type);
          const reference = story.mediaLoadout?.[slot.id];
          const selectedKey = reference ? mediaPackKey(reference) : '';
          const registeredForSlot = slotPacks.some(pack => mediaPackKey(pack) === selectedKey);
          const slotState = slotStates[slot.id];
          return (
            <article key={slot.id} className="rounded-xl border border-emerald-300/20 bg-emerald-400/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">{slot.label}</h3>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-emerald-100">{slotState}</span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">{slot.id === 'soundscapes'
                ? 'The music each chapter chooses its mood from.'
                : slot.id === 'atmospheres'
                  ? 'The place sounds each chapter chooses its atmosphere from.'
                  : 'The recordings that play the story\'s Sound Words.'}</p>
              {!inspect && slotPacks.length === 0 && !reference ? (
                <p className="mt-3 min-h-11 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-neutral-200" data-testid={`story-media-${slot.id}-default`}>
                  {defaults[slot.id] ?? 'Nothing plays here yet'}
                </p>
              ) : <>
              <label className="mt-3 block text-[10px] uppercase tracking-[0.14em] text-neutral-500" htmlFor={`harness-media-${slot.id}`}>Available pack</label>
              <select
                id={`harness-media-${slot.id}`}
                value={selectedKey}
                disabled={busy}
                onChange={event => {
                  const pack = slotPacks.find(item => mediaPackKey(item) === event.target.value);
                  onChange(slot.id, pack ? { id: pack.id, version: pack.version } : undefined);
                }}
                className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-neutral-100 outline-none focus:border-emerald-300/60"
              >
                <option value="">{defaults[slot.id] ?? 'No pack equipped'}</option>
                {reference && !registeredForSlot && (
                  <option value={selectedKey} disabled>Unavailable pack · {reference.id} · v{reference.version}</option>
                )}
                {slotPacks.map(pack => (
                  <option key={mediaPackKey(pack)} value={mediaPackKey(pack)} disabled={!entitled.has(mediaPackKey(pack))}>
                    {pack.displayName} · v{pack.version}{entitled.has(mediaPackKey(pack)) ? '' : ' · locked'}
                  </option>
                ))}
              </select>
              </>}
            </article>
          );
        })}
      </div>

      <div className={`mt-4 grid gap-3 ${stacked ? '' : 'sm:grid-cols-2 xl:grid-cols-3'}`}>
        {packs.map(pack => {
          const key = mediaPackKey(pack);
          const state = validEquipped.has(key) && entitled.has(key) ? 'Equipped' : entitled.has(key) ? 'Available' : 'Locked';
          return (
            <article key={key} className={`rounded-xl border p-4 ${state === 'Equipped' ? 'border-emerald-300/35 bg-emerald-400/[0.08]' : state === 'Available' ? 'border-cyan-300/20 bg-cyan-400/[0.05]' : 'border-white/10 bg-black/20'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{pack.displayName}</h3>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-500">{pack.type === 'soundscape' ? 'Soundscape Pack' : pack.type === 'atmosphere' ? 'Atmosphere Pack' : 'Sound Cue Pack'} · v{pack.version}</p>
                </div>
                <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-300">{state}</span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-neutral-400">{pack.description}</p>
              <p className="mt-2 text-[11px] text-neutral-500">{pack.entries.length} validated catalog {pack.entries.length === 1 ? 'entry' : 'entries'}</p>
              {pack.type === 'sound-cue' && (
                <ul className="mt-2 flex flex-wrap gap-1.5" aria-label={`Sounds ${pack.displayName} plays`}>
                  {pack.sounds.map(sound => <SoundWordChip key={sound.word} sound={sound} />)}
                </ul>
              )}
              {state === 'Locked' && onGrant && (
                <LibraryButton type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onGrant({ id: pack.id, version: pack.version })}>
                  Grant test reward
                </LibraryButton>
              )}
            </article>
          );
        })}
      </div>
      {packs.length === 0 && <p className="mt-4 text-sm text-neutral-500">{inspect
        ? 'No registered Media Packs are available. The built-in catalogs remain active.'
        : 'No other sound packs yet: the Library\'s own sounds play.'}</p>}
    </LibraryPanel>
  );
}

