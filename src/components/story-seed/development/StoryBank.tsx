import type { ReactNode } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Copy,
  Download,
  GitBranch,
  Info,
  Play,
  ScrollText,
  Sparkle,
  SquarePen,
  Vault,
  type LucideIcon,
} from 'lucide-react';
import type { StorySeedRecord } from '../shared/storySeedRepository';
import { LibraryButton, LibraryPanel, ManifestButton } from '../../library';

/**
 * Story Bank — the permanent home for every saved Story Seed and its latest
 * World Blueprint. It replaces the old inline "My Story Seeds" panel: a real
 * view inside the Story Seed shell (same glass panel, ambience, dossier
 * heading language, and medallion/chip vocabulary as the workspaces and the
 * Blueprint review), reachable from the mobile bottom navigation's Story Bank
 * tab and the desktop header button.
 *
 * Each compact card shows the seed's title, premise, latest Blueprint
 * version/status, last updated date, and whether a novel was already
 * manifested from it, and carries the seed's working actions: edit the seed
 * in the Story Seed workspace, view/edit its Blueprint, load it back into
 * Story Seed, export it, or manifest the novel. Story Seed import/export
 * lives here too instead of being scattered across the creation page.
 */

interface StoryBankCardProps {
  record: StorySeedRecord;
  /** A novel was already manifested from this seed. */
  manifested: boolean;
  isGenerating: boolean;
  onEditSeed: (record: StorySeedRecord) => void;
  onOpenBlueprint: (record: StorySeedRecord) => void;
  onUseSeed: (record: StorySeedRecord) => void;
  onExportSeed: (record: StorySeedRecord) => void;
  onManifest: (record: StorySeedRecord) => void;
}

/** Dossier metadata chip — the same quiet pill the Blueprint review uses. */
const BankChip = ({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon;
  children: ReactNode;
}) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(172,166,214,0.25)] bg-[rgba(11,14,30,0.5)] px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-neutral-300">
    {Icon && <Icon size={10} aria-hidden="true" className="text-[#ACA6D6]" />}
    {children}
  </span>
);

