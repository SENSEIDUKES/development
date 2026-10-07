import React from 'react';
import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { Chapter } from '../types';

interface ManifestationImageProps {
  selectedChapter: Chapter;
  generatingIds?: Set<string>;
  triggerHeroGeneration?: () => void;
}

export function ManifestationImage({
  selectedChapter,
  generatingIds,
  triggerHeroGeneration,
}: ManifestationImageProps) {
  return (
    <motion.div 
      onViewportEnter={() => triggerHeroGeneration?.()}
      viewport={{ once: true, margin: "-100px" }}
      className="mt-20 mb-8 w-fit max-w-full mx-auto"
    >
      {selectedChapter.assetManifest?.heroImage ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="bg-void rounded-sm overflow-hidden shadow-[0_0_40px_rgba(4,172,255,0.15)] relative border border-neutral-800/80 group"
        >
          <div className="absolute top-4 left-4 z-20 px-3 py-1.5 bg-void/80 backdrop-blur-md text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#04ACFF] border border-[#04ACFF]/20 rounded-sm flex items-center gap-2 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-[#04ACFF] animate-pulse" />
            Memory of this event
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-void/30 opacity-90 z-10 pointer-events-none" />
          <img 
            src={selectedChapter.assetManifest.heroImage} 
            alt="Chapter Crux Manifestation" 
            className="w-full h-auto object-contain max-h-[65vh] block mx-auto mix-blend-screen opacity-90 transition-transform duration-1000 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 z-20 bg-gradient-to-t from-void flex flex-col justify-end">
            <p className="text-signal/80 text-sm sm:text-base italic font-serif leading-relaxed line-clamp-3">
              "{selectedChapter.summary}"
            </p>
          </div>
        </motion.div>
      ) : generatingIds?.has(`chapter-hero-${selectedChapter.number}`) ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-void/50 rounded-sm overflow-hidden border border-neutral-800/40 w-full max-w-2xl min-h-[40vh] flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="mb-4">
            <Loader2 className="animate-spin text-[#04ACFF] mx-auto" size={32} />
          </div>
          <div className="text-[10px] sm:text-xs font-mono uppercase tracking-widest text-[#04ACFF]">
            Distilling Visual Memory...
          </div>
        </motion.div>
      ) : null}
    </motion.div>
  );
}
