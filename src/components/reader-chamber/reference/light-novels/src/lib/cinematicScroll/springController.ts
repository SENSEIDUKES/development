/**
 * Critically damped spring controller for cinematic scrolling.
 *
 * Pure math — no DOM, no timers. The animation loop integrates this once per
 * frame against a cached numeric target and writes the resulting position to
 * the scroll surface. Semi-implicit Euler keeps the integration stable at any
 * frame rate; the clamps below make NaN/Infinity/teleport writes impossible.
 */

export interface SpringState {
  position: number;
  velocity: number;
}

export interface SpringConfig {
  /** Natural frequency (rad/s). Higher = stiffer, faster settling. */
  omega: number;
  /** Cap on a single integration step (seconds); background tabs can't jump. */
  maxDeltaSeconds: number;
  /** Absolute velocity cap (px/s). */
  maxVelocity: number;
  /** Absolute acceleration cap (px/s²). */
  maxAcceleration: number;
  /** Position error below which the spring counts as settled (px). */
  settleDistance: number;
  /** Velocity below which the spring counts as settled (px/s). */
  settleVelocity: number;
}

export const DEFAULT_SPRING_CONFIG: SpringConfig = {
  omega: 3.2,
  maxDeltaSeconds: 0.05,
  maxVelocity: 900,
  maxAcceleration: 3600,
  settleDistance: 0.5,
  settleVelocity: 1,
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const finiteOr = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

/**
 * Advance the spring one step toward `target`.
 * Returns a new state; never mutates the input.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  deltaSeconds: number,
  config: SpringConfig = DEFAULT_SPRING_CONFIG,
): SpringState {
  const dt = clamp(finiteOr(deltaSeconds, 0), 0, config.maxDeltaSeconds);

  const safeTarget = finiteOr(target, finiteOr(state.position, 0));
  const position = finiteOr(state.position, safeTarget);
  const velocity = finiteOr(state.velocity, 0);
  if (dt === 0) return { position, velocity };

  // Critically damped: acceleration = ω²·error − 2ω·velocity
  const rawAccel =
    config.omega * config.omega * (safeTarget - position) -
    2 * config.omega * velocity;
  const accel = clamp(rawAccel, -config.maxAcceleration, config.maxAcceleration);

  // Semi-implicit Euler: update velocity first, then position.
  const nextVelocity = clamp(
    velocity + accel * dt,
    -config.maxVelocity,
    config.maxVelocity,
  );
  const nextPosition = position + nextVelocity * dt;

  return { position: nextPosition, velocity: nextVelocity };
}

export function isSettled(
  state: SpringState,
  target: number,
  config: SpringConfig = DEFAULT_SPRING_CONFIG,
): boolean {
  return (
    Math.abs(target - state.position) <= config.settleDistance &&
    Math.abs(state.velocity) <= config.settleVelocity
  );
}

/** Linear interpolation with a clamped parameter. */
export function lerp(from: number, to: number, t: number): number {
  const clamped = clamp(finiteOr(t, 0), 0, 1);
  return from + (to - from) * clamped;
}
