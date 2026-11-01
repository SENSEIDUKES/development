import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import FocusLock from 'react-focus-lock';
import { X } from 'lucide-react';
import './hostDialog.css';

/**
 * A host page over the current one (the Model Router, Usage): a sheet on
 * phones, a dialog on larger screens. Tab stays inside it; Escape, the close
 * button or a tap outside closes it, and focus goes back where it came from.
 */
export function HostDialog({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close.current(); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      returnTo?.focus();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
      {/* Keeps Tab inside the page; this component itself focuses the close button and returns focus. */}
      <FocusLock autoFocus={false} returnFocus={false} className="contents">
      <div role="dialog" aria-modal="true" aria-labelledby={titleId}
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-[#05070d] px-3 pb-[calc(0.9rem+env(safe-area-inset-bottom,0px))] pt-3 text-white shadow-2xl sm:rounded-2xl sm:px-4"
        style={{ fontFamily: 'var(--font-sans)' }}>
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-sm font-semibold tracking-wide">{title}</h2>
          <button ref={closeButton} type="button" aria-label={`Close ${title}`} onClick={onClose}
            className="host-touch grid h-8 w-8 place-items-center rounded-full border border-white/10 text-white/60 hover:bg-white/5 hover:text-white">
            <X aria-hidden="true" size={15} />
          </button>
        </div>
        {children}
      </div>
      </FocusLock>
    </div>,
    // Rendered at the body so a blurred or sticky header cannot trap the overlay.
    document.body,
  );
}
