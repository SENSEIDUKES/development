import { useRef, useState, type ReactNode, type RefObject } from 'react';
import { WorkspaceSheet } from './WorkspaceSheet';
import { LIBRARY_LEGAL_DOCUMENTS, type LibraryLegalDocument } from './libraryLegal';
import type { LibraryFooterAction } from './LibraryFooter';
import './library-footer.css';

/** Reads one legal document in the Library's standard sheet. */
export function LibraryLegalSheet({ document, onClose, returnFocusRef }: {
  document: LibraryLegalDocument | null;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  return <WorkspaceSheet open={document !== null} onOpenChange={open => { if (!open) onClose(); }}
    title={document?.title ?? ''} closeLabel={`Close ${document?.title ?? 'document'}`} returnFocusRef={returnFocusRef}>
    {document && <article className="library-legal-document" data-legal-document={document.id} data-legal-status={document.status}>
      {document.status === 'placeholder' && <p className="library-legal-draft" role="note">
        Draft placeholder. This is not SEIHouse Productions LLC&apos;s published {document.title}; the final text will replace it before launch.
      </p>}
      {document.sections.map(section => <section key={section.heading}>
        <h3>{section.heading}</h3>
        <p>{section.body}</p>
      </section>)}
    </article>}
  </WorkspaceSheet>;
}

/**
 * The footer's Terms, Privacy and Cookies for a host without hosted pages of
 * its own: each opens the Library's own document (`LIBRARY_LEGAL_DOCUMENTS`)
 * in `LibraryLegalSheet`, and focus returns to the link that opened it. Pass
 * `legal` to `LibraryFooter` and render `sheet` beside it.
 */
export function useLibraryLegalDocuments(): { legal: readonly LibraryFooterAction[]; sheet: ReactNode } {
  const [open, setOpen] = useState<LibraryLegalDocument | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const legal = LIBRARY_LEGAL_DOCUMENTS.map(document => ({ id: document.id, label: document.label, onSelect: () => {
    openerRef.current = globalThis.document?.activeElement instanceof HTMLElement ? globalThis.document.activeElement : null;
    setOpen(document);
  } }));
  return { legal, sheet: <LibraryLegalSheet document={open} onClose={() => setOpen(null)} returnFocusRef={openerRef} /> };
}
