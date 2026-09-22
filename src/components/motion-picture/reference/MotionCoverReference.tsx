import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Film } from 'lucide-react';

export interface MotionCoverReferenceProps {
  imageUrl: string;
  videoUrl?: string;
  title: string;
  motionCoverActive: boolean;
  onToggleMotionCover: () => void;
}

/**
 * Locked replica of the production "Canva" motion cover.
 *
 * Extracted from SENSEIDUKES/Light-Novels `src/components/StoryDetailScreen.tsx`
 * (the `motionCoverActive` aura layers, the Canva video peek overlay, and the
 * Canva toggle button), with the store write replaced by a host callback. It is
 * kept only so the Development version can be compared against what production
 * does today. Never edited during normal Workshop tweaking.
 */
export function MotionCoverReference({
  imageUrl,
  videoUrl,
  title,
  motionCoverActive,
  onToggleMotionCover,
}: MotionCoverReferenceProps) {
  const dominantColor = useProductionDominantColor(imageUrl);
  return <div className="w-44 md:w-56 flex-shrink-0 relative">
    {/* Ethereal QI Glow Aura */}
    <AnimatePresence>
      {motionCoverActive && <>
        {/* Layer 1: Wide Deep Pulse Fog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: [0.5, 0.85, 0.5], scale: [1.04, 1.15, 1.04] }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-6 rounded-lg filter blur-3xl z-0 pointer-events-none"
          style={{ background: `radial-gradient(circle, ${dominantColor} 0%, transparent 80%)` }}
        />
        {/* Layer 2: Intense Mid-range High-Energy Pulse */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: [0.8, 1, 0.8], scale: [1.02, 1.08, 1.02] }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-4 rounded-lg filter blur-2xl z-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${dominantColor} 10%, transparent 75%)`,
            boxShadow: `0 0 65px 28px ${dominantColor}, inset 0 0 30px ${dominantColor}`,
          }}
        />
        {/* Layer 3: Sharp High-Clarity Neon Halo Outline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.7, 0.95, 0.7] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -inset-1 rounded-lg filter blur-md z-0 pointer-events-none"
          style={{
            border: `2px solid ${dominantColor.replace('0.75', '0.9').replace('0.6', '0.9')}`,
            boxShadow: `0 0 25px 12px ${dominantColor}, inset 0 0 12px ${dominantColor}`,
          }}
        />
      </>}
    </AnimatePresence>

    <div className="relative z-10 group aspect-[2/3] rounded-lg overflow-hidden border border-neutral-800 transition-all duration-500 mb-2">
      <img src={imageUrl} alt={title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />

      {/* Canva Video Peak Overlay */}
      <AnimatePresence>
        {motionCoverActive && videoUrl && <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0 w-full h-full bg-void z-10"
        >
          <video src={videoUrl} className="w-full h-full object-cover" autoPlay muted playsInline onEnded={onToggleMotionCover} />
          {/* Visual Accent Badge */}
          <div className="absolute top-2 left-2 bg-portal/80 backdrop-blur-sm text-void font-sc font-bold text-[9px] uppercase tracking-widest px-2 py-0.5 rounded shadow z-20 pointer-events-none">
            ⓈSEN
          </div>
        </motion.div>}
      </AnimatePresence>
    </div>

    {/* The production toggle is its own button in the action column under the cover. */}
    <button
      type="button"
      onClick={onToggleMotionCover}
      className={`w-full py-2 border text-[11px] font-bold font-sc uppercase tracking-wider rounded flex items-center justify-center gap-1.5 transition-all ${
        motionCoverActive
          ? 'bg-[#04ACFF]/10 border-[#04ACFF]/30 text-signal hover:bg-portal hover:text-void'
          : 'bg-[#8B0000]/10 border-[#8B0000]/30 text-signal hover:bg-[#8B0000]/40'
      }`}
    >
      <Film size={12} />
      <span>{motionCoverActive ? 'Disable Canva' : 'Canva'}</span>
    </button>
  </div>;
}

/** Production samples the cover down to one pixel and boosts very dark artwork. */
function useProductionDominantColor(imageUrl: string | undefined) {
  const [dominantColor, setDominantColor] = useState('rgba(4, 172, 255, 0.6)');
  useEffect(() => {
    if (!imageUrl) {
      setDominantColor('rgba(4, 172, 255, 0.6)');
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 1, 1);
          const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
          const totalBrightness = r + g + b;
          let finalR = r;
          let finalG = g;
          let finalB = b;
          if (totalBrightness < 120) {
            const scale = 140 / Math.max(totalBrightness, 1);
            finalR = Math.min(255, Math.round(r * scale));
            finalG = Math.min(255, Math.round(g * scale));
            finalB = Math.min(255, Math.round(b * scale));
          }
          setDominantColor(`rgba(${finalR}, ${finalG}, ${finalB}, 0.75)`);
        }
      } catch {
        setDominantColor('rgba(4, 172, 255, 0.6)');
      }
    };
    img.onerror = () => setDominantColor('rgba(4, 172, 255, 0.6)');
  }, [imageUrl]);
  return dominantColor;
}
