import React, { useEffect, useRef } from 'react';

type Rgb = readonly [number, number, number];

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  fadeSpeed: number;
  colorIndex: number;
  glyph?: HTMLImageElement;
  outerLane?: -1 | 1;
  rotation?: number;
  rotationSpeed?: number;
  /** Resists the center funnel and wanders laterally instead. */
  drift?: boolean;
}

interface ForegroundZone {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
}

interface AccentPalette {
  /** The accent itself. */
  base: Rgb;
  /** Lightened — hot cores, bright rims. */
  bright: Rgb;
  /** Near-white tint of the accent — the hottest points. */
  pale: Rgb;
  /** Darkened — scroll body, roller silhouettes. */
  deep: Rgb;
  /** Mid-dark — parchment gradient stops. */
  dim: Rgb;
}

const DEFAULT_ACCENT: Rgb = [245, 185, 66];
const TARGET_FRAME_MS = 1000 / 60;
const MIN_RENDER_INTERVAL_MS = 9.5;
const DUST_SPRITE_SIZE = 64;
const DUST_BLEND_STEPS = 8;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const clampChannel = (value: number) => Math.min(255, Math.max(0, Math.round(value)));

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  clampChannel(a[0] + (b[0] - a[0]) * t),
  clampChannel(a[1] + (b[1] - a[1]) * t),
  clampChannel(a[2] + (b[2] - a[2]) * t),
];

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

const buildPalette = (accent: Rgb): AccentPalette => ({
  base: accent,
  bright: mix(accent, WHITE, 0.35),
  pale: mix(accent, WHITE, 0.72),
  deep: mix(accent, BLACK, 0.82),
  dim: mix(accent, BLACK, 0.55),
});

