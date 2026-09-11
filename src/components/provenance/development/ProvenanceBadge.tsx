import {
  SEIPopover,
  SEIPopoverContent,
  SEIPopoverTrigger,
} from '@seihouse/ui';
import type { ProvenanceRecord } from '../shared/types';
import { ProvenanceDetails } from './ProvenanceDetails';
import './provenance.css';

export interface ProvenanceBadgeProps {
  record: ProvenanceRecord;
  className?: string;
}

function ProvenanceMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M14.95 8.05C14.3 7.32 13.33 6.95 12.16 6.95C10.38 6.95 9.12 7.89 9.12 9.3C9.12 10.71 10.38 11.28 12.12 11.81C13.9 12.35 15.18 13.03 15.18 14.58C15.18 16.12 13.83 17.05 11.94 17.05C10.63 17.05 9.5 16.56 8.82 15.66"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProvenanceBadge({ record, className = '' }: ProvenanceBadgeProps) {
  return (
    <SEIPopover>
      <SEIPopoverTrigger
        className={`provenance-badge ${className}`.trim()}
        aria-label={`View SEIHouse provenance for this ${record.contentType}`}
      >
        <ProvenanceMark />
      </SEIPopoverTrigger>
      <SEIPopoverContent
        variant="dark"
        align="end"
        sideOffset={7}
        collisionPadding={12}
        showArrow
        className="provenance-popover"
      >
        <ProvenanceDetails record={record} />
      </SEIPopoverContent>
    </SEIPopover>
  );
}
