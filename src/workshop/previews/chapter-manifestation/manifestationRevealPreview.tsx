import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Sparkles, Play, RotateCcw } from 'lucide-react';
import ManifestationReveal from '../../../components/chapter-manifestation/development/ManifestationReveal';
import CelestialScrollVessel from '../../../components/chapter-manifestation/development/vessels/CelestialScrollVessel';
import {
  MANIFESTATION_REVEAL_STATES,
  type ManifestationRevealState,
  type RevealedContent,
} from '../../../components/chapter-manifestation/shared/manifestationReveal';
import type { MediaKind, RevealedMediaAsset } from '../../../components/chapter-manifestation/shared/manifestation';
import { MEDIA_KIND_LABEL } from '../../../components/chapter-manifestation/shared/manifestation';

const MOCK_REVEALED_ASSET: RevealedMediaAsset = {
  src: '/icons/sacred-tree.svg',
  alt: 'Mock revealed standalone artwork',
};

const CONTAINMENT_OPTIONS: { id: 'compact' | 'full'; label: string; description: string; size: string }[] = [
  {
    id: 'compact',
    label: 'Compact',
    description: 'Side-by-side small previews; minimal vertical space.',
    size: 'min(28vw, 28dvh)',
  },
  {
    id: 'full',
    label: 'Full size',
    description: 'One large preview, full zone containment.',
    size: 'min(78vw, 78dvh)',
  },
];

const REVEAL_TIMING_MS: Record<'sealed' | 'revealed', number> = {
  sealed: 700,
  revealed: 1100,
};

/**
 * How long the reveal holds in `unsealing` while the asset generates.
 * "Instant" models an already-ready asset: it waits just past the opening
 * flourish (~1.1s) so the morph still completes before the reveal.
 */
const GENERATION_DELAY_OPTIONS = [
  { id: 'instant', label: 'Instant', ms: 1200 },
  { id: '3s', label: '3s', ms: 3000 },
  { id: '8s', label: '8s', ms: 8000 },
] as const;

type GenerationDelayId = (typeof GENERATION_DELAY_OPTIONS)[number]['id'];

const MEDIA_KIND_OPTIONS: { id: MediaKind; label: string }[] = [
  { id: 'cover-art', label: 'Cover Art' },
  { id: 'image', label: 'Image' },
  { id: 'audio', label: 'Audio' },
  { id: 'visual-motion', label: 'Visual / Motion' },
];

interface ManifestationRevealPreviewProps {
  /** Default reveal state. Defaults to `sealed` so the first interaction is the tap. */
  initialState?: ManifestationRevealState;
  /** Default containment layout. Defaults to `full`. */
  initialContainment?: 'compact' | 'full';
}

/**
 * Focused standalone preview for the Manifestation Reveal mechanic.
 *
 * The reveal mechanic is vessel-agnostic, but the only implemented vessel
 * today is the celestial scroll — so this preview mounts the scroll inside
 * the agnostic mechanic, then exercises every state, content, containment,
 * and activation path that the next visual-design pass will need.
 *
 * This preview is intentionally separate from the Aura Veil segment: the
 * Aura Veil exercises the reveal inside the full shell; this preview lets
 * a designer inspect the reveal mechanic on its own, in any containment,
 * with any supplied content, without the rest of the veil getting in the
 * way.
 */
