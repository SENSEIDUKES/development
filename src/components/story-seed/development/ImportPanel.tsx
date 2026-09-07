import { useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Layers, Upload, X } from 'lucide-react';
import type { StorySeedArtifact } from '../shared/storySeedRepository';
import { parseStorySeedJson } from '../shared/storySeedSerialization';
import { NarrativeButton as LibraryButton, NarrativeTextArea as LibraryTextArea } from '../../../presentation';

/**
 * Import Story Seed — the portable-JSON intake surface, living inside the
 * Story Bank. Same dossier dialect as the workspaces and the Blueprint
 * review: gold medallion heading, serif tagline, the official glass field,
 * and LibraryButton actions. Behavior (file pick, paste, parse, import) is
 * unchanged from the original flat panel.
 */

interface ImportPanelProps {
  show: boolean;
  onClose: () => void;
  onImport: (artifacts: StorySeedArtifact[]) => Promise<void>;
}

export const ImportPanel = ({ show, onClose, onImport }: ImportPanelProps) => {
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const completeImport = async (artifacts: StorySeedArtifact[]) => {
    setIsImporting(true);
    setImportError(null);
    try {
      await onImport(artifacts);
      setImportText('');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'The seed could not be added to your account.');
    } finally {
      setIsImporting(false);
    }
  };

  const importJson = async (json: string, fallbackMessage: string) => {
    try {
      await completeImport(parseStorySeedJson(json));
    } catch (error) {
      setImportError(error instanceof Error ? error.message : fallbackMessage);
    }
  };

  const handleImportSubmit = async () => {
    if (!importText.trim()) {
      setImportError('Please paste Story Seed JSON first.');
      return;
    }
    await importJson(importText, 'The pasted Story Seed JSON is invalid.');
  };

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await importJson(await file.text(), 'The selected Story Seed file is invalid.');
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'The selected Story Seed file could not be read.');
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-6 overflow-hidden"
        >
          <section
            aria-labelledby="story-seed-import-title"
            className="rounded-xl border border-[rgba(172,166,214,0.2)] bg-[rgba(11,14,30,0.55)] p-4 shadow-[inset_0_1px_0_rgba(226,220,200,0.05),0_14px_32px_-18px_rgba(1,3,10,0.95)] sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h3
                id="story-seed-import-title"
                className="flex min-w-0 items-center gap-3 font-display text-base font-bold uppercase tracking-[0.12em] text-[#F3EDE0]"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(205,178,113,0.38)] bg-[radial-gradient(circle_at_32%_28%,rgba(205,178,113,0.14),rgba(11,14,30,0.55)_68%)] text-[#CDB271] shadow-[0_0_16px_rgba(205,178,113,0.12),inset_0_0_10px_rgba(205,178,113,0.08)]"
                >
                  <Layers size={15} className="drop-shadow-[0_0_6px_rgba(205,178,113,0.35)]" />
                </span>
                Import Story Seed
              </h3>
              <LibraryButton
                variant="ghost"
                size="icon"
                icon={X}
                onClick={onClose}
                aria-label="Close import"
              />
            </div>

            <p className="mt-3 max-w-xl font-serif text-[13px] leading-relaxed text-[#B0A99B]">
              Import portable Story Seed JSON. A reviewed World Blueprint is restored when present; older seed-only files remain supported.
            </p>

            <div className="mt-4 space-y-4">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[rgba(205,178,113,0.32)] bg-[rgba(205,178,113,0.03)] px-4 py-3.5 font-sc text-[10px] font-bold uppercase tracking-[0.18em] text-[#DDC58A] transition-colors hover:border-[rgba(205,178,113,0.55)] hover:bg-[rgba(205,178,113,0.07)]">
                <Upload size={14} aria-hidden="true" />
                Choose Story Seed JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileImport}
                  disabled={isImporting}
                  className="sr-only"
                />
              </label>

              <LibraryTextArea
                label="Story Seed JSON"
                value={importText}
                onChange={(value) => {
                  setImportText(value);
                  setImportError(null);
                }}
                rows={6}
                placeholder="Paste portable Story Seed JSON here..."
                error={importError ?? undefined}
                disabled={isImporting}
              />

              <div className="flex justify-end">
                <LibraryButton
                  variant="primary"
                  onClick={handleImportSubmit}
                  loading={isImporting}
                  disabled={isImporting}
                >
                  {isImporting ? 'Saving Seed…' : 'Activate Seed'}
                </LibraryButton>
              </div>
            </div>
          </section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
