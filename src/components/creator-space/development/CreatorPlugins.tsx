import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, AudioLines, Check, ChevronRight, Package, PackagePlus, Paintbrush, Volume2, Wind } from 'lucide-react';
import { LibraryButton, LibraryPanel } from '@seihouse/library-ui';
import type { MediaPack } from '../../../library/media/mediaPacks';
import { SkillPackageImport } from '../../../library/stories/settings/SkillPackageImport';
import type {
  CreatorPluginPackage,
  CreatorPluginsProps,
  CreatorToolkitFilter,
  CreatorToolkitKind,
} from '../shared/creatorSpaceContracts';
import './creator-space.css';

const FILTERS: ReadonlyArray<{ id: CreatorToolkitFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'style', label: 'Style Packs' },
  { id: 'soundscape', label: 'Soundscapes' },
  { id: 'cue', label: 'Cues' },
  { id: 'atmosphere', label: 'Atmospheres' },
];

const SECTIONS: ReadonlyArray<{
  kind: CreatorToolkitKind;
  title: string;
  subtitle: string;
  Icon: typeof Paintbrush;
}> = [
  {
    kind: 'style',
    title: 'Style Packs',
    subtitle: 'Writing traditions and prose direction chosen in Story Seed or a world’s Assets.',
    Icon: Paintbrush,
  },
  {
    kind: 'soundscape',
    title: 'Soundscapes',
    subtitle: 'Composed ambient scores matched to each chapter’s opening mood.',
    Icon: AudioLines,
  },
  {
    kind: 'cue',
    title: 'Cues',
    subtitle: 'Inline sound effects triggered on story moments.',
    Icon: Volume2,
  },
  {
    kind: 'atmosphere',
    title: 'Atmospheres',
    subtitle: 'Seamless weather and environment beds that play under your chapters.',
    Icon: Wind,
  },
];

const PACK_KIND_MAP: Record<MediaPack['type'], CreatorToolkitKind> = {
  soundscape: 'soundscape',
  'sound-cue': 'cue',
  atmosphere: 'atmosphere',
};

const MAX_PREVIEW_GROUPS = 8;

