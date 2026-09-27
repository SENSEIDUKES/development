import { useMemo, useState, type CSSProperties } from 'react';
import { createMediaCatalog, type ResolvedAudioMoment } from '@seihouse/sen/audio';
import { InlineAudioText } from '@seihouse/sen/reader-chamber';
import { TextHighlightEngine, ManualCuePicker, createManualCueMoment, type PassageAction, type PassageEdit, type PassageSelection, type TextHighlightBlock } from '@seihouse/sen/text-highlight-engine';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';
import { LIBRARY_BASE_MEDIA } from '../../../host/media/libraryCatalog';
import { previewBlocks } from './previewData';

const catalog = createMediaCatalog(LIBRARY_BASE_MEDIA);
interface LocalCuePlacement extends PassageSelection { cueUrl: string }

export function TextHighlightEnginePreview() {
  const [blocks, setBlocks] = useState<readonly TextHighlightBlock[]>(previewBlocks);
  const [placements, setPlacements] = useState<LocalCuePlacement[]>([]);
  const [highlightColor, setHighlightColor] = useState('#f2cf66');
  const moments = useMemo(() => placements.flatMap(placement => {
    const block = blocks.find(item => item.id === placement.blockId);
    const cue = catalog.soundCues.byUrl.get(placement.cueUrl);
    if (!block || !cue) return [];
    const result = createManualCueMoment(block, placement, cue, catalog);
    return result.ok ? [result.moment] : [];
  }), [blocks, placements]);

  const updateBlocks = (next: TextHighlightBlock[], edit: PassageEdit) => {
    const difference = edit.after.text.length - edit.before.text.length;
    setPlacements(previous => previous.flatMap(placement => {
      if (placement.blockId !== edit.before.id) return [placement];
      if (edit.selection.endOffset <= placement.startOffset) return [{ ...placement,
        startOffset: placement.startOffset + difference, endOffset: placement.endOffset + difference }];
      if (edit.selection.startOffset >= placement.endOffset) return [placement];
      return [];
    }));
    setBlocks(next);
  };
  const sameAnchor = (left: PassageSelection, right: PassageSelection) => left.blockId === right.blockId
    && left.startOffset === right.startOffset && left.endOffset === right.endOffset && left.selectedText === right.selectedText;
  const actions: PassageAction[] = [{ id: 'media', label: 'Media', children: [{ id: 'audio', label: 'Audio', children: [{
    id: 'cue', label: 'Cue', onActivate: (selection, close) => {
      const block = blocks.find(item => item.id === selection.blockId);
      if (!block) return null;
      const existing = placements.find(placement => sameAnchor(placement, selection));
      const existingCue = existing && catalog.soundCues.byUrl.get(existing.cueUrl);
      const existingResolution = existing && existingCue ? createManualCueMoment(block, existing, existingCue, catalog) : null;
      return <ManualCuePicker block={block} selection={selection} catalog={catalog}
        existing={existingResolution?.ok ? existingResolution.moment : undefined}
        occupiedSelections={placements.filter(placement => !sameAnchor(placement, selection))}
        onPlace={(moment: ResolvedAudioMoment, selected) => setPlacements(previous => [
          ...previous.filter(placement => !sameAnchor(placement, selected)),
          { ...selected, cueUrl: moment.cue.publicUrl },
        ])}
        onRemove={selected => setPlacements(previous => previous.filter(placement => !sameAnchor(placement, selected)))}
        onClose={close} />;
    },
  }] }] }];
  return <section className="mx-auto max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
      <p>Highlight a passage, then choose Edit or Media.</p>
      <label data-sen-selection-preserve className="flex items-center gap-2">Highlight color
        <input type="color" value={highlightColor} onChange={event => setHighlightColor(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-slate-600 bg-transparent p-0.5" />
      </label>
    </div>
    <div className="text-lg text-slate-200" style={{ fontFamily: 'Georgia, serif' }}>
      <TextHighlightEngine blocks={blocks} onBlocksChange={updateBlocks} actions={actions}
        style={{ '--sen-passage-highlight': `${highlightColor}59` } as CSSProperties}
        renderBlockText={block => {
          const blockMoments = moments.filter(moment => moment.blockId === block.id);
          return blockMoments.length > 0
            ? <InlineAudioText text={block.text} moments={blockMoments} renderText={text => text} />
            : block.text;
        }} />
    </div>
  </section>;
}

export function TextHighlightEngineWorkspace() {
  return <FeatureWorkspace entry={workshopEntries.find(entry => entry.id === 'text-highlight-engine')!}
    allowCompare={false} renderDevelopment={() => <TextHighlightEnginePreview />}
    renderReference={() => <p className="p-8 text-sm text-slate-400">New SEN primitive developed here. No production reference exists.</p>} />;
}
