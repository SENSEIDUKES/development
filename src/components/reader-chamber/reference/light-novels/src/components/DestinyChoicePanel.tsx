import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download } from 'lucide-react';
import { handleDownload } from '../utils/downloadUtils';


interface DestinyChoicePanelProps {
  isOpen: boolean;
  imageUrls: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onApply: () => void;
  onDiscard: () => void;
  title?: string;
  subtitle?: string;
}

export const DestinyChoicePanel: React.FC<DestinyChoicePanelProps> = ({
  isOpen,
  imageUrls,
  selectedIndex,
  onSelect,
  onApply,
  onDiscard,
  title = "Destiny Choices",
  subtitle = "Choose the form that will enter the Codex."
}) => {
  return (
    <AnimatePresence>
      {(isOpen && imageUrls.length > 0) && (
        <motion.div
          key="destiny-choice-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-[#0a0a0a] border border-neutral-800 rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col"
          >
          <div className="p-6 text-center border-b border-neutral-900 bg-void">
            <h2 className="text-xl font-sc font-bold text-signal tracking-widest uppercase flex items-center justify-center gap-2">
              <Sparkles className="text-portal" size={20} />
              {title}
              <Sparkles className="text-portal" size={20} />
            </h2>
            <p className="text-xs text-neutral-400 mt-2 font-sans">{subtitle}</p>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-neutral-950/50 overflow-y-auto max-h-[60vh]">
            {imageUrls.map((url, index) => {
              const isSelected = selectedIndex === index;
              return (
                <div 
                  key={index}
                  onClick={() => onSelect(index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(index);
                    }
                  }}
                  aria-label={`Select form ${index + 1}`}
                  className={`relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 border-2 group focus-visible:ring-2 focus-visible:ring-portal outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                    isSelected ? 'border-portal shadow-[0_0_20px_rgba(4,172,255,0.3)] scale-105 z-10' : 'border-neutral-800 hover:border-neutral-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img 
                    src={url} 
                    alt={`Form ${index + 1}`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Premium floating Download button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(url, `sei_house_form_${['I', 'II', 'III'][index] || index + 1}.png`);
                    }}
                    className="absolute top-2 left-2 z-20 bg-black/85 hover:bg-portal hover:text-void border border-neutral-900 hover:border-portal text-neutral-300 p-1.5 rounded-md transition-all duration-200 shadow-md backdrop-blur opacity-80 hover:opacity-100 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-portal outline-none"
                    title="Download Form Draft"
                    aria-label="Download Form Draft"
                  >
                    <Download size={11} />
                  </button>
                  
                  <div className={`absolute inset-x-0 bottom-0 py-2 text-center text-xs font-mono font-bold uppercase tracking-widest transition-colors ${
                    isSelected ? 'bg-portal/90 text-void' : 'bg-black/80 text-neutral-400'
                  }`}>
                    Form {['I', 'II', 'III'][index] || index + 1}
                  </div>
                  
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-void/80 border border-portal text-portal px-2 py-1 rounded text-[10px] font-bold uppercase backdrop-blur shadow-lg">
                      Selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="p-4 border-t border-neutral-900 bg-void flex justify-between gap-4">
            <button 
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={onDiscard}
              className="px-6 py-2.5 rounded font-mono text-[11px] uppercase tracking-wider bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-signal transition-colors border border-neutral-800 focus-visible:ring-2 focus-visible:ring-portal outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Discard Traces
            </button>
            <button 
              onClick={onApply}
              className="flex-1 px-6 py-2.5 rounded font-mono text-[11px] uppercase font-bold tracking-wider bg-portal text-void hover:bg-portal/90 transition-all shadow-[0_0_15px_rgba(4,172,255,0.3)] focus-visible:ring-2 focus-visible:ring-portal outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Seal Form into Codex
            </button>
          </div>
        </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
