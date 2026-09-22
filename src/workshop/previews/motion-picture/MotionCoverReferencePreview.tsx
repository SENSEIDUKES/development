import { useState } from 'react';
import { MotionCoverReference } from '../../../components/motion-picture/reference/MotionCoverReference';
import { STORY_CLIP_URL, storyCardSample } from './previewData';
import './motion-picture-preview.css';

/** Drives the locked production replica with the same artwork the new component uses. */
export function MotionCoverReferencePreview() {
  const [motionCoverActive, setMotionCoverActive] = useState(false);
  return <section className="motion-picture-preview" aria-label="Production motion cover reference">
    <header>
      <h3>Production motion cover</h3>
      <p>
        How it works on the story detail screen today, kept for comparison: its own button
        under the cover rather than on it, and an aura animated from JavaScript on three
        looping timers. It is still labelled with the old name in production.
      </p>
    </header>
    <MotionCoverReference
      imageUrl={storyCardSample.coverUrl}
      videoUrl={STORY_CLIP_URL}
      title={storyCardSample.title}
      motionCoverActive={motionCoverActive}
      onToggleMotionCover={() => setMotionCoverActive(active => !active)}
    />
  </section>;
}