const StoryBankCard = ({
  record,
  manifested,
  isGenerating,
  onEditSeed,
  onOpenBlueprint,
  onUseSeed,
  onExportSeed,
  onManifest,
}: StoryBankCardProps) => {
  const premise = record.seed.story.required.premise.trim();
  const blueprint = record.blueprint;
  const updatedAt = new Date(record.updatedAt);
  const updatedLabel = Number.isNaN(updatedAt.getTime())
    ? record.updatedAt || 'Unknown'
    : updatedAt.toLocaleDateString();

  return (
    <article className="story-bank-card flex flex-col rounded-xl border border-[rgba(172,166,214,0.16)] bg-[rgba(11,14,30,0.55)] p-4 shadow-[inset_0_1px_0_rgba(226,220,200,0.05),0_14px_32px_-18px_rgba(1,3,10,0.95)] sm:p-5">
      <h3 className="break-words font-display text-sm font-bold uppercase tracking-[0.12em] text-[#F3EDE0]">
        {record.title}
      </h3>

      <p className="mt-2 line-clamp-2 font-serif text-[13px] leading-relaxed text-[#B0A99B]">
        {premise || 'No premise recorded yet.'}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {manifested ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(205,178,113,0.45)] bg-[rgba(205,178,113,0.07)] px-2.5 py-1 font-sc text-[9px] font-bold uppercase tracking-[0.18em] text-[#DDC58A] shadow-[0_0_14px_rgba(205,178,113,0.12)]">
            <Sparkle size={9} aria-hidden="true" />
            Novel Manifested
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-950/60 px-2.5 py-1 font-sc text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-400">
            No Novel Yet
          </span>
        )}
        {blueprint ? (
          <>
            <BankChip icon={GitBranch}>Blueprint {blueprint.blueprintVersion || 'v1.0'}</BankChip>
            {blueprint.status && <BankChip icon={Info}>Status: {blueprint.status}</BankChip>}
          </>
        ) : (
          <BankChip icon={ScrollText}>No Blueprint Yet</BankChip>
        )}
        <BankChip icon={CalendarDays}>
          Updated {updatedLabel}
        </BankChip>
      </div>

      {/* Card actions — Edit Seed returns to the intake workspace, Blueprint
          opens the dossier, Use Seed loads the seed back into Story Seed, and
          Manifest Novel starts the story directly. Manifest stays disabled
          until the seed holds a Blueprint. */}
      <div className="mt-auto pt-4">
        <div className="flex flex-col gap-3 border-t border-neutral-900/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <LibraryButton
              size="sm"
              variant="secondary"
              icon={SquarePen}
              onClick={() => onEditSeed(record)}
              title="Open this seed in the Story Seed workspace to edit it"
            >
              Edit Seed
            </LibraryButton>
            <LibraryButton
              size="sm"
              variant="ghost"
              icon={ScrollText}
              onClick={() => onOpenBlueprint(record)}
              title="View or edit this seed's World Blueprint"
            >
              Blueprint
            </LibraryButton>
            <LibraryButton
              size="sm"
              variant="ghost"
              icon={Play}
              onClick={() => onUseSeed(record)}
              title="Load this seed back into Story Seed"
            >
              Use Seed
            </LibraryButton>
            <LibraryButton
              size="sm"
              variant="ghost"
              icon={Download}
              onClick={() => onExportSeed(record)}
              title={`Export ${record.title}`}
              aria-label={`Export ${record.title}`}
            >
              Export
            </LibraryButton>
          </div>
          <ManifestButton
            size="sm"
            fullWidth
            className="shrink-0 sm:w-auto"
            onClick={() => onManifest(record)}
            disabled={!blueprint || isGenerating}
            title={blueprint
              ? 'Manifest the novel from this seed and its World Blueprint'
              : 'Manifest a World Blueprint before the novel'}
          >
            Manifest Novel
          </ManifestButton>
        </div>
      </div>
    </article>
  );
};

interface StoryBankProps {
  seeds: StorySeedRecord[];
  isLoading: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
  /** Ids of seeds that already have a manifested novel. */
  manifestedSeedIds: ReadonlySet<string>;
  isGenerating: boolean;
  /** Toggles the Import panel rendered in `importPanel`. */
  onToggleImport: () => void;
  /** The collapsible ImportPanel, owned by CreationModal. */
  importPanel: ReactNode;
  onExportAll: () => void;
  onEditSeed: (record: StorySeedRecord) => void;
  onOpenBlueprint: (record: StorySeedRecord) => void;
  onUseSeed: (record: StorySeedRecord) => void;
  onExportSeed: (record: StorySeedRecord) => void;
  onManifest: (record: StorySeedRecord) => void;
}

