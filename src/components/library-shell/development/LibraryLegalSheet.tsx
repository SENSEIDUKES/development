import type { RefObject } from 'react';
import { WorkspaceSheet } from './WorkspaceSheet';
import type { LibraryLegalDocument } from './libraryLegal';
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
