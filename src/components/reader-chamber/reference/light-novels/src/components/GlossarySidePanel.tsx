import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookA, X, Plus, Trash2, Check, Save } from 'lucide-react';
import {
  deleteLoreGlossaryTerm,
  getLoreGlossary,
  saveLoreGlossaryTerm,
} from '../lib/persistence';
import { LoreGlossary } from '../types';
import { useAppStore } from '../store/useAppStore';

interface GlossarySidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  novelId: string;
}

export function GlossarySidePanel({ isOpen, onClose, novelId }: GlossarySidePanelProps) {
  const [terms, setTerms] = useState<LoreGlossary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [targetLang, setTargetLang] = useState('zh-CN');
  
  // New term form state
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const isSavingLock = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadTerms = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const dbTerms = await getLoreGlossary(novelId);
      setTerms(dbTerms);
    } catch (e) {
      console.error("Failed to load glossary terms:", e);
    } finally {
      setIsLoading(false);
    }
  }, [novelId]);

  useEffect(() => {
    if (isOpen && novelId) {
      loadTerms();
    }
  }, [isOpen, novelId, loadTerms]);

  const handleAddWord = async () => {
    if (!newSource.trim() || !newTarget.trim() || isSavingLock.current) return;

    isSavingLock.current = true;
    setIsSaving(true);
    const termData = {
      novel_id: novelId,
      source_text: newSource.trim(),
      target_text: newTarget.trim(),
      target_lang: targetLang
    };

    try {
      await saveLoreGlossaryTerm(termData);
      setNewSource('');
      setNewTarget('');
      loadTerms();
    } catch (e) {
      console.error("Failed to save term:", e);
    } finally {
      isSavingLock.current = false;
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLoreGlossaryTerm(id);
      setTerms(terms.filter(t => t.id !== id));
    } catch (e) {
      console.error("Failed to delete term:", e);
    }
  };

  const filteredTerms = terms.filter(t => t.target_lang === targetLang);

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
          aria-label="Close glossary backdrop"
        />
      )}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="glossary-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 z-50 h-dvh w-full sm:w-96 bg-[#0a0a0a] border-l border-neutral-900 shadow-2xl flex flex-col"
            role="dialog"
            aria-labelledby="glossary-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-900 bg-black/50">
              <div className="flex items-center space-x-2 text-portal">
                <BookA size={20} />
                <h3 id="glossary-title" className="font-display font-medium">Lore Glossary</h3>
              </div>
              <button 
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={onClose}
                aria-label="Close glossary"
                className="p-1 text-neutral-500 hover:text-white transition-colors rounded hover:bg-neutral-900"
              >
                <X size={20} />
              </button>
            </div>

            {/* Language Selection */}
            <div className="p-4 border-b border-neutral-900">
              <label className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2 block font-mono" htmlFor="a11y-control-0wylkrp">Translation Target</label>
              <select
                value={targetLang}
                onChange={(e) => setTargetLang(e.target.value)}
                className="w-full bg-black border border-neutral-800 text-xs text-neutral-300 rounded p-2 focus:outline-none focus:border-portal" id="a11y-control-0wylkrp"
              >
                <option value="zh-CN">Chinese (Simplified)</option>
                <option value="zh-TW">Chinese (Traditional)</option>
                <option value="ja">Japanese</option>
                <option value="ko">Korean</option>
                <option value="vi">Vietnamese</option>
                <option value="id">Indonesian</option>
                <option value="th">Thai</option>
                <option value="tl">Tagalog (Filipino)</option>
                <option value="ms">Malay</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="hi">Hindi</option>
                <option value="de">German</option>
                <option value="ru">Russian</option>
                <option value="pt-BR">Portuguese (Brazil)</option>
              </select>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {isLoading ? (
                <div className="text-center text-xs text-neutral-500 py-8 font-mono animate-pulse">Loading terms...</div>
              ) : filteredTerms.length === 0 ? (
                <div className="text-center text-xs text-neutral-600 py-8 font-mono opacity-60 italic">No terms mapped for this language yet.</div>
              ) : (
                <div className="space-y-2">
                  {filteredTerms.map(term => (
                    <div key={term.id} className="group flex items-center justify-between p-2 rounded bg-neutral-900/40 border border-neutral-800 hover:border-portal/50 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm text-neutral-300 font-medium">{term.source_text}</span>
                        <span className="text-xs text-portal font-mono mt-0.5">{term.target_text}</span>
                      </div>
                      <button
                         tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleDelete(term.id)}
                        aria-label="Delete term"
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-600 hover:text-red-400 hover:bg-neutral-800 rounded transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New */}
            <div className="p-4 border-t border-neutral-900 bg-black">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Original word (e.g. Courting death)"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded p-2 focus:outline-none focus:border-portal/50 placeholder:text-neutral-600"
                />
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Translation"
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                    className="flex-1 bg-neutral-900 border border-neutral-800 text-sm text-neutral-200 rounded p-2 focus:outline-none focus:border-portal/50 placeholder:text-neutral-600"
                  />
                  <button
                    onClick={handleAddWord}
                    disabled={!newSource.trim() || !newTarget.trim() || isSaving}
                    aria-label="Add term"
                    className="bg-portal/20 text-portal hover:bg-portal hover:text-black disabled:opacity-50 disabled:cursor-not-allowed px-3 rounded flex items-center justify-center transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
