"use client";

import type React from "react";
import CultivatorTraveler from "./CultivatorTraveler";
import SwordRiderTraveler from "./SwordRiderTraveler";
import SpiritBeastTraveler from "./SpiritBeastTraveler";

/**
 * Traveler registry — the swappable-skin seam of the Journey Scrubber.
 *
 * A traveler is any figure that walks the qi path. The cultivator is the
 * default; skins are added by:
 *
 *   1. Creating a component that honors `TravelerRenderProps` and the local
 *      space contract (feet/anchor at (0,0), ~30–40px tall, facing right).
 *   2. Registering it in `TRAVELERS` under a stable id.
 *
 * Callers then select it with the scrubber's `travelerId` prop — no changes
 * to the path, trail, marker, or status layers.
 *
 * Current roster (the art bar for future generated icons — minimal
 * silhouettes, accent + accentSoft only, calm decoupled loops):
 * - `cultivator`   — the universal default runner.
 * - `sword-rider`  — glides standing on a flying sword, qi scarf fluttering;
 *                    no leg cycle, it floats. Cultivation power.
 * - `spirit-beast` — a small celestial fox, light trot/bounding, bushy tail.
 *                    Mystical companion.
 */

export interface TravelerRenderProps {
  /** Primary accent for the silhouette. */
  accent: string;
  /** Softer accent for highlights, limbs, and glows. */
  accentSoft: string;
  /** Whether the journey is in progress — run the movement loop. */
  moving: boolean;
  /** Whether the journey is complete — play the arrival reaction. */
  arrived: boolean;
  /** SVG glow filter id defined by the scrubber's <defs>. */
  filterId: string;
}

export type TravelerComponent = React.FC<TravelerRenderProps>;

export const DEFAULT_TRAVELER_ID = "cultivator";

const TRAVELERS: Record<string, TravelerComponent> = {
  [DEFAULT_TRAVELER_ID]: CultivatorTraveler,
  "sword-rider": SwordRiderTraveler,
  "spirit-beast": SpiritBeastTraveler,
};

/** Resolve a traveler id to its component, falling back to the cultivator. */
export function resolveTraveler(id?: string): TravelerComponent {
  return (id && Object.hasOwn(TRAVELERS, id) && TRAVELERS[id]) || TRAVELERS[DEFAULT_TRAVELER_ID];
}