const hexToRgb = (value: string): Rgb | null => {
  const hex = value.trim().replace(/^#/, '');
  const full =
    hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

const toRgba = ([red, green, blue]: Rgb, alpha: number) =>
  `rgba(${red}, ${green}, ${blue}, ${alpha})`;

const DEFAULT_FOREGROUND_SELECTOR =
  '[data-celestial-foreground], dialog[open], [role="dialog"]';

export interface ParticleEffectProps {
  /**
   * Accent color for the whole effect — scroll glow, beam, absorption point,
   * particle bloom, and glyph halos all derive from it. Accepts a hex string
   * (e.g. "#a855f7"). When omitted, the component reads the
   * `--celestial-accent` CSS variable from its ancestors, falling back to
   * celestial gold.
   */
  accent?: string;
  /**
   * Visible content is treated as a calm zone when it matches this selector.
   * Dialogs work out of the box; application panels can opt in once with
   * `data-celestial-foreground` instead of maintaining a separate backdrop.
   */
  foregroundSelector?: string;
  /** Extra breathing room, in CSS pixels, around foreground content. */
  foregroundPadding?: number;
  /**
   * Scales the upward draw toward the scroll (1 = default speed). Values
   * below 1 slow the absorption stream.
   */
  speedScale?: number;
  /**
   * Fraction of particles (0–1) that resist the center funnel and wander
   * laterally instead, keeping the outer field populated. 0 = default
   * behavior (everything converges on the absorption point).
   */
  dispersion?: number;
}

export const ParticleEffect: React.FC<ParticleEffectProps> = React.memo(
  ({
    accent,
    foregroundSelector = DEFAULT_FOREGROUND_SELECTOR,
    foregroundPadding = 72,
    speedScale = 1,
    dispersion = 0,
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Resolve the accent: prop → CSS variable → default gold.
      const cssAccent = getComputedStyle(canvas).getPropertyValue('--celestial-accent');
      const accentRgb =
        (accent && hexToRgb(accent)) || (cssAccent && hexToRgb(cssAccent)) || DEFAULT_ACCENT;
      const palette = buildPalette(accentRgb);

      let animationId: number;
      let width = (canvas.width = window.innerWidth);
      let height = (canvas.height = window.innerHeight);

      const handleResize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', handleResize);

      let foregroundZones: ForegroundZone[] = [];
      let nextForegroundCheck = 0;

      const refreshForegroundZones = () => {
        const canvasRect = canvas.getBoundingClientRect();
        const padding = Math.max(0, foregroundPadding);

        try {
          foregroundZones = Array.from(document.querySelectorAll<HTMLElement>(foregroundSelector))
            .filter((element) => {
              if (element === canvas) return false;
              const style = getComputedStyle(element);
              return style.display !== 'none' && style.visibility !== 'hidden';
            })
            .map((element) => element.getBoundingClientRect())
            .filter((rect) => rect.width > 0 && rect.height > 0)
            .map((rect) => {
              const left = Math.max(0, rect.left - canvasRect.left - padding);
              const right = Math.min(width, rect.right - canvasRect.left + padding);
              const top = Math.max(0, rect.top - canvasRect.top - padding);
              const bottom = Math.min(height, rect.bottom - canvasRect.top + padding);

              return {
                left,
                right,
                top,
                bottom,
                centerX: (left + right) / 2,
              };
            })
            .filter((zone) => zone.right > zone.left && zone.bottom > zone.top);
        } catch {
          foregroundZones = [];
        }
      };

      refreshForegroundZones();

      const particles: Particle[] = [];
      const glyphs = [
        '/icons/yin-yang.svg',
        '/icons/shen-long-dragon.svg',
        '/icons/sacred-tree.svg',
        '/icons/thunder-cloud.svg',
        '/icons/book-scroll.svg',
        '/icons/cultivator.svg',
      ].map((source) => {
        const glyph = new Image();
        glyph.decoding = 'async';
        glyph.src = source;
        return glyph;
      });

      // Mostly accent-derived tones; a neutral minority keeps depth.
      const colors: Rgb[] = [
        palette.base,
        palette.bright,
        palette.pale,
        mix(palette.base, WHITE, 0.15),
        WHITE,
        mix(WHITE, palette.base, 0.15), // cool white with a whisper of accent
      ];

      // Dust uses the same radial glow as before, but the expensive gradients
      // are rendered once instead of being rebuilt for every particle/frame.
      const dustSprites = colors.map((baseColor) =>
        Array.from({ length: DUST_BLEND_STEPS }, (_, step) => {
          const blend = step / (DUST_BLEND_STEPS - 1);
          const color = mix(baseColor, palette.bright, blend * 0.85);
          const sprite = document.createElement('canvas');
          sprite.width = DUST_SPRITE_SIZE;
          sprite.height = DUST_SPRITE_SIZE;
          const spriteCtx = sprite.getContext('2d');
          if (!spriteCtx) return sprite;

          const center = DUST_SPRITE_SIZE / 2;
          const gradient = spriteCtx.createRadialGradient(center, center, 0, center, center, center);
          gradient.addColorStop(0, toRgba(color, 1));
          gradient.addColorStop(0.4, toRgba(color, 0.5));
          gradient.addColorStop(1, toRgba(color, 0));
          spriteCtx.fillStyle = gradient;
          spriteCtx.fillRect(0, 0, DUST_SPRITE_SIZE, DUST_SPRITE_SIZE);
          return sprite;
        }),
      );
      const glyphShadowColor = toRgba(palette.base, 0.95);
      const glyphTintColor = toRgba(palette.bright, 1);

      const driftShare = clamp01(dispersion);

      const createParticle = (isInitial = false): Particle => {
        const size = Math.random() * 3 + (Math.random() < 0.15 ? Math.random() * 8 + 4 : 1);
        const isGlyph = size > 4 && Math.random() < 0.42;
        const outerLane = isGlyph ? (Math.random() < 0.5 ? -1 : 1) : undefined;
        const glyphInForegroundMode = isGlyph && foregroundZones.length > 0;
        const x = glyphInForegroundMode
          ? width * (outerLane === -1 ? 0.08 + Math.random() * 0.2 : 0.72 + Math.random() * 0.2)
          : Math.random() * width;

        return {
          x,
          y: isInitial ? Math.random() * height : height + 20,
          size,
          speedY: -(Math.random() * 1.5 + 0.5),
          speedX: (Math.random() - 0.5) * 1,
          opacity: Math.random() * 0.875 + 0.375,
          fadeSpeed: Math.random() * 0.003 + 0.001,
          colorIndex: Math.floor(Math.random() * colors.length),
          glyph: isGlyph ? glyphs[Math.floor(Math.random() * glyphs.length)] : undefined,
          outerLane,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.025,
          drift: Math.random() < driftShare,
        };
      };

      for (let i = 0; i < 110; i++) {
        particles.push(createParticle(true));
      }

      // Fill an elliptical radial gradient (canvas gradients are circular, so
      // we draw in a scaled space).
      const fillEllipticalGlow = (
        x: number,
        y: number,
        rx: number,
        ry: number,
        stops: readonly (readonly [number, string])[],
      ) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(rx, ry);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        for (const [offset, color] of stops) gradient.addColorStop(offset, color);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      // --- The celestial scroll -------------------------------------------
      // Cosmic, not literal: almost no visible body — just a delicate curved
      // rim of light, two spiral rollers, a compact star at the absorption
      // point, and a whisper of a beam.
      const drawScroll = (time: number) => {
        const cx = width / 2;
        const rimY = height * 0.016; // rim height at the left/right edges
        const dipY = height * 0.055; // the rim dips at center — the absorption point
        const pulse = 0.9 + 0.1 * Math.sin(time * 1.3);
        const starWave = Math.sin(time * 1.08);
        const starScale = 1 + starWave * 0.035;
        const starIntensity = 0.7 + starWave * 0.05;
        const flicker = 0.92 + 0.08 * Math.sin(time * 2.1);
        const rimControlY = 2 * dipY - rimY;

        ctx.save();
        ctx.globalCompositeOperation = 'screen';

        // The faintest suggestion of mass above the rim — nearly black,
        // just enough to read as an object hanging overhead.
        const sheetGrad = ctx.createLinearGradient(0, -height * 0.4, 0, dipY);
        sheetGrad.addColorStop(0, toRgba(palette.deep, 0));
        sheetGrad.addColorStop(1, toRgba(palette.deep, 0.16));
        ctx.beginPath();
        ctx.moveTo(-10, rimY);
        ctx.quadraticCurveTo(cx, rimControlY, width + 10, rimY);
        ctx.lineTo(width + 10, -height);
        ctx.lineTo(-10, -height);
        ctx.closePath();
        ctx.fillStyle = sheetGrad;
        ctx.fill();

        // Spiral rollers: fine rings of light wrapped in a soft halo,
        // half offscreen at each end.
        const rollerR = Math.min(width, height) * 0.042;
        for (const side of [-1, 1]) {
          const rx = side < 0 ? -rollerR * 0.3 : width + rollerR * 0.3;
          const ry = rimY - rollerR * 0.3;
          // Halo: a warm pool of light behind the rings.
          fillEllipticalGlow(rx, ry, rollerR * 2.6, rollerR * 2.6, [
            [0, toRgba(palette.pale, 0.28 * pulse)],
            [0.45, toRgba(palette.bright, 0.13 * pulse)],
            [1, toRgba(palette.base, 0)],
          ]);
          ctx.shadowBlur = 20;
          ctx.shadowColor = toRgba(palette.bright, 0.85);
          for (const [radius, alpha, lineWidth] of [
            [rollerR, 0.55, 1.4],
            [rollerR * 0.68, 0.42, 1.2],
            [rollerR * 0.4, 0.3, 1],
            [rollerR * 0.16, 0.4, 1],
          ] as const) {
            ctx.beginPath();
            ctx.arc(rx, ry, radius, 0, Math.PI * 2);
            ctx.strokeStyle = toRgba(palette.bright, alpha * flicker);
            ctx.lineWidth = lineWidth;
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
        }

        // The rim: one delicate curved line of light, dipping at center.
        ctx.beginPath();
        ctx.moveTo(-10, rimY);
        ctx.quadraticCurveTo(cx, rimControlY, width + 10, rimY);
        ctx.strokeStyle = toRgba(palette.base, 0.16 * flicker);
        ctx.lineWidth = 3;
        ctx.shadowBlur = 16;
        ctx.shadowColor = toRgba(palette.bright, 0.8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-10, rimY);
        ctx.quadraticCurveTo(cx, rimControlY, width + 10, rimY);
        ctx.strokeStyle = toRgba(palette.pale, 0.72 * flicker);
        ctx.lineWidth = 1.1;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Soft halo around the rim's center dip.
        fillEllipticalGlow(cx, dipY, width * 0.3, height * 0.085, [
          [0, toRgba(palette.pale, 0.32 * pulse)],
          [0.4, toRgba(palette.bright, 0.16 * pulse)],
          [0.75, toRgba(palette.base, 0.05 * pulse)],
          [1, toRgba(palette.base, 0)],
        ]);

        // The absorption point: a soft diffuse glow with only a whisper of
        // a cross sparkle — felt, not drawn.
        fillEllipticalGlow(cx, dipY, height * 0.042 * starScale, height * 0.042 * starScale, [
          [0, toRgba(mix(palette.pale, WHITE, 0.6), starIntensity)],
          [0.4, toRgba(palette.pale, starIntensity * 0.42)],
          [1, toRgba(palette.bright, 0)],
        ]);
        const sparkleLen = height * 0.045 * starScale;
        const sparkleGradH = ctx.createLinearGradient(cx - sparkleLen, 0, cx + sparkleLen, 0);
        sparkleGradH.addColorStop(0, toRgba(palette.pale, 0));
        sparkleGradH.addColorStop(0.5, toRgba(palette.pale, 0.2 + starWave * 0.025));
        sparkleGradH.addColorStop(1, toRgba(palette.pale, 0));
        ctx.fillStyle = sparkleGradH;
        ctx.fillRect(cx - sparkleLen, dipY - 0.4, sparkleLen * 2, 0.8);
        const sparkleGradV = ctx.createLinearGradient(0, dipY - sparkleLen * 0.6, 0, dipY + sparkleLen * 0.6);
        sparkleGradV.addColorStop(0, toRgba(palette.pale, 0));
        sparkleGradV.addColorStop(0.5, toRgba(palette.pale, 0.13 + starWave * 0.018));
        sparkleGradV.addColorStop(1, toRgba(palette.pale, 0));
        ctx.fillStyle = sparkleGradV;
        ctx.fillRect(cx - 0.4, dipY - sparkleLen * 0.6, 0.8, sparkleLen * 1.2);

        // The beam: a single broad wash of light, no structure. Layers blend
        // into one soft column that dissolves into the dark.
        const beamLen = height * 0.5;
        fillEllipticalGlow(cx, dipY + beamLen * 0.3, width * 0.24, beamLen * 0.58, [
          [0, toRgba(palette.pale, 0.075 * pulse)],
          [0.5, toRgba(palette.bright, 0.035 * pulse)],
          [1, toRgba(palette.bright, 0)],
        ]);
        fillEllipticalGlow(cx, dipY + beamLen * 0.22, width * 0.11, beamLen * 0.4, [
          [0, toRgba(palette.pale, 0.06 * pulse)],
          [1, toRgba(palette.bright, 0)],
        ]);

        ctx.restore();
      };

      let lastRenderTime = 0;

      const animate = (timestamp: number) => {
        const elapsed = lastRenderTime === 0 ? TARGET_FRAME_MS : timestamp - lastRenderTime;
        if (lastRenderTime !== 0 && elapsed < MIN_RENDER_INTERVAL_MS) {
          animationId = requestAnimationFrame(animate);
          return;
        }

        const frameScale = Math.min(elapsed / TARGET_FRAME_MS, 2);
        lastRenderTime = timestamp;
        const time = timestamp / 1000;
        if (time >= nextForegroundCheck) {
          refreshForegroundZones();
          nextForegroundCheck = time + 0.2;
        }
        ctx.clearRect(0, 0, width, height);

        drawScroll(time);

        // One absorption point: the center dip of the scroll's lower rim.
        const absorbX = width / 2;
        const absorbY = height * 0.055;
        const funnelSpan = height * 0.85; // the funnel reaches almost the full screen
        const killRadius = Math.max(10, height * 0.014);

        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];

          const dx = absorbX - p.x;
          const dy = p.y - absorbY;
          const dist = Math.hypot(dx, dy);

          // Funnel: gentle convergence low on screen, strong near the rim.
          const funnelT = clamp01(1 - p.y / funnelSpan);
          // Absorption: final shrink/fade in the last stretch to the point.
          const absorbT = clamp01(1 - dist / (height * 0.3));

          // Curve toward the center line, with a faint swirl so paths arc
          // instead of beelining. Kept loose so the stream stays spread out.
          // Drifting particles resist the funnel and wander instead, so the
          // outer field stays populated instead of emptying into the stream.
          const funnelPull = p.drift ? 0.22 : 1;
          p.speedX += dx * (0.00033 + funnelT * funnelT * 0.003) * frameScale * funnelPull;
          p.speedX += -dy * 0.00001 * funnelT * frameScale * funnelPull;
          p.speedX *= Math.pow(0.99, frameScale);
          p.speedX += (Math.random() - 0.5) * (p.drift ? 0.06 : 0.015) * frameScale;

          // Larger Library glyphs make room for foreground UI by drifting
          // toward the outer thirds. The center stream remains free to read.
          if (p.glyph && foregroundZones.length > 0) {
            const targetX = width * (p.outerLane === -1 ? 0.18 : 0.82);
            p.x += (targetX - p.x) * (1 - Math.pow(1 - 0.012, frameScale));
          }

          // Slight acceleration as the particle is drawn upward.
          p.y += p.speedY * (1 + funnelT * 0.55) * frameScale * speedScale;
          p.x += p.speedX * frameScale;

          p.opacity -= p.fadeSpeed * (1 + absorbT * 1.5) * frameScale;

          if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
            p.rotation += p.rotationSpeed * (1 + absorbT) * frameScale;
          }

          // Shrink and dissolve into the light.
          const absorbSquared = absorbT * absorbT;
          const scale = 1 - absorbT * Math.sqrt(absorbT) * 0.92;
          let foregroundCalm = 0;
          let streamBoost = 0;
          for (const zone of foregroundZones) {
            const outsideX = Math.max(zone.left - p.x, 0, p.x - zone.right);
            const outsideY = Math.max(zone.top - p.y, 0, p.y - zone.bottom);
            const distance = Math.hypot(outsideX, outsideY);
            const calm = distance === 0 ? 0.86 : clamp01(1 - distance / 120) * 0.86;
            foregroundCalm = Math.max(foregroundCalm, calm);

            if (p.y < zone.top || p.y > zone.bottom) {
              const streamHalfWidth = Math.max(
                80,
                Math.min(width * 0.2, (zone.right - zone.left) * 0.55),
              );
              const proximity = clamp01(
                1 - Math.abs(p.x - zone.centerX) / (streamHalfWidth * 1.75),
              );
              streamBoost = Math.max(streamBoost, proximity * 0.22);
            }
          }
          const alpha =
            p.opacity *
            (1 - absorbSquared * 0.85) *
            (1 - foregroundCalm) *
            (1 + streamBoost);

          if (p.opacity <= 0 || dist < killRadius || scale <= 0.06 || p.y < -20) {
            particles[i] = createParticle(false);
            continue;
          }

          const isGlyph = Boolean(p.glyph?.complete && p.glyph.naturalWidth > 0);
          const lowerFieldProgress = clamp01((p.y - height * 0.55) / (height * 0.45));
          const glyphBrightness = isGlyph ? 1 + lowerFieldProgress * 0.16 : 1;
          ctx.globalAlpha = clamp01(alpha * glyphBrightness);

          if (isGlyph && p.glyph) {
            ctx.save();
            ctx.translate(p.x, p.y);
            if (p.rotation !== undefined) ctx.rotate(p.rotation);
            const glyphSize = Math.max(22, p.size * 2.4) * scale;
            ctx.shadowBlur = glyphSize * (0.95 + absorbT * 1.25);
            ctx.shadowColor = glyphShadowColor;
            ctx.drawImage(p.glyph, -glyphSize / 2, -glyphSize / 2, glyphSize, glyphSize);
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = glyphTintColor;
            ctx.fillRect(-glyphSize / 2, -glyphSize / 2, glyphSize, glyphSize);
            ctx.restore();
          } else {
            const radius = p.size * 2 * scale;
            const blendStep = Math.min(
              DUST_BLEND_STEPS - 1,
              Math.round(absorbT * (DUST_BLEND_STEPS - 1)),
            );
            const sprite = dustSprites[p.colorIndex][blendStep];
            ctx.drawImage(sprite, p.x - radius, p.y - radius, radius * 2, radius * 2);
          }
        }

        ctx.globalAlpha = 1;
        animationId = requestAnimationFrame(animate);
      };

      animationId = requestAnimationFrame(animate);

      return () => {
        window.removeEventListener('resize', handleResize);
        cancelAnimationFrame(animationId);
      };
    }, [accent, foregroundPadding, foregroundSelector, speedScale, dispersion]);

    return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" />;
  },
);
