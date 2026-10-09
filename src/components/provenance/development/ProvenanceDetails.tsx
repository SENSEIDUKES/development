import type {
  ProvenanceContentType,
  ProvenancePresentationStatus,
  ProvenanceRecord,
} from '../shared/types';
import { getProvenancePresentationStatus } from '../shared/createProvenanceRecord';
import './provenance.css';

const STATUS_LABELS: Record<ProvenancePresentationStatus, string> = {
  mock: 'Development mock',
  recorded: 'Recorded by SEIHouse',
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

const ACTOR_LABELS: Record<ProvenanceRecord['actor'], string> = {
  user: 'User',
  ai: 'AI',
  system: 'System',
  import: 'Import',
};

const ACTION_LABELS: Record<ProvenanceRecord['action'], string> = {
  generated: 'Generated',
  edited: 'Edited',
  regenerated: 'Regenerated',
  translated: 'Translated',
  converted: 'Converted',
  'media-added': 'Media added',
  uploaded: 'Uploaded',
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

interface DetailRowProps {
  label: string;
  value: string;
  timestamp?: boolean;
}

function DetailRow({ label, value, timestamp = false }: DetailRowProps) {
  return (
    <div className="provenance-details-row">
      <dt>{label}</dt>
      <dd>
        {timestamp ? <time dateTime={value}>{formatTimestamp(value)}</time> : value}
      </dd>
    </div>
  );
}

export interface ProvenanceDetailsProps {
  record: ProvenanceRecord;
  className?: string;
}

export function ProvenanceDetails({ record, className = '' }: ProvenanceDetailsProps) {
  const presentationStatus = getProvenancePresentationStatus(record);
  const recordedStatement = record.userId
    ? 'SEIHouse recorded this asset for this user.'
    : 'SEIHouse recorded this asset.';

  return (
    <section
      className={`provenance-details ${className}`.trim()}
      aria-label={`Provenance details for ${CONTENT_TYPE_LABELS[record.contentType]}`}
    >
      <div className="provenance-details-heading">
        <span className="provenance-details-mark" data-sen-asset="provenance" aria-hidden="true"><span>Ⓢ</span></span>
        <div>
          <h3>SEIHouse Provenance</h3>
          <p>
            {presentationStatus === 'recorded'
              ? recordedStatement
              : 'Development sample only. This mock does not assert a SEIHouse recording.'}
          </p>
        </div>
      </div>

      <dl className="provenance-details-list">
        <DetailRow label="Content type" value={CONTENT_TYPE_LABELS[record.contentType]} />
        <DetailRow label="Actor" value={ACTOR_LABELS[record.actor]} />
        <DetailRow label="Action" value={ACTION_LABELS[record.action]} />
        <DetailRow label="Version" value={record.versionId} />
        <DetailRow label="Recorded" value={record.recordedAt} timestamp />
        {record.generatedAt && <DetailRow label="Generated" value={record.generatedAt} timestamp />}
        <DetailRow label="Provenance ID" value={record.provenanceId} />
        {record.generator && <DetailRow label="Generator" value={record.generator} />}
        {record.model && <DetailRow label="Model" value={record.model} />}
      </dl>

      <div className="provenance-details-status">
        <span aria-hidden="true" />
        {STATUS_LABELS[presentationStatus]}
      </div>
      <p className="provenance-details-caveat">
        {presentationStatus === 'mock'
          ? 'Sample data only. No authoritative recording or verification is connected.'
          : 'Cryptographic verification is not connected.'}
      </p>
    </section>
  );
}
