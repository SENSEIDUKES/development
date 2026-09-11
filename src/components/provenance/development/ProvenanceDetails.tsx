import type { ProvenanceContentType, ProvenanceRecord, ProvenanceStatus } from '../shared/types';
import './provenance.css';

const STATUS_LABELS: Record<ProvenanceStatus, string> = {
  recorded: 'Recorded by SEIHouse',
  verified: 'Verified',
  'verification-unavailable': 'Verification unavailable',
};

const CONTENT_TYPE_LABELS: Record<ProvenanceContentType, string> = {
  text: 'Text',
  chapter: 'Chapter',
  story: 'Story',
  translation: 'Translation',
  image: 'Image',
  cover: 'Cover',
  audio: 'Audio',
  narration: 'Narration',
  video: 'Video',
  other: 'Other generated asset',
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

interface DetailRowProps {
  label: string;
  value?: string;
  timestamp?: boolean;
}

function DetailRow({ label, value, timestamp = false }: DetailRowProps) {
  return (
    <div className="provenance-details-row">
      <dt>{label}</dt>
      <dd>
        {value
          ? timestamp
            ? <time dateTime={value}>{formatTimestamp(value)}</time>
            : value
          : <span className="provenance-details-missing">Not provided</span>}
      </dd>
    </div>
  );
}

export interface ProvenanceDetailsProps {
  record: ProvenanceRecord;
  className?: string;
}

export function ProvenanceDetails({ record, className = '' }: ProvenanceDetailsProps) {
  const hasUser = Boolean(record.userId);

  return (
    <section
      className={`provenance-details ${className}`.trim()}
      aria-label={`Provenance details for ${CONTENT_TYPE_LABELS[record.contentType]}`}
    >
      <div className="provenance-details-heading">
        <span className="provenance-details-mark" aria-hidden="true">Ⓢ</span>
        <div>
          <h3>Generated through SEIHouse</h3>
          <p>
            {hasUser
              ? 'SEIHouse recorded this asset for this user at this time.'
              : 'SEIHouse recorded this asset at this time. No user record is attached to this local entry.'}
          </p>
        </div>
      </div>

      <dl className="provenance-details-list">
        <DetailRow label="Content type" value={CONTENT_TYPE_LABELS[record.contentType]} />
        <DetailRow label="Recorded" value={record.recordedAt} timestamp />
        {record.generatedAt && <DetailRow label="Generated" value={record.generatedAt} timestamp />}
        <DetailRow label="Provenance ID" value={record.provenanceId} />
        <DetailRow label="Generator" value={record.generator} />
        <DetailRow label="Model" value={record.model} />
        <DetailRow label="User record" value={record.userId} />
        <DetailRow label="Asset record" value={record.assetId} />
        <DetailRow label="Content fingerprint" value={record.contentHash} />
        <DetailRow label="Parent lineage" value={record.parentAssetId} />
      </dl>

      <div className="provenance-details-status">
        <span aria-hidden="true" />
        {STATUS_LABELS[record.status]}
      </div>
      <p className="provenance-details-caveat">
        Development record only. Cryptographic verification is not connected.
      </p>
    </section>
  );
}
