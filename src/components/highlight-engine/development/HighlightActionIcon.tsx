/** Passage actions: compact, solid silhouettes with cutout details, matching the existing icon artwork. */
export function HighlightActionIcon({ name }: { name: 'edit' | 'copy' | 'media' | 'remove' | 'back' | 'audio' | 'cue' | 'soundscape' | 'atmosphere' | 'save' | 'undo' | 'delete' }) {
  return <svg className="sen-highlight-action-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    {name === 'edit' && <>
      <path d="m15.2 4.8 4 4-10 10-5 1 1-5 10-10Zm1.4-1.4 1-1a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8l-1 1-4-4Z" />
      <path d="M3 22a1 1 0 0 1 0-2h18a1 1 0 0 1 0 2H3Z" />
    </>}
    {name === 'copy' && <>
      <path d="M7 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h1V5a3 3 0 0 1 2-3Z" />
      <path fillRule="evenodd" d="M9 3a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H9Zm2 6a1 1 0 0 0 0 2h7a1 1 0 0 0 0-2h-7Zm0 5a1 1 0 0 0 0 2h5a1 1 0 0 0 0-2h-5Z" clipRule="evenodd" />
    </>}
    {name === 'media' && <>
      <path fillRule="evenodd" d="M3 5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9h-2v11H3V7h10V5H3Zm5 4.8v7.4c0 .6.6 1 1.1.7l6-3.7a.8.8 0 0 0 0-1.4l-6-3.7c-.5-.3-1.1.1-1.1.7Z" clipRule="evenodd" />
      <path d="m19 1 1.2 3.8L24 6l-3.8 1.2L19 11l-1.2-3.8L14 6l3.8-1.2L19 1Z" />
    </>}
    {name === 'remove' && <path fillRule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM7 11a1 1 0 0 0 0 2h10a1 1 0 0 0 0-2H7Z" clipRule="evenodd" />}
    {name === 'back' && <path d="M10.7 3.3a1 1 0 0 1 0 1.4L5.4 10H21a1 1 0 0 1 0 2H5.4l5.3 5.3a1 1 0 0 1-1.4 1.4l-7-7a1 1 0 0 1 0-1.4l7-7a1 1 0 0 1 1.4 0Z" />}
    {name === 'audio' && <>
      <path d="M12 2a10 10 0 0 0-10 10v6a3 3 0 0 0 3 3h2V11H4a8 8 0 0 1 16 0h-3v10h2a3 3 0 0 0 3-3v-6A10 10 0 0 0 12 2Z" />
    </>}
    {name === 'cue' && <>
      <rect x="2" y="9" width="3" height="6" rx="1.5" /><rect x="7" y="5" width="3" height="14" rx="1.5" />
      <rect x="12" y="2" width="3" height="20" rx="1.5" /><rect x="17" y="7" width="3" height="10" rx="1.5" />
      <rect x="22" y="10" width="2" height="4" rx="1" />
    </>}
    {name === 'soundscape' && <path d="M9 3a1 1 0 0 0-1 1v11.5A4 4 0 1 0 10 19V8l10-2v7.5A4 4 0 1 0 22 17V1L9 3Z" />}
    {name === 'atmosphere' && <>
      <path d="M6 14a4 4 0 0 1-.7-7.9 6 6 0 0 1 11.4-1A4.5 4.5 0 1 1 18.5 14H6Z" />
      <path d="M3 17a1 1 0 0 1 0-2h13a1 1 0 0 1 0 2H3Zm4 4a1 1 0 0 1 0-2h14a1 1 0 0 1 0 2H7Z" />
    </>}
    {name === 'save' && <path d="M20.7 5.3a1 1 0 0 1 0 1.4l-12 12a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 1.4-1.4L8 16.6 19.3 5.3a1 1 0 0 1 1.4 0Z" />}
    {name === 'undo' && <path d="M8.7 2.3a1 1 0 0 1 0 1.4L5.4 7H14a8 8 0 0 1 0 16h-3a1 1 0 0 1 0-2h3a6 6 0 0 0 0-12H5.4l3.3 3.3a1 1 0 0 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0Z" />}
    {name === 'delete' && <>
      <path d="M9 2h6a1 1 0 0 1 1 1v1h4a1 1 0 0 1 0 2H4a1 1 0 0 1 0-2h4V3a1 1 0 0 1 1-1Z" />
      <path fillRule="evenodd" d="m5 8 1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12H5Zm4 3v8h2v-8H9Zm4 0v8h2v-8h-2Z" clipRule="evenodd" />
    </>}
  </svg>;
}
