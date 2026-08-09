import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Sparkles, GitBranch, ShieldAlert, ChevronDown } from 'lucide-react';
import { useDialect } from '../shared/dialect';

interface AlterFatePageProps {
  onBack: () => void;
  onConfirmFork: (direction: string, customPrompt: string) => void;
  chapterNumber: number;
}

const FORK_TEMPLATES = [
  {
    id: 'alter-scene',
    title: 'Alter the next scene',
    description: 'Change the immediate upcoming event.',
    examples: ['"Make him humiliate the elder publicly."', '"Spare the rival."']
  },
  {
    id: 'path-direction',
    title: 'Choose a path direction',
    description: 'Pivot the long-term genre or storyline focus.',
    examples: ['"Revenge path"', '"Tournament arc path"', '"Clan politics path"']
  },
  {
    id: 'interrupt-trope',
    title: 'Interrupt a trope',
    description: 'Break expected conventions.',
    examples: ['"Don\'t let the arrogant young master escape."', '"Turn the jade beauty into a rival."']
  }
];

/**
 * Alter Fate as its own reader tab page (switched via `onSwitchTab`) rather
 * than a header-menu modal. Same fork-template form as the former
 * `AlterFatePanel`, laid out full-page instead of centered overlay.
 */
export const AlterFatePage: React.FC<AlterFatePageProps> = ({ onBack, onConfirmFork, chapterNumber }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(FORK_TEMPLATES[0].id);
  const [customPrompt, setCustomPrompt] = useState(FORK_TEMPLATES[0].examples[0].replace(/"/g, ''));
  const t = useDialect();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeTemplate = FORK_TEMPLATES.find(t => t.id === selectedTemplate) || FORK_TEMPLATES[0];

  return (
    <div className="min-h-[60vh] bg-void">
      <div className="sticky top-0 z-20 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-neutral-900 bg-neutral-950/90">
        <button
          onClick={onBack}
          className="p-2 rounded-full border border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900 flex items-center justify-center transition-all shrink-0"
          title="Back to Reader"
          aria-label="Back to Reader"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-display font-medium text-signal tracking-wide flex items-center gap-2">
            <GitBranch className="text-portal shrink-0" size={18} />
            {t('alter_fate')}
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5 font-sans">
            Branch reality from <strong className="text-portal">Chapter {chapterNumber}</strong>. The Karma, Codex, and all future chapters will respect this divergence.
          </p>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-6 space-y-6">
        <div className="space-y-4" ref={menuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-full flex items-center justify-between bg-neutral-950 border border-neutral-800 hover:border-portal text-signal p-3 rounded transition-colors"
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-sc text-[12px] uppercase tracking-wider font-bold text-portal">{activeTemplate.title}</span>
                <span className="text-[10px] text-neutral-500 mt-0.5">{activeTemplate.description}</span>
              </div>
              <ChevronDown size={16} className={`text-neutral-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-1 bg-neutral-950 border border-neutral-800 rounded shadow-2xl z-20 overflow-hidden"
                >
                  {FORK_TEMPLATES.map(template => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setSelectedTemplate(template.id);
                        setCustomPrompt(template.examples[0].replace(/"/g, ''));
                        setIsMenuOpen(false);
                      }}
                      className={`w-full text-left p-3 hover:bg-neutral-900 transition-colors flex flex-col border-b border-neutral-900/50 last:border-0 ${selectedTemplate === template.id ? 'bg-neutral-900/50' : ''}`}
                    >
                      <span className={`font-sc text-[11px] uppercase tracking-wider font-bold ${selectedTemplate === template.id ? 'text-portal' : 'text-signal'}`}>
                        {template.title}
                      </span>
                      <span className="text-[10px] text-neutral-500 mt-0.5">{template.description}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] uppercase font-sc tracking-widest text-neutral-400 font-bold" htmlFor="custom-prompt">
            {t('divine_command')}
          </label>
          <p className="text-[9px] text-neutral-500 font-sans normal-case mt-0.5 leading-snug">Your instruction for what changes after this branch point.</p>
          <textarea
            id="custom-prompt"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Declare the new destiny parameter. E.g. 'Turn the jade beauty into a rival instead of a love interest.'"
            className="w-full h-32 bg-neutral-950 border border-neutral-800 focus:border-portal focus:ring-1 focus:ring-portal text-signal text-sm p-4 rounded resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-neutral-900">
          <div className="text-[10px] text-neutral-500 flex items-center gap-1.5 max-w-[280px]">
            <ShieldAlert size={12} className="text-portal shrink-0" />
            <span>This creates a new linked copy in your library, preserving the original timeline.</span>
          </div>
          <button
            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => onConfirmFork(selectedTemplate || 'alter-scene', customPrompt)}
            disabled={!customPrompt.trim()}
            className="px-6 py-2 bg-void border border-portal text-portal font-sc font-bold uppercase tracking-wider text-xs rounded hover:bg-portal hover:text-void transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(4,172,255,0.2)] shrink-0"
          >
            <span>Sundert The Timeline</span>
            <Sparkles size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
