import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { SoundCueAttachment } from '../../../audio/inlineAudio';
import { SOUND_CUE_RULES } from '../../../audio/soundCueRules';
import { useNarrativeAudio } from '../../../audio/playback';
import { isMediaResourceProvenance, type MediaCatalog } from '../../../audio/media';
import { isPublicHttpsMediaUrl } from '../../../audio/mediaUrl';
import { AUDIO_CUE_CATEGORIES, type AudioCue } from '../../../audio/cues';
import { createManualSoundCue } from '../shared/manualCue';
import type { PassageSelection, TextHighlightBlock } from '../shared/selection';
import './manual-cue-picker.css';

export interface ManualCuePickerProps {
  block: TextHighlightBlock;
  selection: PassageSelection;
  catalog: MediaCatalog;
  existing?: SoundCueAttachment;
  occupiedSelections?: readonly PassageSelection[];
  onPlace: (cue: SoundCueAttachment, selection: PassageSelection) => void;
  onRemove: (selection: PassageSelection) => void;
  onClose: () => void;
}

/** A recording's sound word, then its category (the Studio parent tag) and child tags: "blade drawn · weapons · high". */
const cueLabel = (cue: AudioCue) => {
  const tags = cue.metadata.studio_tags;
  return [cue.metadata.sound, cue.category, tags?.tone, tags?.energy, tags?.tension]
    .filter(Boolean).join(' · ') || cue.metadata.broad_variation;
};

/** The host supplies its approved catalog. Preview and placed glyph share one audio owner. */
export function ManualCuePicker({ block, selection, catalog, existing, occupiedSelections = [], onPlace, onRemove, onClose }: ManualCuePickerProps) {
  const playback = useNarrativeAudio();
  const playbackRef = useRef(playback);
  const previewTrackRef = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const categoryId = useId();
  const searchId = useId();
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  // Only recordings with a sound word can be a Sound Cue; any cue category (the Studio parent tag) may hold one.
  const cues = useMemo(() => catalog.soundCues.cues.filter(cue =>
    Boolean(cue.metadata.sound)
    && isPublicHttpsMediaUrl(cue.public_url)
    && isMediaResourceProvenance(catalog.soundCueProvenanceByUrl.get(cue.public_url))), [catalog]);
  const categories = useMemo(() => AUDIO_CUE_CATEGORIES.filter(value =>
    cues.some(cue => cue.category === value)), [cues]);
  const results = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return cues.flatMap((cue, index) => {
      if (category !== 'all' && cue.category !== category) return [];
      const searchable = [cue.metadata.description, cue.category, cue.metadata.broad_variation,
        cue.metadata.sound ?? '', ...cue.metadata.soft_tags].join(' ').toLowerCase();
      return needle && !searchable.includes(needle) ? [] : [{ cue, number: index + 1 }];
    });
  }, [cues, category, search]);

  useEffect(() => { playbackRef.current = playback; }, [playback]);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
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
    const result = createManualSoundCue(block, selection, cue, catalog, occupiedSelections);
    if (!result.ok) {
      setError(result.reason === 'overlapping-placement'
        ? 'This passage overlaps an existing cue. Select a separate passage.'
        : result.reason === 'partial-word'
          ? 'A Sound Cue sits on whole words. Select the whole word.'
          : result.reason === 'too-many-words'
            ? `Sound Cues fit 1–${SOUND_CUE_RULES.maxWords} words. Select the action itself.`
            : 'This selection or cue is no longer available. Select the passage again.');
      return;
    }
    onPlace(result.cue, selection);
    onClose();
  };
  return <div className="sen-manual-cue-picker" aria-label="Choose Sound Cue">
    <h3 ref={headingRef} tabIndex={-1} className="sen-manual-cue-picker__heading">Sound Cue for “{selection.selectedText}”</h3>
    {existing && <button type="button" onClick={() => { onRemove(selection); onClose(); }}>Remove cue</button>}
    {error && <p role="alert">{error}</p>}
    {playback.hasError && previewTrackRef.current === playback.currentTrackId && <p role="alert">Audio preview is unavailable.</p>}
    <div className="sen-manual-cue-picker__filters">
      <div><label htmlFor={categoryId}>Category</label>
        <select id={categoryId} value={category} onChange={event => setCategory(event.target.value)}>
          <option value="all">All categories ({cues.length})</option>
          {categories.map(value => <option key={value} value={value}>
            {value[0].toUpperCase() + value.slice(1)} ({cues.filter(cue => cue.category === value).length})
          </option>)}
        </select>
      </div>
      <div><label htmlFor={searchId}>Search cues</label>
        <input id={searchId} type="search" value={search} onChange={event => setSearch(event.target.value)}
          placeholder="Description, sound word, tag" />
      </div>
    </div>
    <p className="sen-manual-cue-picker__count" role="status">Showing {results.length} of {cues.length} cues</p>
    <div className="sen-manual-cue-picker__list">
      {results.map(({ cue, number }) => <div key={cue.public_url} className="sen-manual-cue-picker__item">
        <div className="sen-manual-cue-picker__label">
          <span className="sen-manual-cue-picker__number">#{String(number).padStart(Math.max(3, String(cues.length).length), '0')}</span>
          <div><strong>{cue.metadata.description}</strong><small>{cueLabel(cue)}</small></div>
        </div>
        <div className="sen-manual-cue-picker__buttons">
          <button type="button" onClick={() => preview(cue)}>Preview</button>
          <button type="button" onClick={() => place(cue)}>{existing ? 'Replace' : 'Select'}</button>
        </div>
      </div>)}
      {results.length === 0 && <p className="sen-manual-cue-picker__empty">
        {cues.length === 0 ? 'No Sound Cues are available in this catalog.' : 'No Sound Cues match these filters.'}
      </p>}
    </div>
  </div>;
}