export function ManifestationRevealPreview({
  initialState = 'sealed',
  initialContainment = 'full',
}: ManifestationRevealPreviewProps) {
  const [state, setState] = useState<ManifestationRevealState>(initialState);
  const [contentMode, setContentMode] = useState<'mock' | 'placeholder'>('mock');
  const [mediaKind, setMediaKind] = useState<MediaKind>('image');
  const [unsealEnabled, setUnsealEnabled] = useState(true);
  const [containment, setContainment] = useState<'compact' | 'full'>(initialContainment);
  const [generationDelayId, setGenerationDelayId] = useState<GenerationDelayId>('instant');
  const [replayKey, setReplayKey] = useState(0);

  const sequenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generationDelayMs = useMemo(
    () =>
      GENERATION_DELAY_OPTIONS.find((o) => o.id === generationDelayId)?.ms ??
      GENERATION_DELAY_OPTIONS[0].ms,
    [generationDelayId],
  );

  const clearSequenceTimer = useCallback(() => {
    if (sequenceTimer.current !== null) {
      clearTimeout(sequenceTimer.current);
      sequenceTimer.current = null;
    }
  }, []);

  // No pending timer may outlive this preview.
  useEffect(() => clearSequenceTimer, [clearSequenceTimer]);

  // Manual state override — also cancels any in-flight sequence.
  const setStateAndCancel = useCallback(
    (next: ManifestationRevealState) => {
      clearSequenceTimer();
      setState(next);
    },
    [clearSequenceTimer],
  );

  const content: RevealedContent = useMemo(() => {
    if (contentMode === 'mock') return MOCK_REVEALED_ASSET;
    // Forward the selected media-kind label so the reveal's aria announcement
    // matches the label the vessel displays inside its placeholder vista.
    return { placeholderLabel: MEDIA_KIND_LABEL[mediaKind] };
  }, [contentMode, mediaKind]);

  const vessel = useMemo(
    () => (
      <CelestialScrollVessel
        state={state}
        asset={content.src ? MOCK_REVEALED_ASSET : null}
        mediaKind={mediaKind}
      />
    ),
    [state, content.src, mediaKind],
  );

  // Tap-to-unseal: the mechanic reports the tap; the preview advances
  // the state itself (sealed → unsealing → revealed) to demonstrate
  // caller ownership. The unsealing hold matches the selected simulated
  // generation delay, mirroring how the Aura Veil holds the state while
  // a real asset generates.
  const handleUnseal = useCallback(() => {
    if (state !== 'sealed') return;
    // Cancel any in-flight sequence first; otherwise the sequence's
    // pending timeout leaks past the tap and fires a competing
    // `setState('revealed')` later.
    clearSequenceTimer();
    setState('unsealing');
    sequenceTimer.current = setTimeout(() => {
      sequenceTimer.current = null;
      setState('revealed');
    }, generationDelayMs);
  }, [state, clearSequenceTimer, generationDelayMs]);

  // Replay the full sequence: sealed → unsealing → revealed, then
  // rest. The unsealing step holds for the simulated generation delay.
  // Manual state pills always win mid-sequence.
  const replaySequence = useCallback(() => {
    clearSequenceTimer();
    setReplayKey((k) => k + 1);
    setState('sealed');
    const step = (idx: number) => {
      const next = MANIFESTATION_REVEAL_STATES[idx];
      if (!next) {
        sequenceTimer.current = null;
        return;
      }
      setState(next);
      const isLast = idx === MANIFESTATION_REVEAL_STATES.length - 1;
      const wait = isLast
        ? 1200
        : next === 'unsealing'
          ? generationDelayMs
          : REVEAL_TIMING_MS[next];
      sequenceTimer.current = setTimeout(() => step(idx + 1), wait);
    };
    sequenceTimer.current = setTimeout(() => step(0), 0);
  }, [clearSequenceTimer, generationDelayMs]);

  // Restart everything to the sealed initial state.
  const reset = useCallback(() => {
    clearSequenceTimer();
    setReplayKey((k) => k + 1);
    setState(initialState);
  }, [clearSequenceTimer, initialState]);

  const onUnseal = unsealEnabled && state === 'sealed' ? handleUnseal : undefined;
  const sizing =
    CONTAINMENT_OPTIONS.find((o) => o.id === containment)?.size ?? CONTAINMENT_OPTIONS[0].size;

  return (
    <div
      className="w-full min-h-[calc(100vh-9rem)] p-4 sm:p-8"
      data-manifestation-reveal-preview
      data-replay-key={replayKey}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)] gap-6 max-w-7xl mx-auto">
        {/* ── Stage ───────────────────────────────────────────────────── */}
        <section
          className="relative bg-neutral-950 rounded-2xl border border-white/5 flex items-center justify-center min-h-[60dvh] overflow-hidden"
          aria-label="Manifestation reveal stage"
        >
          <div
            className="relative flex items-center justify-center"
            style={{ width: sizing, height: sizing, transition: 'width 240ms ease, height 240ms ease' }}
            data-containment={containment}
            data-testid="manifestation-reveal-stage"
          >
            <ManifestationReveal
              state={state}
              content={content}
              onUnseal={onUnseal}
              vessel={vessel}
              sealedTapLabel={`Unseal the manifestation (${mediaKind})`}
              data-testid="manifestation-reveal-mechanic"
            />
          </div>

          {containment === 'compact' && (
            <p className="absolute bottom-3 left-3 right-3 text-center text-[10px] uppercase tracking-widest text-white/35">
              Compact containment · {sizing}
            </p>
          )}
        </section>

        {/* ── Controls ───────────────────────────────────────────────── */}
        <aside className="bg-neutral-900/50 border border-white/5 rounded-2xl p-5 sm:p-6 space-y-6 text-sm text-white/80">
          <header>
            <h2 className="text-xs font-semibold text-white/90 flex items-center gap-2 uppercase tracking-widest">
              <Sparkles size={14} className="text-amber-300" /> Manifestation Reveal
            </h2>
            <p className="mt-2 text-[12px] leading-relaxed text-white/55">
              Agnostic sealed → unsealing → revealed mechanic. The vessel is the
              celestial scroll; the next visual-design pass keeps the scroll but
              redesigns the artwork.
            </p>
          </header>

          <ControlGroup
            label="State"
            description="Manually view each progression. Manual picks cancel any in-flight sequence."
          >
            <PillRow>
              {MANIFESTATION_REVEAL_STATES.map((s) => (
                <Pill
                  key={s}
                  selected={state === s}
                  onClick={() => setStateAndCancel(s)}
                  label={s.charAt(0).toUpperCase() + s.slice(1)}
                />
              ))}
            </PillRow>
          </ControlGroup>

          <ControlGroup
            label="Sequence"
            description="Replay sealed → unsealing → revealed. Stops on the revealed state."
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={replaySequence}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-amber-500/15 border border-amber-500/35 text-amber-200 hover:bg-amber-500/25 transition-colors"
              >
                <Play size={12} /> Play sequence
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-white/5 border border-white/15 text-white/80 hover:bg-white/10 transition-colors"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          </ControlGroup>

          <ControlGroup
            label="Simulated generation delay"
            description="How long the reveal holds in unsealing while the asset generates. Applies to tap-to-unseal and Play sequence; the holding loop sustains indefinitely."
          >
            <PillRow>
              {GENERATION_DELAY_OPTIONS.map((o) => (
                <Pill
                  key={o.id}
                  selected={generationDelayId === o.id}
                  onClick={() => setGenerationDelayId(o.id)}
                  label={o.label}
                />
              ))}
            </PillRow>
          </ControlGroup>

          <ControlGroup
            label="Revealed content"
            description="Switch between a supplied mock asset and the vessel's empty placeholder."
          >
            <PillRow>
              <Pill
                selected={contentMode === 'mock'}
                onClick={() => setContentMode('mock')}
                label="Mock asset"
              />
              <Pill
                selected={contentMode === 'placeholder'}
                onClick={() => setContentMode('placeholder')}
                label="Placeholder"
              />
            </PillRow>
          </ControlGroup>

          <ControlGroup
            label="Tap to unseal"
            description="With unseal on, the sealed scene is a button. With it off, the scene is a non-interactive image."
          >
            <PillRow>
              <Pill
                selected={unsealEnabled}
                onClick={() => setUnsealEnabled(true)}
                label="On"
              />
              <Pill
                selected={!unsealEnabled}
                onClick={() => setUnsealEnabled(false)}
                label="Off"
              />
            </PillRow>
          </ControlGroup>

          <ControlGroup
            label="Vessel kind"
            description="The vessel placeholder uses this label when no asset is supplied. Visible only when content is set to Placeholder."
          >
            <PillRow>
              {MEDIA_KIND_OPTIONS.map((k) => (
                <Pill
                  key={k.id}
                  selected={mediaKind === k.id}
                  onClick={() => setMediaKind(k.id)}
                  label={k.label}
                />
              ))}
            </PillRow>
          </ControlGroup>

          <ControlGroup
            label="Containment"
            description="Compact fits the reveal in a small box; full size shows the natural zone fill."
          >
            <PillRow>
              {CONTAINMENT_OPTIONS.map((c) => (
                <Pill
                  key={c.id}
                  selected={containment === c.id}
                  onClick={() => setContainment(c.id)}
                  label={c.label}
                />
              ))}
            </PillRow>
          </ControlGroup>

          <div className="pt-2 border-t border-white/5 space-y-1.5 text-[11px] text-white/45">
            <p>
              Current state: <span className="text-white/80 font-medium">{state}</span>
            </p>
            <p>
              OnUnseal: <span className="text-white/80 font-medium">{onUnseal ? 'bound' : 'omitted'}</span>
            </p>
            <p>
              Content: <span className="text-white/80 font-medium">{content.src ? 'supplied asset' : 'placeholder'}</span>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ControlGroup({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <p className="text-[11px] font-semibold text-white/85 uppercase tracking-widest">{label}</p>
        <p className="text-[11px] leading-relaxed text-white/45 mt-0.5">{description}</p>
      </div>
      {children}
    </section>
  );
}

function PillRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Pill({
  selected,
  onClick,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`px-3 py-1.5 text-[11px] rounded-full border transition-colors ${
        selected
          ? 'bg-amber-500/20 border-amber-500/45 text-amber-100'
          : 'bg-white/5 border-white/10 text-white/65 hover:border-white/25 hover:text-white/85'
      }`}
    >
      {label}
    </button>
  );
}

export default ManifestationRevealPreview;
