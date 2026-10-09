import { ProvenanceBadge, createProvenanceRecord, type ProvenanceRecord } from '../components/provenance';
import './provenance-tab.css';

type ProvenanceExample = {
  title: string;
  eyebrow: string;
  preview: string;
  record: ProvenanceRecord;
};

const PROVENANCE_EXAMPLES: readonly ProvenanceExample[] = [
  {
    title: 'The Ninth Peak Opens',
    eyebrow: 'Generated chapter',
    preview: 'The warding script loosened one silver stroke at a time, admitting dawn into the sealed hall.',
    record: createProvenanceRecord({
      provenanceId: 'prov_chapter_009',
      contentType: 'chapter',
      userId: 'user_mock_1042',
      assetId: 'chapter_mock_009',
      versionId: 'chapter_v1',
      actor: 'ai',
      action: 'generated',
      generator: 'SEIHouse Chapter Generation',
      model: 'Gemini mock fixture',
      generatedAt: '2026-09-11T12:38:00.000Z',
      recordedAt: '2026-09-11T12:42:04.000Z',
    }),
  },
  {
    title: 'La Porte des Étoiles',
    eyebrow: 'Generated translation',
    preview: 'French adaptation of a source passage, preserving its names and established world terms.',
    record: createProvenanceRecord({
      provenanceId: 'prov_translation_fr_014',
      contentType: 'translation',
      userId: 'user_mock_1042',
      assetId: 'translation_mock_fr_014',
      versionId: 'translation_v1',
      parentVersions: [{ assetId: 'chapter_mock_009', versionId: 'chapter_v1' }],
      actor: 'ai',
      action: 'translated',
      generator: 'SEIHouse Translation',
      model: 'Translation model mock',
      generatedAt: '2026-09-11T12:44:19.000Z',
      recordedAt: '2026-09-11T12:48:21.000Z',
    }),
  },
  {
    title: 'Compass of Returning Stars',
    eyebrow: 'Generated cover',
    preview: 'Celestial cover study · portrait crop · indigo and gold',
    record: createProvenanceRecord({
      provenanceId: 'prov_cover_022',
      contentType: 'cover',
      userId: 'user_mock_1042',
      assetId: 'cover_mock_022',
      versionId: 'cover_v1',
      contentHash: 'mock-only:fingerprint-placeholder-022',
      parentVersions: [{ assetId: 'story_mock_003', versionId: 'story_v1' }],
      actor: 'ai',
      action: 'generated',
      generator: 'SEIHouse Image Generation',
      model: 'Image model mock',
      generatedAt: '2026-09-11T13:02:10.000Z',
      recordedAt: '2026-09-11T13:06:16.000Z',
    }),
  },
  {
    title: 'Rain Above the Lantern Court',
    eyebrow: 'Generated audio',
    preview: 'SEA atmosphere · rain, distant bells, low courtyard wind',
    record: createProvenanceRecord({
      provenanceId: 'prov_audio_031',
      contentType: 'audio',
      userId: 'user_mock_2208',
      assetId: 'audio_mock_031',
      versionId: 'audio_v1',
      actor: 'ai',
      action: 'generated',
      generator: 'SEA',
      recordedAt: '2026-09-11T13:16:42.000Z',
    }),
  },
  {
    title: 'The Archivist Speaks',
    eyebrow: 'Generated narration',
    preview: 'Narrated excerpt · 01:18 · calm archival voice',
    record: createProvenanceRecord({
      provenanceId: 'prov_narration_018',
      contentType: 'narration',
      userId: 'user_mock_2208',
      assetId: 'narration_mock_018',
      versionId: 'narration_v1',
      parentVersions: [{ assetId: 'chapter_mock_009', versionId: 'chapter_v1' }],
      actor: 'ai',
      action: 'generated',
      generator: 'SEIHouse Narration',
      model: 'Voice model mock',
      generatedAt: '2026-09-11T13:21:05.000Z',
      recordedAt: '2026-09-11T13:25:11.000Z',
    }),
  },
  {
    title: 'Skybridge Motion Study',
    eyebrow: 'Generated video',
    preview: 'Concept clip · 00:12 · generator information unavailable',
    record: createProvenanceRecord({
      provenanceId: 'prov_video_006',
      contentType: 'video',
      assetId: 'video_mock_006',
      versionId: 'video_v1',
      actor: 'ai',
      action: 'generated',
      recordedAt: '2026-09-11T13:34:58.000Z',
    }),
  },
];

const EDITED_CHAPTER_RECORD = createProvenanceRecord({
  provenanceId: 'prov_chapter_009_v2',
  contentType: 'chapter',
  userId: 'user_mock_1042',
  assetId: 'chapter_mock_009',
  versionId: 'chapter_v2',
  parentVersions: [{ assetId: 'chapter_mock_009', versionId: 'chapter_v1' }],
  actor: 'user',
  action: 'edited',
  recordedAt: '2026-09-11T12:52:04.000Z',
});

const MOCK_RECORDS = [
  ...PROVENANCE_EXAMPLES.slice(0, 3).map(example => ({ title: example.eyebrow, record: example.record })),
  { title: 'User-edited chapter revision', record: EDITED_CHAPTER_RECORD },
];

