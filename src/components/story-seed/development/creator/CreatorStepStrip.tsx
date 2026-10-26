import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { type StorySeedInput } from '@seihouse/sen/story-seed';
import { SENStorySeedIcon } from '../SENStorySeedIcon';
import {
  CREATOR_STEPS,
  WORLD_KINDS,
  stepOfPage,
  stepStatus,
  type CreatorPageId,
} from './creatorSteps';

/**
 * The character creator's step strip: Origin, ARC, World and Manifest, any of
 * which can be tapped. On World, its eight kinds sit beneath as a scrolling
 * row of sub-tabs, each marked once it holds something.
 */
export function CreatorStepStrip({ seed, page, onSelect }: {
  seed: StorySeedInput;
  page: CreatorPageId;
  onSelect: (page: CreatorPageId) => void;
}) {
  const currentStep = stepOfPage(page);
  const kindsRef = useRef<HTMLDivElement>(null);
  // Keep the open World kind in view when the row scrolls on a phone.
  useEffect(() => {
    kindsRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
      ?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [page]);

  return (
    <div className="seed-creator-strip" data-seed-creator-strip>
      <nav aria-label="Story Seed steps">
        <ol className="seed-creator-steps">
          {CREATOR_STEPS.map((step, index) => {
            const current = step.id === currentStep;
            const status = stepStatus(step.id, seed);
            return (
              <li key={step.id} className="seed-creator-step-item">
                <button type="button" className="seed-creator-step" data-step={step.id} data-status={status}
                  aria-current={current ? 'step' : undefined}
                  aria-label={`${step.label}${status === 'missing' ? ', required inputs missing' : status === 'filled' ? (step.id === 'manifest' ? ', ready' : ', has content') : ''}`}
                  onClick={() => onSelect(step.id === 'world' && current ? page : step.page)}>
                  <span className="seed-creator-step-marker" aria-hidden="true">
                    {status === 'filled' && !current ? <Check size={12} strokeWidth={2.5} /> : index + 1}
                  </span>
                  <span className="seed-creator-step-label">{step.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      {currentStep === 'world' && (
        <nav aria-label="World kinds" className="seed-creator-kinds" ref={kindsRef}>
          {WORLD_KINDS.map(kind => {
            const current = kind.id === page;
            const filled = kind.isFilled(seed);
            const Icon = kind.icon;
            return (
              <button key={kind.id} type="button" className="seed-creator-kind" data-kind={kind.id}
                aria-current={current ? 'page' : undefined} data-filled={filled}
                onClick={() => onSelect(kind.id)}>
                {typeof Icon === 'string'
                  ? <SENStorySeedIcon name={Icon} size={14} aria-hidden="true" />
                  : <Icon size={14} aria-hidden="true" />}
                <span>{kind.label}</span>
                {filled && <span className="seed-creator-kind-dot" role="img" aria-label="has content" />}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