function totalPackageFiles(pack: CreatorPluginPackage): number {
  return pack.groups.reduce((sum, group) => sum + group.files.length, 0);
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

/**
 * Creator Plugins: lists parent `.spp` packages first in each category (built-in
 * and locally installed), and opens a selected `.spp` package to inspect its
 * groups and individual files.
 */
export function CreatorPlugins({
  catalog,
  initialFilter = 'all',
  onFilterChange,
  selectedPackId,
  onSelectPack,
  onBack,
  onImportMediaPack,
  skillIntake,
  onInstallSkill,
}: CreatorPluginsProps) {
  const [filter, setFilter] = useState<CreatorToolkitFilter>(initialFilter);
  const [internalPackId, setInternalPackId] = useState<string | null>(selectedPackId ?? null);
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [importingMedia, setImportingMedia] = useState(false);
  const [skillImportOpen, setSkillImportOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);

  const openPackId = selectedPackId !== undefined ? selectedPackId : internalPackId;
  const activePack = openPackId ? catalog.packages.find(pack => pack.id === openPackId) : undefined;

  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);
  useEffect(() => {
    setGroupFilter('all');
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    let cur: HTMLElement | null = rootRef.current;
    while (cur) {
      if (cur.scrollTop > 0) cur.scrollTop = 0;
      cur = cur.parentElement;
    }
  }, [activePack?.id]);

  const selectPack = (nextPackId: string | null) => {
    if (selectedPackId === undefined) setInternalPackId(nextPackId);
    onSelectPack?.(nextPackId);
  };

  const selectFilter = (next: CreatorToolkitFilter) => {
    setFilter(next);
    if (openPackId) selectPack(null);
    onFilterChange?.(next);
  };

  const handleMediaFile = async (file: File) => {
    if (!onImportMediaPack) return;
    setImportingMedia(true);
    setErrorMessage(undefined);
    setStatusMessage(undefined);
    try {
      const pack = await onImportMediaPack(file);
      const targetKind = PACK_KIND_MAP[pack.type];
      setStatusMessage(`Installed “${pack.displayName}” (v${pack.version}). Click its .spp card below to inspect its files.`);
      if (openPackId) selectPack(null);
      if (filter !== 'all' && filter !== targetKind) selectFilter(targetKind);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'This .spp package could not be installed.');
    } finally {
      setImportingMedia(false);
    }
  };

  if (activePack) {
    const sectionMeta = SECTIONS.find(section => section.kind === activePack.kind);
    const SectionIcon = sectionMeta?.Icon ?? Package;
    const totalFiles = totalPackageFiles(activePack);
    const visibleGroups = groupFilter === 'all'
      ? activePack.groups
      : activePack.groups.filter(group => group.id === groupFilter);

    return (
      <div ref={rootRef} data-creator-space data-creator-plugins className="creator-space space-y-6 pb-8 text-signal sm:space-y-8" data-testid="creator-plugin-detail">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <LibraryButton
              type="button"
              variant="ghost"
              size="icon"
              icon={ArrowLeft}
              aria-label="Back to Creator Plugins"
              onClick={() => selectPack(null)}
              className="mt-0.5 shrink-0"
            />
            <div>
              <p className="font-sans text-xs uppercase tracking-wider text-neutral-400">
                Creator Plugins · {sectionMeta?.title ?? 'Package'}
              </p>
              <h1 className="mt-0.5 font-display text-2xl font-bold leading-tight text-signal sm:text-3xl">
                {activePack.title}
              </h1>
              <p className="mt-1 font-sans text-xs text-neutral-300 sm:text-sm">
                {activePack.description}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="creator-space-tag">
              {activePack.builtIn ? `Built-in .spp · v${activePack.version}` : `Installed .spp · v${activePack.version}`}
            </span>
            <span className="creator-space-tag">
              {formatCount(totalFiles, activePack.unitSingular, activePack.unitPlural)}
            </span>
          </div>
        </div>

        {activePack.groups.length > 1 && (
          <div role="tablist" aria-label="Package groups" className="flex flex-wrap gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={groupFilter === 'all'}
              onClick={() => setGroupFilter('all')}
              className="creator-plugin-filter"
              data-active={groupFilter === 'all' || undefined}
            >
              All ({totalFiles})
            </button>
            {activePack.groups.map(group => {
              const active = groupFilter === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setGroupFilter(group.id)}
                  className="creator-plugin-filter"
                  data-active={active || undefined}
                >
                  {group.label} ({group.files.length})
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-5">
          {visibleGroups.map(group => (
            <section
              key={group.id}
              aria-labelledby={`pack-group-${group.id}`}
              className="creator-plugin-panel space-y-3.5 rounded-2xl border border-white/15 p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="creator-space-tool-icon"><SectionIcon size={16} aria-hidden="true" /></span>
                  <h2 id={`pack-group-${group.id}`} className="font-display text-lg font-bold text-signal sm:text-xl">
                    {group.label}
                  </h2>
                </div>
                <span className="creator-space-tag">
                  {formatCount(group.files.length, activePack.unitSingular, activePack.unitPlural)}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.files.map(file => (
                  <article key={file.id} className="creator-plugin-card rounded-xl border border-white/12 p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-sans text-sm font-semibold text-signal">{file.title}</h3>
                      {file.badge && (
                        <span className="shrink-0 rounded-full border border-white/15 px-2.5 py-0.5 font-sans text-[10px] text-cyan-200/90">
                          {file.badge}
                        </span>
                      )}
                    </div>
                    {file.detail && (
                      <p className="mt-1.5 font-sans text-xs leading-relaxed text-neutral-300">{file.detail}</p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  const customCount = catalog.packages.filter(pack => !pack.builtIn).length;

  return (
    <div ref={rootRef} data-creator-space data-creator-plugins className="creator-space space-y-6 pb-8 text-signal sm:space-y-8" data-testid="creator-plugins">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <LibraryButton type="button" variant="ghost" size="icon" icon={ArrowLeft} aria-label="Back to Create" onClick={onBack} className="shrink-0" />
          <div>
            <h1 className="font-display text-2xl font-bold leading-tight text-signal sm:text-3xl">Creator Plugins</h1>
            <p className="mt-0.5 font-sans text-xs text-neutral-300 sm:text-sm">
              Select a parent .spp pack to inspect its contents, or import a custom .spp package.
            </p>
          </div>
        </div>

        {(onImportMediaPack || (skillIntake && onInstallSkill)) && (
          <div className="flex flex-wrap items-center gap-2">
            {onImportMediaPack && (
              <>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept=".spp"
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden="true"
                  data-testid="creator-plugins-media-import"
                  onChange={event => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void handleMediaFile(file);
                  }}
                />
                <button
                  type="button"
                  disabled={importingMedia}
                  onClick={() => mediaInputRef.current?.click()}
                  className="creator-space-link"
                >
                  <PackagePlus size={16} aria-hidden="true" />
                  {importingMedia ? 'Installing…' : 'Import audio .spp'}
                </button>
              </>
            )}
            {skillIntake && onInstallSkill && (
              <button
                type="button"
                aria-expanded={skillImportOpen}
                onClick={() => setSkillImportOpen(open => !open)}
                className="creator-space-link"
              >
                <Paintbrush size={15} aria-hidden="true" />
                {skillImportOpen ? 'Hide skill .spp' : 'Import skill .spp'}
              </button>
            )}
          </div>
        )}
      </div>

      {statusMessage && (
        <p role="status" className="creator-plugin-notice flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 font-sans text-xs text-emerald-100 sm:text-sm">
          <Check size={16} className="shrink-0 text-emerald-300" aria-hidden="true" />
          <span>{statusMessage}</span>
        </p>
      )}
      {errorMessage && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 font-sans text-xs whitespace-pre-wrap text-red-200 sm:text-sm">
          {errorMessage}
        </p>
      )}

      {skillImportOpen && skillIntake && onInstallSkill && (
        <div className="creator-plugin-panel rounded-2xl border border-white/15 bg-black/40 p-4">
          <SkillPackageImport
            intake={skillIntake}
            busy={false}
            destinationSlot={filter === 'style' ? 'style' : undefined}
            onInstall={async skill => {
              await onInstallSkill(skill);
              setStatusMessage(`Installed skill “${skill.name}” (v${skill.version}).`);
              setSkillImportOpen(false);
            }}
          />
        </div>
      )}

      <div role="tablist" aria-label="Plugin categories" className="flex flex-wrap gap-2">
        {FILTERS.map(option => {
          const active = filter === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectFilter(option.id)}
              className="creator-plugin-filter"
              data-active={active || undefined}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {SECTIONS.filter(section => filter === 'all' || filter === section.kind).map(section => {
        const packs = catalog.packages.filter(pack => pack.kind === section.kind);
        const SectionIcon = section.Icon;
        return (
          <section
            key={section.kind}
            aria-labelledby={`plugins-${section.kind}-heading`}
            className="creator-plugin-panel space-y-4 rounded-2xl border border-white/15 p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="creator-space-tool-icon"><SectionIcon size={16} aria-hidden="true" /></span>
                <div>
                  <h2 id={`plugins-${section.kind}-heading`} className="font-display text-xl font-bold text-signal">
                    {section.title}
                  </h2>
                  <p className="font-sans text-xs text-neutral-300">{section.subtitle}</p>
                </div>
              </div>
              <span className="creator-space-tag">{formatCount(packs.length, '.spp pack', '.spp packs')}</span>
            </div>

            <div className={packs.length > 1 ? 'grid gap-3 md:grid-cols-2' : 'space-y-3'}>
              {packs.map(pack => (
                <ParentSppCard key={pack.id} pack={pack} onOpen={() => selectPack(pack.id)} />
              ))}
            </div>
          </section>
        );
      })}

      {customCount === 0 && filter === 'all' && onImportMediaPack && (
        <LibraryPanel padding="sm">
          <p className="font-sans text-xs text-neutral-300">
            Have a custom .spp soundscape, cue, atmosphere, or skill package? Use the import buttons at the top of this page to install it on this device, then equip it in Story Seed Settings or any world’s Assets tab.
          </p>
        </LibraryPanel>
      )}
    </div>
  );
}

function ParentSppCard({ pack, onOpen }: { pack: CreatorPluginPackage; onOpen: () => void }) {
  const totalFiles = totalPackageFiles(pack);
  const previewGroups = pack.groups.slice(0, MAX_PREVIEW_GROUPS);
  const extraGroups = pack.groups.length - previewGroups.length;
  const showCountsInChips = pack.groups.length > 1 || totalFiles > 1;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="creator-plugin-spp rounded-xl border border-white/15 p-4"
      data-testid={`plugin-spp-${pack.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="creator-space-tool-icon mt-0.5 shrink-0">
            <Package size={16} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-base font-bold text-signal sm:text-lg">{pack.title}</h3>
              <span className={`rounded-full border px-2.5 py-0.5 font-sans text-[10px] uppercase tracking-wider ${
                pack.builtIn
                  ? 'border-white/15 text-neutral-200'
                  : 'border-emerald-300/35 bg-emerald-400/15 text-emerald-100'
              }`}>
                {pack.builtIn ? `Built-in .spp · v${pack.version}` : `Installed .spp · v${pack.version}`}
              </span>
            </div>
            <p className="mt-1 font-sans text-xs leading-relaxed text-neutral-300">{pack.description}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 font-sans text-xs font-medium text-amber-100">
            {formatCount(totalFiles, pack.unitSingular, pack.unitPlural)}
          </span>
          <ChevronRight size={18} className="text-neutral-300" aria-hidden="true" />
        </div>
      </div>

      {previewGroups.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3">
          {previewGroups.map(group => (
            <span
              key={group.id}
              className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 font-sans text-[11px] text-neutral-200"
            >
              {showCountsInChips ? `${group.label} (${group.files.length})` : group.label}
            </span>
          ))}
          {extraGroups > 0 && (
            <span className="px-1.5 font-sans text-[11px] text-neutral-400">
              +{extraGroups} more
            </span>
          )}
        </div>
      )}
    </button>
  );
}
