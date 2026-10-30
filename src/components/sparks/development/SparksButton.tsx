import { MotionConfig } from 'motion/react';
import type { SparkHost } from '../shared/SparkHost';
import { Sparks } from './Sparks';
import './sparks.css';

/**
 * The Sparks button where writers create (the Creator Space and Story Seed's
 * Origin), with the motion its panel needs. `purpose` says what
 * a chosen spark does: plant a new Story Seed, or fill the open seed's Origin.
 */
export function SparksButton({ host, purpose = 'new-seed' }: {
  host?: SparkHost;
  purpose?: 'new-seed' | 'fill-seed';
}) {
  return <MotionConfig reducedMotion="user">
    <Sparks host={host} purpose={purpose} />
  </MotionConfig>;
}
