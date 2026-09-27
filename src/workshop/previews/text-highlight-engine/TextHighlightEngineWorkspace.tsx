import { useState } from 'react';
import { TextHighlightEngine, type TextHighlightBlock } from '@seihouse/sen/text-highlight-engine';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { previewBlocks } from './previewData';

function Preview() {
  const [blocks, setBlocks] = useState<readonly TextHighlightBlock[]>(previewBlocks);
  return <section className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
    <p className="mb-8 text-sm text-slate-400">Highlight a passage, then choose Edit.</p>
    <div className="text-lg text-slate-200" style={{ fontFamily: 'Georgia, serif' }}>
      <TextHighlightEngine blocks={blocks} onBlocksChange={setBlocks} />
    </div>
  </section>;
}

export function TextHighlightEngineWorkspace() {
  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'text-highlight-engine')!}
    allowCompare={false} renderDevelopment={() => <Preview />}
    renderReference={() => <p className="p-8 text-sm text-slate-400">New SEN primitive developed here. No production reference exists.</p>} />;
}
