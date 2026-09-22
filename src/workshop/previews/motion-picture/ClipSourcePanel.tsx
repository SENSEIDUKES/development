import { useId, useState } from 'react';

export interface ClipSourcePanelProps {
  /** Set while every surface is being forced onto one clip instead of its own. */
  overrideUrl?: string;
  onOverrideUrlChange: (overrideUrl: string | undefined) => void;
}

/**
 * Try a clip against every surface without a rebuild.
 *
 * A stand-in for the video import system: it accepts a direct URL now, so the
 * component can be tested against real footage, and marks where uploading,
 * storing, and addressing a clip per item will eventually attach. Clearing it
 * hands every item back its own clip.
 */
export function ClipSourcePanel({ overrideUrl, onOverrideUrlChange }: ClipSourcePanelProps) {
  const inputId = useId();
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState<string>();
  const trimmed = draft.trim();

  const apply = () => {
    if (!trimmed) {
      setNote('Paste a clip URL first.');
      return;
    }
    // A direct media URL is all the component needs; a page URL will not play.
    if (!/^(https?:|blob:|data:|\/)/i.test(trimmed)) {
      setNote('Use a direct https:// link to the video file, or a path served by this preview.');
      return;
    }
    setNote(undefined);
    onOverrideUrlChange(trimmed);
  };

  return <form className="clip-source-panel" onSubmit={event => { event.preventDefault(); apply(); }}>
    <div className="clip-source-panel-heading">
      <label htmlFor={inputId}>Clip source</label>
      <p>
        Each item below plays its own clip. Paste a direct link to a video file to try one
        across all of them; uploading and storing a clip per item is the import system this
        stands in for.
      </p>
    </div>
    <div className="clip-source-panel-row">
      <input
        id={inputId}
        type="url"
        inputMode="url"
        spellCheck={false}
        placeholder="https://…/clip.mp4"
        value={draft}
        onChange={event => setDraft(event.target.value)}
      />
      <button type="submit" disabled={!trimmed || trimmed === overrideUrl}>Apply to all</button>
      <button type="button" disabled={!overrideUrl}
        onClick={() => { setDraft(''); setNote(undefined); onOverrideUrlChange(undefined); }}>
        Reset
      </button>
    </div>
    <p className="clip-source-panel-note" role="status">
      {note ?? (overrideUrl ? `Every item is playing: ${overrideUrl}` : 'Every item is playing its own clip.')}
    </p>
    <p className="clip-source-panel-hint">
      A clip the host serves without cross-origin headers still plays; only the sampled aura
      falls back to its default colour.
    </p>
  </form>;
}
