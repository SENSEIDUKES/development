import React from 'react';
import { motion, AnimatePresence, useReducedMotion, type Transition } from 'motion/react';
import {
  isManifestationRevealInteractive,
  manifestationRevealAriaLabel,
  type ManifestationRevealState,
  type RevealedContent,
} from '../shared/manifestationReveal';

/**
 * ManifestationReveal — the agnostic "something is revealed" mechanic.
 *
 * A vessel-agnostic presentation surface for a caller-owned three-state
 * progression (sealed → unsealing → revealed). The mechanic owns:
 *
 *   - the state machine routing (which scene is shown for which state),
 *   - the tap-to-unseal affordance (the sealed scene becomes a button when
 *     `onUnseal` is supplied; the other states are non-interactive),
 *   - the entrance/exit transition between states,
 *   - the accessible label announced in each state (composed from the
 *     supplied revealed content's `alt` when relevant),
 *   - reduced-motion handling for the cross-state transition (vessels own
 *     their own artwork motion).
 *
 * It deliberately owns NO artwork. The vessel — passed as the `vessel` prop
 * — renders the visual content for the current state. The current vessel
 * is the celestial scroll (`development/vessels/CelestialScrollVessel`),
 * but the mechanic's contract is vessel-agnostic.
 *
 * Caller ownership: the reveal NEVER advances its own state. The caller
 * owns every transition; `onUnseal` is a tap notification, not a state
 * mutation. A caller can listen for the tap and transition sealed →
 * unsealing → revealed itself.
 */

export interface ManifestationRevealProps {
  /**
   * The current reveal state. Caller-owned. The reveal never advances
   * this on its own.
   */
  state: ManifestationRevealState;
  /**
   * Optional content the reveal presents in its `revealed` state. The
   * vessel decides how to render either a finished asset (when `src` is
   * supplied) or a placeholder (when it is not). A null/undefined content
   * is the empty case.
   */
  content?: RevealedContent | null;
  /**
   * Optional tap handler. When supplied AND `state` is `sealed`, the
   * sealed scene is rendered as a button labeled `sealedTapLabel`. In any
   * other state (or when omitted) the reveal renders non-interactively
   * with `role="img"` and the appropriate aria-label.
   */
  onUnseal?: () => void;
  /**
   * The visual vessel. Receives `state` and `content` so it can render
   * the current artwork; the mechanic wraps it in the tap-to-unseal
   * affordance when interactive.
   *
   * The vessel is responsible for the artwork for each state (sealed,
   * unsealing, revealed) and for its own reduced-motion handling. The
   * mechanic's reduced-motion prop only governs the cross-state
   * AnimatePresence transition.
   */
  vessel: React.ReactNode;
  /**
   * Accessible label for the sealed tap target. Defaults to
   * "Unseal the manifestation".
   */
  sealedTapLabel?: string;
  /**
   * Optional className applied to the outer container. Use this to set
   * the host's size and responsive containment.
   */
  className?: string;
  /**
   * Optional test id for Workshop tests and integration selectors.
   */
  'data-testid'?: string;
}

/**
 * Cross-state choreography. Vessel-agnostic: it only knows the three
 * progression states, never the artwork. Leaving `sealed` gathers inward
 * (the anticipation beat on activation), entering `unsealing` blooms
 * slightly outward with the burst, and entering `revealed` rises and
 * settles so the manifested content lands in focus.
 */
const ENTER_FROM: Record<ManifestationRevealState, { opacity: number; scale: number; y: number }> = {
  sealed: { opacity: 0, scale: 0.96, y: 0 },
  unsealing: { opacity: 0, scale: 1.07, y: 0 },
  revealed: { opacity: 0, scale: 0.97, y: 8 },
};

const EXIT_TO: Record<ManifestationRevealState, { opacity: number; scale: number; y: number }> = {
  sealed: { opacity: 0, scale: 0.9, y: 0 },
  unsealing: { opacity: 0, scale: 1.04, y: 0 },
  revealed: { opacity: 0, scale: 0.97, y: 0 },
};

const ENTER_TRANSITION: Transition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };
const EXIT_TRANSITION: Transition = { duration: 0.3, ease: [0.4, 0, 1, 1] };
const CALM_TRANSITION: Transition = { duration: 0 };

/**
 * The cross-state transition. Vessels handle their own intra-state motion;
 * this is the AnimatePresence wrap that moves between them.
 */
const RevealScene: React.FC<{
  state: ManifestationRevealState;
  vessel: React.ReactNode;
  calm: boolean;
}> = ({ state, vessel, calm }) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={state}
      data-reveal-state={state}
      className="h-full w-full"
      initial={ENTER_FROM[state]}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        transition: calm ? CALM_TRANSITION : ENTER_TRANSITION,
      }}
      exit={{
        ...EXIT_TO[state],
        transition: calm ? CALM_TRANSITION : EXIT_TRANSITION,
      }}
    >
      {vessel}
    </motion.div>
  </AnimatePresence>
);

export default function ManifestationReveal({
  state,
  content,
  onUnseal,
  vessel,
  sealedTapLabel,
  className,
  'data-testid': dataTestId,
}: ManifestationRevealProps) {
  const reduceMotion = useReducedMotion();
  const calm = !!reduceMotion;
  const interactive = isManifestationRevealInteractive(state, onUnseal);
  const ariaLabel = manifestationRevealAriaLabel(state, content, sealedTapLabel);

  const scene = (
    <RevealScene state={state} vessel={vessel} calm={calm} />
  );

  const containerClassName = [
    'h-full w-full flex items-center justify-center',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (interactive) {
    return (
      <div
        className={containerClassName}
        data-reveal-container="interactive"
        data-reveal-state={state}
        data-testid={dataTestId}
      >
        <motion.button
          type="button"
          onClick={onUnseal}
          aria-label={ariaLabel}
          data-reveal-action="unseal"
          data-reveal-state={state}
          whileTap={calm ? undefined : { scale: 0.95 }}
          className="group h-full w-full appearance-none bg-transparent border-0 p-0 cursor-pointer rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
        >
          {/* Subtle invitation grow on hover/focus — signals the sealed
              scene is tappable without the vessel knowing about it. */}
          <div className="h-full w-full transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:scale-[1.03] group-focus-visible:scale-[1.03]">
            {scene}
          </div>
        </motion.button>
      </div>
    );
  }

  return (
    <div
      className={containerClassName}
      role="img"
      aria-label={ariaLabel}
      data-reveal-container="static"
      data-reveal-state={state}
      data-testid={dataTestId}
    >
      {scene}
    </div>
  );
}
