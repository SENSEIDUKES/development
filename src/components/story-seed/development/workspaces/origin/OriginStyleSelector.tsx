import type { CSSProperties } from 'react';
import { Check, Flower2, MountainSnow, Scroll, Sparkle, type LucideIcon } from 'lucide-react';
import { STORY_STYLE_OPTIONS, type StoryStyle } from '../../../shared/storyStyle';
import { workspaceCompactLabelClass } from '../WorkspaceShell';
import { handleRadioGroupKeyDown, radioGroupTabIndex } from '../../radioGroupKeyboard';

const TRADITION_TABLET_ACCENT = '#A78BFA';
const STYLE_PRESENTATION: Record<StoryStyle, { icon: LucideIcon; tint: string }> = {
  chinese: { icon: Scroll, tint: '#8FA8D8' },
  korean: { icon: Flower2, tint: '#D49BA0' },
  japanese: { icon: MountainSnow, tint: '#9FBEA9' },
};

interface OriginStyleSelectorProps {
  selectedStyle?: StoryStyle;
  onSelect: (style: StoryStyle) => void;
}

export const OriginStyleSelector = ({ selectedStyle, onSelect }: OriginStyleSelectorProps) => (
  <section className="glass-panel p-4" aria-labelledby="origin-style-title">
    <div className="mb-3 flex items-center justify-between gap-3">
      <p id="origin-style-title" className={workspaceCompactLabelClass}>Style <span className="text-[#D9B36C]">*</span></p>
      <span className="flex items-center gap-1.5 font-sc text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
        Novel tradition<Sparkle size={9} aria-hidden="true" className="text-[#CDB271]/70" />
      </span>
    </div>
    <div role="radiogroup" aria-label="Novel tradition" id="story-style-options" className="grid grid-cols-3 gap-2">
      {STORY_STYLE_OPTIONS.map((option, index) => {
        const selected = selectedStyle === option.value;
        const { icon: Icon, tint } = STYLE_PRESENTATION[option.value];
        return (
          <button key={option.value} type="button" role="radio" aria-checked={selected} id={`story-style-${option.value}`}
            tabIndex={radioGroupTabIndex(selected, Boolean(selectedStyle), index)}
            onClick={() => onSelect(option.value)} onKeyDown={handleRadioGroupKeyDown} data-selected={selected}
            style={{ '--choice-accent': TRADITION_TABLET_ACCENT } as CSSProperties}
            className="glass-choice flex min-h-[4.4rem] flex-col items-center justify-center gap-1.5 px-2 py-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-full border transition-all"
              style={selected
                ? { borderColor: `${tint}8C`, backgroundColor: `${tint}1F`, boxShadow: `0 0 12px ${tint}47` }
                : { borderColor: `${tint}40`, backgroundColor: 'rgba(11, 14, 30, 0.6)' }}
            >
              <Icon size={15} style={{ color: tint }} />
            </span>
            <span className={`flex items-center gap-1 font-sc text-[10px] font-bold uppercase tracking-[0.1em] ${selected ? 'text-signal' : 'text-neutral-300'}`}>
              {selected && <Check size={11} aria-hidden="true" style={{ color: tint }} />}{option.label}
            </span>
          </button>
        );
      })}
    </div>
  </section>
);
