import { LibraryStoryIcon } from '@seihouse/library-ui';

/** The same format mark on the Full card's trigger and the Info cover. */
export function WorldCardFormatSymbol({ format }: { format: string }) {
  return format.toLowerCase() === 'novel'
    ? <><LibraryStoryIcon size={17} aria-hidden /><span className="sr-only">Novel</span></>
    : <>{format.toUpperCase()}</>;
}
