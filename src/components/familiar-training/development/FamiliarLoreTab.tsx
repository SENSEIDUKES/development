import { useEffect, useId, useRef, useState } from 'react';
import { MotionPicture } from '@seihouse/sen/motion-picture';
import { familiarRarityLabel, FAMILIAR_BACKSTORY_MAX_LENGTH, type FamiliarOption } from '../../familiar/shared/familiar';
import { FAMILIAR_ELEMENT_LABELS, type FamiliarElement } from '../../../library/familiars/contracts';

export interface FamiliarLoreTabProps {
  option: FamiliarOption;
  /** The name the cultivator knows it by: their own, or the catalogue's. */
  name: string;
  element?: FamiliarElement | null;
  /** The cultivator's own backstory, when they wrote one. */
  backstory?: string;
  /** Saves a rewritten backstory; null returns to SEIHouse's own. Omit where it cannot be personalized. */
  onBackstoryChange?: (backstory: string | null) => void;
  /** Opens the editor at once (from the settings menu's Story row). */
  editRequest?: number;
  /** Called once a request has opened the editor, so returning to this tab does not reopen it. */
  onEditRequestHandled?: () => void;
}

/**
 * The Lore tab: the Familiar's own motion clip, who it is, and its story.
 * SEIHouse supplies a one-line description; the cultivator may rewrite it as
 * their own, and can always return to the original.
 */
export function FamiliarLoreTab({ option, name, element, backstory, onBackstoryChange, editRequest, onEditRequestHandled }: FamiliarLoreTabProps) {
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const story = backstory ?? option.description;
  const startEditing = () => { setDraft(story); setEditing(true); };
  useEffect(() => {
    if (editRequest && onBackstoryChange) {
      startEditing();
      onEditRequestHandled?.();
    }
    // Only a new request opens the editor; the story itself changing must not.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editRequest]);
  // Swiping to another Familiar closes an open editor; opening the tab does not.
  const shownId = useRef(option.id);
  useEffect(() => {
    if (shownId.current !== option.id) setEditing(false);
    shownId.current = option.id;
  }, [option.id]);
  const save = () => {
    const next = draft.trim();
    onBackstoryChange?.(next && next !== option.description ? next : null);
    setEditing(false);
  };

  return (
    <div className="space-y-4" data-familiar-lore={option.id}>
      <MotionPicture className="familiar-lore-picture" stillUrl={option.portraitUrl ?? option.stillUrl} videoUrl={option.videoUrl} alt={`${name}, ${option.name} Familiar`}
        stillFallback={option.portraitUrl ? <img src={option.stillUrl} alt="" className="motion-picture-still" /> : undefined} />
      {!option.videoUrl ? <p className="familiar-stage-fineprint" data-familiar-lore-video="none">{name}’s video is still being made.</p> : null}
      <dl className="familiar-lore-facts">
        <div><dt>Rarity</dt><dd>{familiarRarityLabel(option.rarity)}</dd></div>
        {element ? <div><dt>Element</dt><dd>{FAMILIAR_ELEMENT_LABELS[element]}</dd></div> : null}
        {name !== option.name ? <div><dt>Kind</dt><dd>{option.name}</dd></div> : null}
      </dl>
      <section aria-labelledby={`${fieldId}-heading`}>
        <div className="flex items-baseline justify-between gap-2">
          <h4 id={`${fieldId}-heading`} className="familiar-stage-heading">{backstory ? 'Your story' : 'Story'}</h4>
          {onBackstoryChange && !editing ? (
            <button type="button" className="familiar-stage-link" onClick={startEditing} data-familiar-backstory-edit>Rewrite</button>
          ) : null}
        </div>
        {editing ? (
          <div className="mt-2 space-y-2">
            <label htmlFor={fieldId} className="sr-only">{name}’s story</label>
            <textarea id={fieldId} className="familiar-stage-textarea" rows={5} maxLength={FAMILIAR_BACKSTORY_MAX_LENGTH} value={draft}
              autoFocus onChange={event => setDraft(event.target.value)} data-familiar-backstory-field />
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className="familiar-training-chip is-selected" onClick={save}>Save story</button>
              <button type="button" className="familiar-training-chip" onClick={() => setEditing(false)}>Cancel</button>
              {backstory ? (
                <button type="button" className="familiar-training-chip" onClick={() => { onBackstoryChange?.(null); setEditing(false); }}>Reset to original</button>
              ) : null}
              <span className="ms-auto font-mono text-[11px] text-neutral-500">{draft.length} / {FAMILIAR_BACKSTORY_MAX_LENGTH}</span>
            </div>
          </div>
        ) : (
          <p className="familiar-lore-story" data-familiar-backstory={backstory ? 'own' : 'original'}>{story}</p>
        )}
      </section>
    </div>
  );
}
