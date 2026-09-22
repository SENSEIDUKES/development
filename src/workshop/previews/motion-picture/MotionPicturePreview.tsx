import { useState } from 'react';
import { MotionPicture } from '@seihouse/sen/motion-picture';
import { ClipSourcePanel } from './ClipSourcePanel';
import { StoryCardDemo } from './StoryCardDemo';
import { motionPictureSamples, storyCardSample } from './previewData';
import './motion-picture-preview.css';

/**
 * Shows the ability on a real card first, then on the bare shapes it has to fit,
 * so it can be judged where it will actually be used.
 */
export function MotionPicturePreview() {
  const [overrideUrl, setOverrideUrl] = useState<string>();
  // One host-owned choice, to exercise the controlled path a profile would use.
  const [remembered, setRemembered] = useState(false);

  return <section className="motion-picture-preview" aria-label="Motion Picture preview">
    <header>
      <h3>Motion Picture</h3>
      <p>
        Every item keeps its still until you tap the control on its artwork. The aura is
        sampled from that item's own picture, and the clip hands the still back when it ends.
      </p>
    </header>

    <ClipSourcePanel overrideUrl={overrideUrl} onOverrideUrlChange={setOverrideUrl} />

    <section className="motion-picture-preview-section" aria-label="Story card">
      <h4>On a story card</h4>
      <p>The first card carrying the ability. More item types follow the same shape.</p>
      <div className="motion-picture-preview-cards">
        <StoryCardDemo {...storyCardSample} videoUrl={overrideUrl ?? storyCardSample.videoUrl} />
      </div>
    </section>

    <section className="motion-picture-preview-section" aria-label="Shapes and states">
      <h4>Shapes and states</h4>
      <p>The frame follows whatever size and ratio its host gives it.</p>
      <div className="motion-picture-preview-grid">
        {motionPictureSamples.map(sample => <article key={sample.id} className="motion-picture-preview-item">
          <MotionPicture
            className={`motion-picture-preview-art motion-picture-preview-art-${sample.shape}`}
            stillUrl={sample.stillUrl}
            videoUrl={sample.videoUrl && (overrideUrl ?? sample.videoUrl)}
            alt={sample.label}
            {...(sample.id === 'remembered' ? { playing: remembered, onPlayingChange: setRemembered } : {})}
          />
          <div className="motion-picture-preview-copy">
            <h5>{sample.label}</h5>
            <p>{sample.caption}</p>
            {sample.id === 'remembered' && <p className="motion-picture-preview-state" role="status">
              Host-remembered state: {remembered ? 'playing' : 'still'}
            </p>}
          </div>
        </article>)}
      </div>
    </section>
  </section>;
}
