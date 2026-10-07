import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SYSTEM_LEGEND_DISMISSED_STORAGE_KEY } from '../lib/readerLegend';
import { SYSTEM_COLORS_LEGEND } from '../lib/systemColors';

interface SystemColorLegendProps {
  currentPrefs: any;
  handleUpdatePreference: (key: string, value: any) => void;
  setShowLegend: (show: boolean) => void;
}

export function SystemColorLegend({
  currentPrefs,
  handleUpdatePreference,
  setShowLegend,
}: SystemColorLegendProps) {
  return (
    <motion.div
      role="region"
      aria-labelledby="aetherial-system-legend-heading"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-8 p-5 bg-[#080808]/90 border border-portal/30 rounded-lg max-w-2xl mx-auto shadow-[0_0_30px_rgba(4,172,255,0.1)] relative z-10"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-portal/20 pb-2 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-portal text-sm animate-pulse">✦</span>
          <div>
            <h4
              id="aetherial-system-legend-heading"
              className="font-display font-medium text-xs sm:text-sm text-signal tracking-widest uppercase"
            >
              Aetherial System Codes
            </h4>
            <p className="text-[9px] text-neutral-500 font-sans normal-case leading-snug mt-0.5">Color guide for story system notifications and events.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={currentPrefs?.colorPaletteId || 'default'}
            onChange={(e) => handleUpdatePreference('colorPaletteId', e.target.value)}
            className="text-[9px] uppercase font-mono tracking-wider text-portal transition-colors px-2.5 py-1.5 border border-portal/30 hover:border-portal rounded-sm bg-portal/5 hover:bg-portal/15 cursor-pointer outline-none focus:ring-1 focus:ring-portal appearance-none"
          >
            <option value="default" className="bg-void text-signal">Custom Mapping: Default</option>
            <option value="protanopia" className="bg-void text-signal">Protanopia (Red-Blind)</option>
            <option value="deuteranopia" className="bg-void text-signal">Deuteranopia (Green-Blind)</option>
            <option value="tritanopia" className="bg-void text-signal">Tritanopia (Blue-Blind)</option>
            <option value="high_contrast_dark" className="bg-void text-signal">High Contrast Dark</option>
          </select>
          <button
            tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
              localStorage.setItem(SYSTEM_LEGEND_DISMISSED_STORAGE_KEY, "true");
              setShowLegend(false);
            }}
            className="text-[9px] uppercase font-mono tracking-wider text-portal hover:text-signal transition-colors px-2.5 py-1.5 border border-portal/30 hover:border-portal rounded-sm bg-portal/5 hover:bg-portal/15 cursor-pointer shadow-[0_0_10px_rgba(4,172,255,0.1)]"
          >
            Dismiss
          </button>
        </div>
      </div>
      
      <p className="text-neutral-400 text-xs font-serif italic mb-4 leading-relaxed">
        The Heavenly System speaks through colors. The resonance of each hue carries deep narrative significance. Learn to feel the thread of your fate.
      </p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
        {SYSTEM_COLORS_LEGEND.map((m) => (
          <div
            key={m.type}
            className={`p-2 border rounded-md ${m.cssVar ? '' : `${m.bgColor} ${m.borderColor}`} flex flex-col justify-between min-h-[60px] transition-all hover:scale-[1.02]`}
            style={m.cssVar ? {
              backgroundColor: `color-mix(in srgb, var(${m.cssVar}) 15%, transparent)`,
              borderColor: `color-mix(in srgb, var(${m.cssVar}) 40%, transparent)`
            } : {}}
          >
            <span 
              className={`text-[10px] font-bold uppercase tracking-wider ${m.cssVar ? '' : m.textColor}`}
              style={m.cssVar ? { color: `var(${m.cssVar})` } : {}}
            >
              {m.name}
            </span>
            <span className="text-[9px] text-neutral-400 font-mono tracking-tight mt-1 leading-normal">
              {m.playerMeaning}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
