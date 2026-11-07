import type { ReactNode } from 'react';
import { CAPA_BLUEPRINT_SLOTS, SEN_BLUEPRINT_DEFAULT_SKILLS } from '@seihouse/sen/harness-generation';

const groupTitle = 'block font-sc text-xs font-semibold tracking-wide text-signal';
const groupHelp = 'block font-sans text-[11px] leading-relaxed text-neutral-400';

/**
 * Plugins: the CAPA skills the Novel Expanded engine runs on, split the way
 * the engine is (SENSEI, 2026-11-07). Writer comes first and open, since it is
 * the group readers change. The Blueprint's skills sit under Advanced: they
 * run once, before the story exists, and come from the host, not the story.
 * The Tagger joins Advanced once its prompt is split into CAPA skills.
 */
export function StorySeedPlugins({ writer }: { writer?: ReactNode }) {
  return <div className="space-y-4" data-testid="story-seed-plugins">
    {writer && <section aria-labelledby="plugins-writer" className="space-y-2">
      <h3 id="plugins-writer" className={groupTitle}>Writer</h3>
      <p className={groupHelp}>The skills every chapter is written with.</p>
      {writer}
    </section>}
    <details className="rounded-xl border border-neutral-800/80 bg-[#080b17]/80 p-3" data-testid="plugins-advanced">
      <summary className="story-seed-touch-target cursor-pointer font-sc text-xs font-semibold tracking-wide text-signal">Advanced</summary>
      <section aria-labelledby="plugins-blueprint" className="mt-3 space-y-2">
        <h3 id="plugins-blueprint" className={groupTitle}>Blueprint</h3>
        <p className={groupHelp}>The skills that build the World Blueprint before the story begins.</p>
        <ul className="space-y-2">
          {CAPA_BLUEPRINT_SLOTS.map(slot => {
            const skill = SEN_BLUEPRINT_DEFAULT_SKILLS.find(entry => entry.slot === slot.id);
            return <li key={slot.id} className="rounded border border-neutral-800 bg-black/40 p-2">
              <span className="block font-sans text-sm text-signal">{slot.label}{skill ? ` · ${skill.name} v${skill.version}` : ''}</span>
              <span className={groupHelp}>{slot.description}</span>
            </li>;
          })}
        </ul>
      </section>
    </details>
  </div>;
}
