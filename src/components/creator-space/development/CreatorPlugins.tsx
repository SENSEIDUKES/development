import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, PackagePlus, Paintbrush } from 'lucide-react';
import {
  SPPPluginBrowser,
  type SPPPluginBrowserCategory,
  type SPPPluginBrowserGroup,
  type SPPPluginBrowserItem,
} from '@seihouse/ui';
import type { MediaPack } from '../../../library/media/mediaPacks';
import { SkillPackageImport } from '../../../library/stories/settings/SkillPackageImport';
import type {
  CreatorPluginPackage,
  CreatorPluginsProps,
  CreatorToolkitFilter,
  CreatorToolkitKind,
} from '../shared/creatorSpaceContracts';
import './creator-space.css';

/** The two families the page's switch offers: what shapes the writing, and what is heard. */
const GROUPS: readonly SPPPluginBrowserGroup[] = [
  { id: 'information', label: 'Information' },
  { id: 'media', label: 'Media' },
];

const CATEGORIES: ReadonlyArray<SPPPluginBrowserCategory & { id: CreatorToolkitKind; kind: string }> = [
  {
    id: 'style',
    label: 'Style Packs',
    group: 'information',
    kind: 'style pack',
    description: 'Writing traditions and prose direction chosen in Story Seed or a world’s Assets.',
  },
  {
    id: 'soundscape',
    label: 'Soundscapes',
    group: 'media',
    kind: 'soundscape',
    description: 'Composed ambient scores matched to each chapter’s opening mood.',
  },
  {
    id: 'cue',
    label: 'Cues',
    group: 'media',
    kind: 'cue',
    description: 'Inline sound effects triggered on story moments.',
  },
  {
    id: 'atmosphere',
    label: 'Atmospheres',
    group: 'media',
    kind: 'atmosphere',
    description: 'Seamless weather and environment beds that play under your chapters.',
  },
];

const KINDS = new Set<string>(CATEGORIES.map(category => category.id));

const PACK_KIND_MAP: Record<MediaPack['type'], CreatorToolkitKind> = {
  soundscape: 'soundscape',
  'sound-cue': 'cue',
  atmosphere: 'atmosphere',
};

/** What the plugin card and its detail show of one parent `.spp` package. */
function toPlugin(pack: CreatorPluginPackage): SPPPluginBrowserItem {
  return {
    id: pack.id,
    packageId: pack.id,
    category: pack.kind,
    kind: CATEGORIES.find(category => category.id === pack.kind)?.kind,
    name: pack.title,
    tagline: pack.description,
    version: pack.version,
    publisher: pack.builtIn ? 'NovelExpanded' : undefined,
    fileCount: pack.groups.reduce((sum, group) => sum + group.files.length, 0),
    coverSrc: pack.coverUrl,
    coverAlt: pack.coverUrl ? '' : undefined,
    // "Mine" is what the creator installed on this device; built-in packs come with the app.
    added: !pack.builtIn,
    // The detail lists every file. Its right-hand slot never wraps, so it holds only the
    // short word: the file's trigger word, or its group. Everything else is the line's text.
    contents: pack.groups.flatMap(group => group.files.map(file => {
      const badge = file.badge && file.badge !== group.label ? file.badge : undefined;
      return {
        label: [file.title, file.detail, badge && group.label].filter(Boolean).join(' — '),
        detail: badge ?? group.label,
      };
    })),
  };
}

/**
 * Creator Plugins: the SEIHouse Plugins Page (`SPPPluginBrowser`) over the
 * Library's parent `.spp` packages, built-in and installed on this device. One
 * row per kind, "See all" into one kind, and a package opens its detail with
 * what is inside. The page adds the way back to Create above it and, at its
 * foot, the two importers.
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
  const [importingMedia, setImportingMedia] = useState(false);
  const [skillImportOpen, setSkillImportOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const openPackId = selectedPackId !== undefined ? selectedPackId : internalPackId;
  const plugins = useMemo(() => catalog.packages.map(toPlugin), [catalog.packages]);

  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

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
      setStatusMessage(`Installed “${pack.displayName}” (v${pack.version}). Find its card above to see what is inside.`);
      if (openPackId) selectPack(null);
      if (filter !== 'all' && filter !== targetKind) selectFilter(targetKind);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'This .spp package could not be installed.');
    } finally {
      setImportingMedia(false);
    }
  };

  const canImportSkill = Boolean(skillIntake && onInstallSkill);

  return (
    <div data-creator-space data-creator-plugins className="creator-space space-y-1 pb-8 text-signal" data-testid="creator-plugins">
      {/* The top stays short on a phone, so plugins start within the first screen. */}
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to Create"
        className="creator-plugins-back -ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-lg pr-3 pl-1 font-sans text-sm text-neutral-300 hover:text-white"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Create
      </button>

      <SPPPluginBrowser
        title="Creator Plugins"
        noun="plugin"
        nounPlural="plugins"
        groups={GROUPS}
        categories={CATEGORIES}
        plugins={plugins}
        category={filter === 'all' ? null : filter}
        onCategoryChange={next => selectFilter(next && KINDS.has(next) ? next as CreatorToolkitKind : 'all')}
        openPlugin={openPackId ?? null}
        onOpenPluginChange={selectPack}
        className="max-sm:[&_h1]:!text-2xl"
      />

      {(onImportMediaPack || canImportSkill) && (
        <section aria-labelledby="creator-plugins-import" className="creator-plugin-panel !mt-8 space-y-3 rounded-2xl border border-white/15 p-4" data-testid="creator-plugins-import">
          <div>
            <h2 id="creator-plugins-import" className="font-display text-lg font-bold text-signal">Import your own</h2>
            <p className="mt-0.5 font-sans text-xs text-neutral-300 sm:text-sm">Add a .spp audio or skill pack from this device.</p>
          </div>

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
            {canImportSkill && (
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

          {statusMessage && (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 font-sans text-xs text-emerald-100 sm:text-sm">
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
          )}
        </section>
      )}
    </div>
  );
}
