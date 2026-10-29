/** The Reader's small glass pickers (the chapter list in the top bar, narration speed in the bottom bar), one look for both. */
export const controlFeedback = 'motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--reader-accent-soft)';
export const pickerSurface = 'reader-glass reader-glass-menu reader-glass-picker w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border border-(--reader-light)/10 bg-(--reader-surface)/95 p-1.5 font-sans text-(--reader-text) shadow-lg backdrop-blur-xl';
export const pickerHeading = 'mx-1.5 mb-1 border-b border-(--reader-light)/10 px-1.5 pb-2.5 pt-2 text-xs font-medium text-(--reader-text-dim)';
export const pickerList = 'max-h-[min(20rem,60dvh)] overflow-y-auto overscroll-contain p-0.5';
export const pickerRow = 'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm leading-5 hover:bg-(--reader-light)/10 active:bg-(--reader-light)/15 motion-safe:transition-colors motion-safe:duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--reader-accent-soft)';
export const pickerSelected = 'bg-(--reader-light)/10 font-medium text-(--reader-text)';
