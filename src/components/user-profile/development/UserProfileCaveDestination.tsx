import React, { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LibraryButton } from '@seihouse/library-ui';

/**
 * The frame every Cave destination opens into: a back control, the
 * destination title, and the content column. Focus lands on the heading when
 * the destination opens so keyboard and screen-reader users arrive at the new
 * surface instead of staying on the card they activated.
 */
export type CaveDestinationId =
  | 'settings'
  | 'inbox'
  | 'store'
  | 'redeem-code'
  | 'unavailable'
  | 'stories'
  | 'relics'
  | 'dao-pillar'
  | 'status-effects'
  | 'switchboard'
  | 'public-stories'
  | 'public-relics';

interface UserProfileCaveDestinationProps {
  id: CaveDestinationId;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onBack: () => void;
  backLabel?: string;
  children: React.ReactNode;
}

export function UserProfileCaveDestination({
  id,
  title,
  subtitle,
  icon,
  onBack,
  backLabel = 'Return to cave',
  children,
}: UserProfileCaveDestinationProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: false });
  }, [id]);

  return (
    <section
      data-cave-destination={id}
      aria-labelledby={`cave-destination-${id}-title`}
      className="mx-auto w-full max-w-3xl"
    >
      <header className="flex items-start gap-3 pb-4 sm:gap-4">
        <LibraryButton
          variant="ghost"
          size="icon"
          icon={ArrowLeft}
          aria-label={backLabel}
          onClick={onBack}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {icon ? (
              <span aria-hidden="true" className="text-[#e2c46a]">
                {icon}
              </span>
            ) : null}
            <h2
              id={`cave-destination-${id}-title`}
              ref={headingRef}
              tabIndex={-1}
              className="cave-title break-words font-display text-2xl leading-tight outline-none [overflow-wrap:anywhere] sm:text-3xl"
            >
              {title}
            </h2>
          </div>
          {subtitle ? (
            <p className="mt-1 break-words font-serif text-xs text-neutral-400 [overflow-wrap:anywhere] sm:text-sm">{subtitle}</p>
          ) : null}
        </div>
      </header>
      <div className="cave-rule mb-5" aria-hidden="true" />
      {children}
    </section>
  );
}
