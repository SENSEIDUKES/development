import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import ManifestationChamber, { ChamberForegroundMotes } from './ManifestationChamber';
import ManifestationReveal from './ManifestationReveal';
import CelestialScrollVessel from './vessels/CelestialScrollVessel';
import type { MediaManifestation } from '../shared/manifestation';
import { MEDIA_KIND_LABEL } from '../shared/manifestation';
import type { RevealedContent } from '../shared/manifestationReveal';

/**
 * Golden ambient energy pooling behind the scroll (chamber Layer 0) — the
 * media zone's own atmosphere: warm and agnostic, a deliberate counterpoint
 * to the narrative zone's violet battle omens. Kept subtle so the scroll
 * reveal stays the focus.
 */
const MediaZoneAmbient: React.FC = () => {
  const reduceMotion = useReducedMotion();
  return (
    <>
      <div
        className="absolute inset-[10%] rounded-full"
        style={{
          background:
            'radial-gradient(circle at 50% 55%, rgba(245,185,66,0.13) 0%, rgba(181,126,30,0.07) 45%, transparent 72%)',
        }}
      />
      {!reduceMotion && (
        <>
          <motion.div
            aria-hidden="true"
            className="absolute inset-[16%] rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, rgba(245,185,66,0) 0%, rgba(245,185,66,0.22) 18%, rgba(245,185,66,0) 40%, rgba(255,233,176,0.16) 65%, rgba(245,185,66,0) 88%, rgba(245,185,66,0) 100%)',
              filter: 'blur(10px)',
              mixBlendMode: 'screen',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute inset-[24%] rounded-full"
            style={{
              background:
                'conic-gradient(from 180deg, rgba(255,233,176,0) 0%, rgba(255,233,176,0.14) 22%, rgba(255,233,176,0) 46%, rgba(245,185,66,0.12) 70%, rgba(255,233,176,0) 92%, rgba(255,233,176,0) 100%)',
              filter: 'blur(14px)',
              mixBlendMode: 'screen',
            }}
            animate={{ rotate: -360 }}
            transition={{ duration: 44, repeat: Infinity, ease: 'linear' }}
          />
        </>
      )}
    </>
  );
};

export interface MediaManifestationZoneProps {
  isVersa: boolean;
  /** The media variant of the card's ManifestationSpec. */
  spec: MediaManifestation;
  /**
   * Optional tap handler for the sealed state (tap-to-unseal). When
   * omitted, the sealed scene renders non-interactive. The reveal
   * progression stays caller-owned — this only reports the tap.
   */
  onUnseal?: () => void;
}

/**
 * Media manifestation zone — the Aura Veil's active zone for standalone
 * media-generation operations (Cover Art, Image, Audio, Visual / Motion,
 * and future standalone asset types). Same ManifestationChamber and
 * layering contract as the narrative zone; what changes is the scene: the
 * agnostic Manifestation Reveal mechanic hosted by the celestial scroll
 * vessel (sealed → unsealing → revealed) instead of narrative omen scenes.
 *
 * The reveal contract is shared (`shared/manifestationReveal.ts`); the
 * media-layer shape is carried on the ManifestationSpec. The zone adapts
 * the media data into the vessel's expected props and hands the result to
 * the agnostic mechanic, so future vessels can be swapped in here without
 * touching the reveal logic.
 */
export default function MediaManifestationZone({ isVersa, spec, onUnseal }: MediaManifestationZoneProps) {
  // Adapt the media-layer data into the agnostic reveal content shape.
  // The media asset is the finished reveal; a null/undefined asset means
  // the revealed state renders its placeholder. When no asset is supplied
  // we forward the resolved media-kind label as `placeholderLabel` so the
  // reveal's accessible announcement ("Cover Art revealed") matches the
  // human-readable label the vessel displays inside its placeholder vista.
  const content: RevealedContent = spec.asset
    ? { src: spec.asset.src, alt: spec.asset.alt }
    : { placeholderLabel: MEDIA_KIND_LABEL[spec.mediaKind] };

  return (
    <ManifestationChamber
      isVersa={isVersa}
      ambient={<MediaZoneAmbient />}
      scene={
        <ManifestationReveal
          state={spec.reveal}
          content={content}
          onUnseal={onUnseal}
          vessel={
            <CelestialScrollVessel
              state={spec.reveal}
              asset={spec.asset ?? null}
              mediaKind={spec.mediaKind}
            />
          }
        />
      }
      foreground={<ChamberForegroundMotes isVersa={isVersa} />}
    />
  );
}
