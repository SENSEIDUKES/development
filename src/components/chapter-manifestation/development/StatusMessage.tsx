import { AnimatePresence, motion } from 'motion/react';
import { Sparkles } from 'lucide-react';

export interface StatusMessageProps { message: string }

/** The changing line describing generation activity, with its existing transition. */
export function StatusMessage({ message }: StatusMessageProps) {
  return <div className="status-message flex items-center justify-center gap-3">
    <Sparkles size={10} className="status-message-sparkle shrink-0" />
    <AnimatePresence mode="wait">
      <motion.span key={message} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.45, ease: 'easeInOut' }}
        className="font-serif italic text-sm text-neutral-300 leading-snug">
        &ldquo;{message}&rdquo;
      </motion.span>
    </AnimatePresence>
    <Sparkles size={10} className="status-message-sparkle shrink-0" />
  </div>;
}
