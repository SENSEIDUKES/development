import { useEffect, useMemo, useRef, useState } from 'react';
import { INLINE_AUDIO_CUE_CATEGORIES, type ResolvedAudioMoment } from '../../../audio/inlineAudio';
import { useNarrativeAudio } from '../../../audio/playback';
import { isMediaResourceProvenance, type MediaCatalog } from '../../../audio/media';
import { isPublicHttpsMediaUrl } from '../../../audio/mediaUrl';
import type { AudioCue } from '../../../audio/cues';
import { createManualCueMoment } from '../shared/manualCue';
import type { PassageSelection, TextHighlightBlock } from '../shared/selection';
import './manual-cue-picker.css';

export interface ManualCuePickerProps {
  block: TextHighlightBlock;
  selection: PassageSelection;
  catalog: MediaCatalog;
  existing?: ResolvedAudioMoment;
  occupiedSelections?: readonly PassageSelection[];
  onPlace: (moment: ResolvedAudioMoment, selection: PassageSelection) => void;
  onRemove: (selection: PassageSelection) => void;
  onClose: () => void;
}

/** The host supplies its approved catalog. Preview and placed glyph share one audio owner. */
export function ManualCuePicker({ block, selection, catalog, existing, occupiedSelections = [], onPlace, onRemove, onClose }: ManualCuePickerProps) {
  const playback = useNarrativeAudio();
  const playbackRef = useRef(playback);
  const previewTrackRef = useRef<string | null>(null);
  const firstPreviewRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const cues = useMemo(() => catalog.soundCues.cues.filter(cue =>
    INLINE_AUDIO_CUE_CATEGORIES.includes(cue.category as typeof INLINE_AUDIO_CUE_CATEGORIES[number])
    && isPublicHttpsMediaUrl(cue.public_url)
    && isMediaResourceProvenance(catalog.soundCueProvenanceByUrl.get(cue.public_url))), [catalog]);

  useEffect(() => { playbackRef.current = playback; }, [playback]);
  useEffect(() => {
    firstPreviewRef.current?.focus({ preventScroll: true });
    return () => { if (previewTrackRef.current) playbackRef.current.stop(previewTrackRef.current); };
  }, []);

  const preview = (cue: AudioCue) => {
    const trackId = `manual-cue-preview:${cue.public_url}`;
    if (playback.currentTrackId === trackId && playback.isPlaying) playback.stop(trackId);
    else playback.replace({ id: trackId, source: cue.public_url, title: cue.metadata.description, artist: 'Sound Cue preview' });
    previewTrackRef.current = trackId;
    setError(null);
  };
  const place = (cue: AudioCue) => {
    const result = createManualCueMoment(block, selection, cue, catalog, occupiedSelections);
    if (!result.ok) {
      setError(result.reason === 'unrepresentable-occurrence'
        ? 'This exact text position cannot be anchored. Select a different phrase.'
        : result.reason === 'overlapping-placement'
          ? 'This passage overlaps an existing cue. Select a separate passage.'
          : 'This selection or cue is no longer available. Select the passage again.');
      return;
    }
    onPlace(result.moment, selection);
    onClose();
  };
  return <div className="sen-manual-cue-picker" aria-label="Choose Sound Cue">
    <div className="sen-manual-cue-picker__heading">Sound Cue for “{selection.selectedText}”</div>
    {existing && <button type="button" onClick={() => { onRemove(selection); onClose(); }}>Remove cue</button>}
    {error && <p role="alert">{error}</p>}
    {playback.hasError && previewTrackRef.current === playback.currentTrackId && <p role="alert">Audio preview is unavailable.</p>}
    <div className="sen-manual-cue-picker__list">
      {cues.map((cue, index) => <div key={cue.public_url} className="sen-manual-cue-picker__item">
        <div><strong>{cue.metadata.description}</strong><small>{cue.category} · {cue.metadata.broad_variation}</small></div>
        <div className="sen-manual-cue-picker__buttons">
          <button type="button" ref={index === 0 ? firstPreviewRef : undefined} onClick={() => preview(cue)}>Preview</button>
          <button type="button" onClick={() => place(cue)}>{existing ? 'Replace' : 'Select'}</button>
        </div>
      </div>)}
      {cues.length === 0 && <p>No Sound Cues are available in this catalog.</p>}
    </div>
  </div>;
}
