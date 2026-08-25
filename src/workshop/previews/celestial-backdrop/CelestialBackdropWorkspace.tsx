import { useState, type CSSProperties } from 'react';
import { ParticleEffect } from '@seihouse/sen/ui';
import { FeatureWorkspace } from '../../FeatureWorkspace';
import { workshopEntries } from '../../manifest';

/**
 * No Development fork has diverged from the Original Reference yet - both
 * views render the same ParticleEffect. This is the expected starting state
 * for a feature workspace: Development begins as an exact copy of Reference
 * until a redesign task actually changes it.
 */
interface BackdropDemoProps {
  accent: string;
  speedScale: number;
  dispersion: number;
}

function BackdropDemo({ accent, speedScale, dispersion }: BackdropDemoProps) {
  const previewStyle = { '--celestial-accent': accent } as CSSProperties;

  return (
    <main className="preview-stage-embedded" style={previewStyle}>
      <div className="ambient-glow ambient-glow-gold" />
      <div className="ambient-glow ambient-glow-blue" />
      <ParticleEffect accent={accent} speedScale={speedScale} dispersion={dispersion} />
      <section className="preview-relic" data-celestial-foreground>
        <p className="preview-relic-eyebrow">Workshop Preview</p>
        <h1>Foreground Content</h1>
        <p className="preview-relic-copy">
          This placeholder proves the backdrop can remain active without competing with the real component placed above it.
        </p>
      </section>
    </main>
  );
}

export function CelestialBackdropWorkspace() {
  const entry = workshopEntries.find((e) => e.id === 'celestial-backdrop')!;
  const [accent, setAccent] = useState('#f5b942');
  // Veil tuning from the Chapter Generation Manifestation dev
  // (AILoadingVeil passes speedScale 0.47 / dispersion 0.96).
  const [speedScale, setSpeedScale] = useState(0.47);
  const [dispersion, setDispersion] = useState(0.96);

  const demoProps = { accent, speedScale, dispersion };

  return (
    <FeatureWorkspace
      entry={entry}
      workshopControls={{
        defaultSection: 'effects',
        description: 'Tune the preview-only particle field without placing Workshop UI over the foreground sample.',
        sections: [
          {
            id: 'effects',
            content: (
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/65">
                  <span>Backdrop accent</span>
                  <input
                    aria-label="Backdrop accent"
                    type="color"
                    value={accent}
                    onInput={event => setAccent(event.currentTarget.value)}
                    onChange={event => setAccent(event.target.value)}
                    className="h-8 w-10 cursor-pointer rounded-lg border border-white/15 bg-transparent p-0.5"
                  />
                </label>
                <label className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/65">
                  <span className="mb-2 block">Speed x{speedScale.toFixed(2)}</span>
                  <input
                    aria-label="Backdrop speed scale"
                    type="range"
                    min={0.2}
                    max={2}
                    step={0.01}
                    value={speedScale}
                    onInput={event => setSpeedScale(Number(event.currentTarget.value))}
                    onChange={event => setSpeedScale(Number(event.target.value))}
                    className="w-full accent-cyan-300"
                  />
                </label>
                <label className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/65">
                  <span className="mb-2 block">Dispersion x{dispersion.toFixed(2)}</span>
                  <input
                    aria-label="Backdrop dispersion"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={dispersion}
                    onInput={event => setDispersion(Number(event.currentTarget.value))}
                    onChange={event => setDispersion(Number(event.target.value))}
                    className="w-full accent-cyan-300"
                  />
                </label>
              </div>
            ),
          },
        ],
      }}
      renderReference={() => <BackdropDemo {...demoProps} />}
      renderDevelopment={() => <BackdropDemo {...demoProps} />}
    />
  );
}

export default CelestialBackdropWorkspace;
