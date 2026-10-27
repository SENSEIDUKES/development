import { Bookmark, Check } from 'lucide-react';

/**
 * Save Draft on a phone: one square button beside the story card, so the
 * page's action row no longer takes a line above the questions. It calls the
 * same save as the action row, and announces the save the way the row did.
 */
export function SeedSaveButton({ saved, disabled, onSave }: {
  saved: boolean;
  disabled?: boolean;
  onSave: () => void;
}) {
  const Icon = saved ? Check : Bookmark;
  return (
    <>
      <button type="button" className="seed-creator-save" data-saved={saved} disabled={disabled}
        aria-label={saved ? 'Saved' : 'Save Draft'} title={saved ? 'Saved' : 'Save Draft'} onClick={onSave}>
        <Icon size={18} aria-hidden="true" />
      </button>
      <span role="status" className="sr-only">{saved ? 'Draft saved' : ''}</span>
    </>
  );
}