const SUPPORTED_TYPES = [
  'Text',
  'Chapters',
  'Stories',
  'Translations',
  'Images',
  'Covers',
  'Audio',
  'Narration',
  'Video',
  'Other generated assets',
] as const;

const FLOW = [
  { title: 'AI Generation', note: 'Edits, conversions, and imports also create version events' },
  { title: 'Provenance Record', note: 'Version, actor/action, source, time, and trust state' },
  { title: 'Ⓢ Badge', note: 'Subtle asset-level disclosure' },
  { title: 'Provenance Details', note: 'Recorded time, identity, and available context' },
  { title: 'Future Backend Verification', note: 'Future · Not connected', future: true },
] as const;

const CONNECTIONS = [
  { title: 'SEN', note: 'Text · Chapters · Stories' },
  { title: 'SEA', note: 'Audio · Generated sound' },
  { title: 'Images', note: 'Images · Covers' },
  { title: 'Narration', note: 'Voice · Spoken editions' },
  { title: 'Translations', note: 'Language adaptations' },
  { title: 'Video + Other', note: 'Future generated assets' },
] as const;

const FUTURE_EVIDENCE = [
  { title: 'User record', status: 'Future' },
  { title: 'Asset + version record', status: 'Future · Not connected' },
  { title: 'Content fingerprint', status: 'Future · Not connected' },
  { title: 'Parent versions', status: 'Future · Not connected' },
] as const;

function ProvenanceExampleCard({ example, index }: { example: ProvenanceExample; index: number }) {
  return (
    <article className={`provenance-example provenance-example-${example.record.contentType}`}>
      <div className="provenance-example-art" aria-hidden="true">
        <span>{index + 1}</span>
        <i />
        <i />
        <i />
      </div>
      <div className="provenance-example-copy">
        <p>{example.eyebrow}</p>
        <h2>{example.title}</h2>
        <span>{example.preview}</span>
      </div>
      <ProvenanceBadge record={example.record} />
    </article>
  );
}

export function ProvenanceTab() {
  return (
    <div className="provenance-tab">
      <aside className="provenance-boundary" aria-label="Current provenance boundary">
        <span>Development-only skeleton</span>
        <p>
          Local records and UI only. No Firestore, Postgres, R2, APIs, hashing, public verification,
          C2PA, blockchain, or production integration is connected.
        </p>
      </aside>

      <section className="provenance-section" aria-labelledby="provenance-examples-title">
        <div className="provenance-section-heading">
          <p>Visible mark</p>
          <h2 id="provenance-examples-title">One quiet signal, across every generated medium</h2>
          <span>Select any Ⓢ mark to inspect the local provenance record.</span>
        </div>
        <div className="provenance-example-grid">
          {PROVENANCE_EXAMPLES.map((example, index) => (
            <ProvenanceExampleCard key={example.record.provenanceId} example={example} index={index} />
          ))}
        </div>
        <div className="provenance-type-list" aria-label="Supported provenance content types">
          {SUPPORTED_TYPES.map(type => <span key={type}>{type}</span>)}
        </div>
      </section>

      <section className="provenance-section" aria-labelledby="provenance-flow-title">
        <div className="provenance-section-heading">
          <p>System map</p>
          <h2 id="provenance-flow-title">From generation to future verification</h2>
        </div>
        <ol className="provenance-flow" aria-label="Intended provenance flow">
          {FLOW.map((step, index) => (
            <li className={'future' in step && step.future ? 'provenance-flow-future' : ''} key={step.title}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{step.title}</strong>
              <small>{step.note}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className="provenance-section" aria-labelledby="provenance-connections-title">
        <div className="provenance-section-heading">
          <p>Connection map</p>
          <h2 id="provenance-connections-title">One record contract for every SEIHouse generator</h2>
        </div>
        <div className="provenance-connection-map">
          <ul aria-label="Future provenance source connections">
            {CONNECTIONS.map(connection => (
              <li key={connection.title}>
                <strong>{connection.title}</strong>
                <span>{connection.note}</span>
                <small>Future adapter</small>
              </li>
            ))}
          </ul>
          <div className="provenance-hub" aria-label="Shared provenance record contract">
            <span data-sen-asset="provenance" aria-hidden="true">Ⓢ</span>
            <strong>Provenance Record</strong>
            <small>Source-agnostic contract</small>
          </div>
        </div>

        <div className="provenance-evidence" aria-labelledby="provenance-evidence-title">
          <div>
            <p>Future evidence layer</p>
            <h3 id="provenance-evidence-title">User protection and dispute evidence</h3>
            <span>Contract fields are reserved now; every connection below remains non-functional.</span>
          </div>
          <ul>
            {FUTURE_EVIDENCE.map(item => (
              <li key={item.title}>
                <span>{item.title}</span>
                <strong>{item.status}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="provenance-section provenance-records" aria-labelledby="provenance-records-title">
        <div className="provenance-section-heading">
          <p>Mock records</p>
          <h2 id="provenance-records-title">The contract, visible and inspectable</h2>
          <span>All statuses are mock. The fingerprint below was not calculated from an asset.</span>
        </div>
        <div className="provenance-record-grid">
          {MOCK_RECORDS.map(({ title, record }) => (
            <article key={record.provenanceId}>
              <div>
                <span>{title}</span>
                <ProvenanceBadge record={record} />
              </div>
              <pre>{JSON.stringify(record, null, 2)}</pre>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
