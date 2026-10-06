import type { ComponentProps } from 'react';
import { AmbientEffect } from '@seihouse/sen/presentation';

export type AmbientEffectsProps = ComponentProps<typeof AmbientEffect>;

/** Generation overlay background particles; SEN owns the reusable effect engine. */
export function AmbientEffects(props: AmbientEffectsProps) {
  return <AmbientEffect {...props} />;
}
