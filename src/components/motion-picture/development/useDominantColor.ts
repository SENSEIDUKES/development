import { useEffect, useState } from 'react';

/** Neutral aura used before sampling, and whenever artwork cannot be read. */
export const MOTION_PICTURE_FALLBACK_GLOW = 'rgba(4, 172, 255, 0.6)';

/** Artwork this dark loses its aura entirely, so its channels are scaled up to this total. */
const MINIMUM_TOTAL_BRIGHTNESS = 120;
const BOOSTED_TOTAL_BRIGHTNESS = 140;

/** Average one image down to a single pixel, keeping dark artwork visible as a glow. */
function sampleAverageColor(image: HTMLImageElement): string | undefined {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d');
  if (!context) return undefined;
  context.drawImage(image, 0, 0, 1, 1);
  // Reading a canvas drawn from artwork the host serves without CORS throws.
  const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
  const total = red + green + blue;
  if (total >= MINIMUM_TOTAL_BRIGHTNESS) return `rgba(${red}, ${green}, ${blue}, 0.75)`;
  // Scaling every channel by one factor lifts brightness without shifting hue.
  const scale = BOOSTED_TOTAL_BRIGHTNESS / Math.max(total, 1);
  const lift = (channel: number) => Math.min(255, Math.round(channel * scale));
  return `rgba(${lift(red)}, ${lift(green)}, ${lift(blue)}, 0.75)`;
}

/** Tint an item's motion aura with its own artwork instead of one global accent. */
export function useDominantColor(imageUrl: string | undefined): string {
  const [color, setColor] = useState(MOTION_PICTURE_FALLBACK_GLOW);
  useEffect(() => {
    if (!imageUrl || typeof document === 'undefined') {
      setColor(MOTION_PICTURE_FALLBACK_GLOW);
      return;
    }
    let active = true;
    const image = new Image();
    const resolve = (next: string) => {
      if (active) setColor(next);
    };
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        resolve(sampleAverageColor(image) ?? MOTION_PICTURE_FALLBACK_GLOW);
      } catch {
        resolve(MOTION_PICTURE_FALLBACK_GLOW);
      }
    };
    image.onerror = () => resolve(MOTION_PICTURE_FALLBACK_GLOW);
    image.src = imageUrl;
    return () => {
      active = false;
    };
  }, [imageUrl]);
  return color;
}
