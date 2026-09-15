import React from 'react';
import { Target, ShieldAlert } from 'lucide-react';
import type { IntakeData } from '../shared/referenceIntake';
import { FormSection, FormSectionId } from './FormSection';
import { getDialectLabel } from '../shared/dialect';

interface PlotControlFormProps {
  intake: IntakeData;
  updateIntake: (field: keyof IntakeData, value: any) => void;
  activeSection: FormSectionId;
  setActiveSection: (id: FormSectionId) => void;
}

export const PlotControlForm = ({ intake, updateIntake, activeSection, setActiveSection }: PlotControlFormProps) => {
  const handleFatePressureChange = (pressure: 'Relaxed' | 'Balanced' | 'Hardcore' | 'Dao Master') => {
    updateIntake('fatePressure', pressure);
    updateIntake('hardcoreFateMode', pressure === 'Hardcore' || pressure === 'Dao Master');
  };

  return (
    <FormSection id="plot" title="5. Plot & Trope Control" icon={<Target size={18} />} activeSection={activeSection} setActiveSection={setActiveSection}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
         <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-0.5" htmlFor="a11y-control-dsrko5x">{getDialectLabel('face_slapping', intake.genrePath)}</label>
          <p className="text-[9px] text-neutral-500 font-sans normal-case mb-1 leading-snug">How often arrogant rivals get publicly humbled.</p>
          <select value={intake.faceSlappingLevel || ''} onChange={e => updateIntake('faceSlappingLevel', e.target.value)} className="w-full bg-void border border-neutral-800 text-signal text-sm rounded px-2 py-1.5 focus:outline-none" id="a11y-control-dsrko5x">
            <option value="">AI Default</option><option value="High">High</option><option value="Moderate">Moderate</option><option value="Low">Low</option>
          </select>
        </div>
         <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-3wbtyld">Romance / Harem</label>
          <select value={intake.romanceLevel || ''} onChange={e => updateIntake('romanceLevel', e.target.value)} className="w-full bg-void border border-neutral-800 text-signal text-sm rounded px-2 py-1.5 focus:outline-none" id="a11y-control-3wbtyld">
            <option value="">AI Default</option><option value="None">None</option><option value="Single">Single Heroine/Hero</option><option value="Harem">Harem</option>
          </select>
        </div>
         <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-1" htmlFor="a11y-control-bgd1ldg">Pacing</label>
          <select value={intake.powerPace || ''} onChange={e => updateIntake('powerPace', e.target.value)} className="w-full bg-void border border-neutral-800 text-signal text-sm rounded px-2 py-1.5 focus:outline-none" id="a11y-control-bgd1ldg">
            <option value="">AI Default</option><option value="Fast">Fast</option><option value="Balanced">Balanced</option><option value="Slow">Slow</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-jolpc3b">Long-term Goal</label>
          <input type="text" value={intake.longTermGoal || ''} onChange={(e) => updateIntake('longTermGoal', e.target.value)} placeholder="e.g., Shatter the heavens..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-jolpc3b" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-6a6tmbf">First Major Conflict</label>
          <input type="text" value={intake.firstMajorConflict || ''} onChange={(e) => updateIntake('firstMajorConflict', e.target.value)} placeholder="e.g., Sect tournament, survival trial..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-6a6tmbf" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-morghmz">Things to Avoid</label>
          <input type="text" value={intake.thingsToAvoid || ''} onChange={(e) => updateIntake('thingsToAvoid', e.target.value)} placeholder="e.g., No young masters, no system cheat..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-morghmz" />
        </div>
        <div>
          <label className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2" htmlFor="a11y-control-hirbzji">Must Include Elements</label>
          <input type="text" value={intake.mustIncludeElements || ''} onChange={(e) => updateIntake('mustIncludeElements', e.target.value)} placeholder="e.g., Auction arc, pill refinement..." className="w-full bg-neutral-950 border border-neutral-800 text-signal text-sm rounded px-3 py-2" id="a11y-control-hirbzji" />
        </div>
      </div>
      <div className="pt-4 mt-4 border-t border-neutral-900/60">
        <span className="block font-sc text-xs text-neutral-400 uppercase tracking-widest mb-2 flex items-center space-x-2">
          <ShieldAlert size={14} className="text-human" />
          <span>{getDialectLabel('fate_pressure', intake.genrePath)}</span>
        </span>
        <p className="text-neutral-500 font-sans text-xs mb-3">
          Control how harsh the story consequences are — how actively the world fights back against the MC, increasing tragedy and betrayal risk.
        </p>
        <div className="flex flex-wrap gap-2">
          {(['Relaxed', 'Balanced', 'Hardcore', 'Dao Master'] as const).map(level => (
            <button
              key={level}
              type="button"
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => handleFatePressureChange(level)}
              className={`px-4 py-2 rounded text-xs font-sc uppercase tracking-widest font-bold transition-all ${
                intake.fatePressure === level
                  ? level === 'Dao Master' || level === 'Hardcore'
                    ? 'bg-human text-signal border-human shadow-[0_0_10px_rgba(139,0,0,0.4)]'
                    : 'bg-portal text-void border-portal shadow-[0_0_10px_rgba(4,172,255,0.4)]'
                  : 'bg-void text-neutral-500 border border-neutral-800 hover:border-neutral-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </FormSection>
  );
};
