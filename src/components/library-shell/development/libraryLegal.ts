/**
 * Placeholder legal documents for the footer's Terms, Privacy and Cookies row.
 *
 * SEIHouse has not published these yet. Each document carries the outline a
 * real one will need and says plainly, at the top, that it is a draft. Replace
 * a document's `sections` with the approved text and set `status: 'published'`
 * when it is written; a host with hosted pages can instead pass its own `legal`
 * destinations to `MainLibraryFooter`.
 */
export type LibraryLegalDocumentId = 'terms' | 'privacy' | 'cookies';
export interface LibraryLegalDocument {
  id: LibraryLegalDocumentId;
  /** Footer link text. */
  label: string;
  title: string;
  status: 'placeholder' | 'published';
  sections: readonly { heading: string; body: string }[];
}

const DRAFT = 'Placeholder. The approved wording for this section will be written before launch.';

export const LIBRARY_LEGAL_DOCUMENTS: readonly LibraryLegalDocument[] = [
  { id: 'terms', label: 'Terms', title: 'Terms of Service', status: 'placeholder', sections: [
    { heading: 'Who we are', body: 'The Celestial Library is operated by SEIHouse Productions LLC. ' + DRAFT },
    { heading: 'Your account', body: DRAFT },
    { heading: 'Stories you create', body: DRAFT },
    { heading: 'Energy, Relics and purchases', body: DRAFT },
    { heading: 'Community conduct', body: DRAFT },
    { heading: 'Ending your account', body: DRAFT },
    { heading: 'Changes and contact', body: DRAFT },
  ] },
  { id: 'privacy', label: 'Privacy', title: 'Privacy Policy', status: 'placeholder', sections: [
    { heading: 'What we collect', body: DRAFT },
    { heading: 'How we use it', body: DRAFT },
    { heading: 'Story generation and AI services', body: DRAFT },
    { heading: 'Who we share it with', body: DRAFT },
    { heading: 'Your choices and rights', body: DRAFT },
    { heading: 'Keeping and deleting data', body: DRAFT },
    { heading: 'Contact', body: DRAFT },
  ] },
  { id: 'cookies', label: 'Cookies', title: 'Cookie Policy', status: 'placeholder', sections: [
    { heading: 'What cookies and local storage we use', body: DRAFT },
    { heading: 'Why we use them', body: DRAFT },
    { heading: 'Managing your preferences', body: DRAFT },
  ] },
];