export const StoryBank = ({
  seeds,
  isLoading,
  loadError,
  onRetryLoad,
  manifestedSeedIds,
  isGenerating,
  onToggleImport,
  importPanel,
  onExportAll,
  onEditSeed,
  onOpenBlueprint,
  onUseSeed,
  onExportSeed,
  onManifest,
}: StoryBankProps) => (
  <LibraryPanel as="section" aria-labelledby="story-bank-title" padding="none" className="story-bank-surface mt-6">
    {/* The same restrained celestial ambience the creation workspaces float over. */}
    <div aria-hidden="true" className="seed-workspace-ambience" />

    {/* `seed-workspace-shell` scopes the Story Seed field polish (gilded
        focus ring, quiet completed accents) onto the Import panel's glass
        field, keeping it consistent with the workspaces. */}
    <div className="seed-workspace-shell relative p-4 sm:p-8">
      <p className="font-sc text-[11px] font-bold uppercase tracking-[0.34em] text-neutral-400">
        <span className="text-[#CDB271]/90">Story Seed</span>
        <span className="mx-2.5 text-neutral-700">/</span>
        <span className="text-neutral-400">Story Bank</span>
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <h2
            id="story-bank-title"
            className="flex items-center gap-3.5 font-display text-2xl font-bold uppercase tracking-[0.14em] text-[#F3EDE0] sm:text-3xl"
          >
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(205,178,113,0.38)] bg-[radial-gradient(circle_at_32%_28%,rgba(205,178,113,0.14),rgba(11,14,30,0.55)_68%)] text-[#CDB271] shadow-[0_0_16px_rgba(205,178,113,0.12),inset_0_0_10px_rgba(205,178,113,0.08)]"
            >
              <Vault size={19} className="drop-shadow-[0_0_6px_rgba(205,178,113,0.35)]" />
            </span>
            Story Bank
          </h2>
          {!loadError && seeds.length > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-950/60 px-2.5 py-0.5 font-sc text-[10px] uppercase tracking-widest text-neutral-400">
              {seeds.length} {seeds.length === 1 ? 'Seed' : 'Seeds'} Banked
            </span>
          )}
        </div>

        {/* Import/export live in the Story Bank — nowhere else in Story Seed. */}
        <div className="flex items-center gap-2">
          <LibraryButton size="sm" variant="secondary" icon={Copy} onClick={onToggleImport}>
            Import
          </LibraryButton>
          <LibraryButton
            size="sm"
            variant="ghost"
            icon={Download}
            onClick={onExportAll}
            disabled={seeds.length === 0}
          >
            Export All
          </LibraryButton>
        </div>
      </div>

      <p className="mt-3 max-w-xl font-serif text-[15px] leading-relaxed text-[#B0A99B]">
        Your saved Story Seeds and their World Blueprints, kept together and ready to reopen, refine, or manifest into novels.
      </p>

      <div aria-hidden="true" className="mt-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[rgba(205,178,113,0.16)] to-[rgba(205,178,113,0.34)]" />
        <Sparkle size={10} className="shrink-0 text-[#CDB271]/70" />
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[rgba(205,178,113,0.16)] to-[rgba(205,178,113,0.34)]" />
      </div>

      {importPanel}

      <div className="mt-6">
        {isLoading && (
          <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-neutral-400" role="status">
            {seeds.length > 0 ? 'Refreshing saved seeds…' : 'Loading saved seeds…'}
          </p>
        )}
        {loadError && (
          <div className="mb-3 rounded-xl border border-red-900/60 bg-red-950/20 px-5 py-6 text-center" role="alert">
            <AlertTriangle size={20} aria-hidden="true" className="mx-auto text-red-300" />
            <p className="mt-3 font-serif text-[14px] leading-relaxed text-red-100">
              {loadError}
            </p>
            {onRetryLoad && (
              <LibraryButton size="sm" variant="secondary" onClick={onRetryLoad} className="mt-4">
                Retry Story Bank
              </LibraryButton>
            )}
          </div>
        )}
        {seeds.length === 0 && !isLoading && !loadError ? (
          <div className="rounded-xl border border-dashed border-neutral-800 bg-black/20 px-6 py-10 text-center">
            <span
              aria-hidden="true"
              className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(205,178,113,0.38)] bg-[radial-gradient(circle_at_32%_28%,rgba(205,178,113,0.14),rgba(11,14,30,0.55)_68%)] text-[#CDB271]"
            >
              <Vault size={19} />
            </span>
            <p className="mt-4 font-serif text-[15px] leading-relaxed text-[#B0A99B]">
              No saved seeds yet. Manifest or import one to keep it here.
            </p>
            <LibraryButton
              size="sm"
              variant="secondary"
              icon={Copy}
              onClick={onToggleImport}
              className="mt-5"
            >
              Import Story Seed
            </LibraryButton>
          </div>
        ) : seeds.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
            {seeds.map(record => (
              <StoryBankCard
                key={record.id}
                record={record}
                manifested={manifestedSeedIds.has(record.id)}
                isGenerating={isGenerating}
                onEditSeed={onEditSeed}
                onOpenBlueprint={onOpenBlueprint}
                onUseSeed={onUseSeed}
                onExportSeed={onExportSeed}
                onManifest={onManifest}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  </LibraryPanel>
);
