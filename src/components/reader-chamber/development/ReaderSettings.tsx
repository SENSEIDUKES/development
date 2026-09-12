import React, { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BookOpen,
  Check,
  ChevronDown,
  Eye,
  ListOrdered,
  Palette,
  Play,
  RotateCcw,
  SlidersHorizontal as Sliders,
  Sparkle,
  Sparkles,
  Type,
  Volume2,
} from 'lucide-react';
import { ReaderChapter, ReaderPreferences } from '../shared/types';
import { getReaderTypography } from '../shared/readerTypography';
import { AudioMenu } from './ReaderControls/AudioMenu';
import { AudioSettings, ImmersionPreferences } from './ReaderControls/types';
import { SENSettingsIcon } from '../../sen-icons';

const FONT_OPTIONS = [
  { value: 'serif', label: 'Literata (Serif)' },
  { value: 'sans', label: 'Rubik (Sans)' },
  { value: 'mono', label: 'System Mono' },
] as const;

const SIZE_OPTIONS = ['xs', 'sm', 'base', 'lg', 'xl'] as const;
const THEME_OPTIONS = ['void', 'crimson', 'abyss', 'sepia', 'emerald'] as const;
const HIGHLIGHT_OPTIONS = [
  { value: 'full', label: 'Full Block' },
  { value: 'underline', label: 'Underline' },
  { value: 'tint', label: 'Soft Tint' },
] as const;

const PLAYER_STYLE_OPTIONS = [
  { value: 'vinyl', label: 'Classic Vinyl' },
  { value: 'minimal', label: 'Minimal Core' },
  { value: 'ethereal', label: 'Ethereal Pulse' },
] as const;

const PARTICLE_INTENSITY_OPTIONS = [
  { value: 'off', label: 'Off' },
  { value: 'low', label: 'Low' },
  { value: 'default', label: 'Default' },
  { value: 'high', label: 'High' },
] as const;

const DIVIDER_STYLE_OPTIONS = [
  { value: 'default', label: 'Classic Minimal' },
  { value: 'celestial', label: 'Celestial Crest' },
  { value: 'sword_qi', label: 'Sword Qi Horizon' },
  { value: 'lotus_path', label: 'Lotus Serenity' },
] as const;

type NumericTypographyPreference =
  | 'lineHeightScale'
  | 'paragraphSpacingScale'
  | 'letterSpacing'
  | 'wordSpacing'
  | 'readingWidth';

const TYPOGRAPHY_CONTROLS: Array<{
  key: NumericTypographyPreference;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}> = [
  { key: 'lineHeightScale', label: 'Line height', min: 1.45, max: 1.9, step: 0.01, format: value => value.toFixed(2) },
  { key: 'paragraphSpacingScale', label: 'Paragraph gap', min: 0.5, max: 2.5, step: 0.05, format: value => `${value.toFixed(2)}em` },
  { key: 'letterSpacing', label: 'Letter spacing', min: -0.03, max: 0.08, step: 0.005, format: value => `${value.toFixed(3)}em` },
  { key: 'wordSpacing', label: 'Word spacing', min: -0.04, max: 0.08, step: 0.005, format: value => `${value.toFixed(3)}em` },
  { key: 'readingWidth', label: 'Reading width', min: 44, max: 76, step: 1, format: value => `${value}ch` },
];

const choiceClass = (active: boolean) =>
  `flex min-h-9 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-[10px] font-mono uppercase tracking-[0.12em] transition-all ${
    active
      ? 'border-portal bg-portal/10 text-portal shadow-[inset_0_0_18px_rgba(4,172,255,0.05)]'
      : 'border-neutral-800 bg-black/25 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
  }`;

const shouldExpandByDefault = () =>
  typeof window === 'undefined'
  || typeof window.matchMedia !== 'function'
  || !window.matchMedia('(max-width: 767px)').matches;

interface PreferenceGroupProps {
  label: string;
  icon: React.ReactNode;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function PreferenceGroup({ label, icon, summary, defaultOpen, children }: PreferenceGroupProps) {
  const contentId = useId();
  const [isOpen, setIsOpen] = useState(() => defaultOpen ?? shouldExpandByDefault());

  return (
    <section>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen(open => !open)}
        className="flex min-h-9 w-full items-center gap-2 rounded-md text-left text-[10px] font-sans font-medium uppercase tracking-[0.16em] text-neutral-400 transition-colors hover:text-neutral-100"
      >
        <span className="text-portal/80">{icon}</span>
        <span>{label}</span>
        {summary ? (
          <span className="ml-auto max-w-[45%] truncate font-mono text-[9px] normal-case tracking-normal text-neutral-600">
            {summary}
          </span>
        ) : <span className="ml-auto" />}
        <ChevronDown size={14} className={`shrink-0 text-neutral-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            id={contentId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2.5">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

interface TypographySliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  displayValue: string;
  onChange: (value: number) => void;
}

function TypographySlider({ label, min, max, step, value, displayValue, onChange }: TypographySliderProps) {
  return (
    <label className="grid gap-2 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-400">
      <span>{label}</span>
      <span className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={event => onChange(Number(event.target.value))}
          className="w-full min-w-0 cursor-pointer accent-portal"
        />
        <output className="text-right font-mono text-[10px] normal-case tracking-normal text-neutral-500">
          {displayValue}
        </output>
      </span>
    </label>
  );
}

function SettingsSectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-neutral-800/80 pb-2.5">
      <span className="text-portal">{icon}</span>
      <h4 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-200">
        {label}
      </h4>
    </div>
  );
}

interface ReaderSectionProps {
  currentPrefs: ReaderPreferences;
  handleUpdatePreference: <K extends keyof ReaderPreferences>(key: K, value: ReaderPreferences[K]) => void;
  onResetTypography: () => void;
  showLegend?: boolean;
  onToggleLegend?: () => void;
}

/** Reader appearance and reading controls (formerly ReaderPreferencesPanel). */
function ReaderSection({
  currentPrefs,
  handleUpdatePreference,
  onResetTypography,
  showLegend,
  onToggleLegend,
}: ReaderSectionProps) {
  const typography = getReaderTypography(currentPrefs);
  const [showTypographySettings, setShowTypographySettings] = useState(shouldExpandByDefault);

  const handleTypographyChange = (key: NumericTypographyPreference, value: number) => {
    handleUpdatePreference(key, value);
  };

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(190px,0.8fr)_minmax(190px,0.8fr)_minmax(0,2.6fr)]">
      <section className="space-y-6 rounded-xl border border-neutral-800 bg-[#070a0d]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
        <PreferenceGroup
          label="Aura Font"
          icon={<Type size={13} />}
          summary={FONT_OPTIONS.find(option => option.value === currentPrefs.fontFamily)?.label}
        >
          <div className="grid gap-1.5">
            {FONT_OPTIONS.map(option => (
              <button key={option.value} type="button" onClick={() => handleUpdatePreference('fontFamily', option.value)} className={choiceClass(currentPrefs.fontFamily === option.value)}>
                <span>{option.label}</span>
                {currentPrefs.fontFamily === option.value ? <Check size={12} /> : null}
              </button>
            ))}
          </div>
        </PreferenceGroup>

        <PreferenceGroup label="Atmospheric Hue" icon={<Palette size={13} />} summary={currentPrefs.themeOverride || 'void'}>
          <div className="grid gap-1.5">
            {THEME_OPTIONS.map(theme => (
              <button key={theme} type="button" onClick={() => handleUpdatePreference('themeOverride', theme)} className={choiceClass((currentPrefs.themeOverride || 'void') === theme)}>
                <span>{theme}</span>
                {(currentPrefs.themeOverride || 'void') === theme ? <Check size={12} /> : null}
              </button>
            ))}
          </div>
        </PreferenceGroup>

        <PreferenceGroup
          label="Atmospheric Particles"
          icon={<Sparkles size={13} />}
          summary={PARTICLE_INTENSITY_OPTIONS.find(option => option.value === (currentPrefs.particleIntensity || 'default'))?.label}
        >
          <div className="grid gap-1.5">
            {PARTICLE_INTENSITY_OPTIONS.map(option => (
              <button key={option.value} type="button" onClick={() => handleUpdatePreference('particleIntensity', option.value)} className={choiceClass((currentPrefs.particleIntensity || 'default') === option.value)}>
                <span>{option.label}</span>
                {(currentPrefs.particleIntensity || 'default') === option.value ? <Check size={12} /> : null}
              </button>
            ))}
          </div>
        </PreferenceGroup>

        <PreferenceGroup
          label="Chapter Divider"
          icon={<Sparkle size={13} />}
          summary={DIVIDER_STYLE_OPTIONS.find(option => option.value === (currentPrefs.dividerStyle || 'default'))?.label}
        >
          <div className="grid gap-1.5">
            {DIVIDER_STYLE_OPTIONS.map(option => (
              <button key={option.value} type="button" onClick={() => handleUpdatePreference('dividerStyle', option.value)} className={choiceClass((currentPrefs.dividerStyle || 'default') === option.value)}>
                <span>{option.label}</span>
                {(currentPrefs.dividerStyle || 'default') === option.value ? <Check size={12} /> : null}
              </button>
            ))}
          </div>
        </PreferenceGroup>
      </section>

      <section className="space-y-6 rounded-xl border border-neutral-800 bg-[#070a0d]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)]">
        <PreferenceGroup label="Visual Scale" icon={<Sliders size={13} />} summary={currentPrefs.fontSize.toUpperCase()}>
          <div className="grid gap-1.5">
            {SIZE_OPTIONS.map(size => (
              <button key={size} type="button" onClick={() => handleUpdatePreference('fontSize', size)} className={choiceClass(currentPrefs.fontSize === size)}>
                <span>{size}</span>
                {currentPrefs.fontSize === size ? <Check size={12} /> : null}
              </button>
            ))}
          </div>
        </PreferenceGroup>

        <PreferenceGroup
          label="Visual Highlights"
          icon={<Eye size={13} />}
          summary={HIGHLIGHT_OPTIONS.find(option => option.value === (currentPrefs.highlightStyle || 'full'))?.label}
        >
          <div className="grid gap-1.5">
            {HIGHLIGHT_OPTIONS.map(option => (
              <button key={option.value} type="button" onClick={() => handleUpdatePreference('highlightStyle', option.value)} className={choiceClass((currentPrefs.highlightStyle || 'full') === option.value)}>
                <span>{option.label}</span>
                {(currentPrefs.highlightStyle || 'full') === option.value ? <Check size={12} /> : null}
              </button>
            ))}
          </div>
        </PreferenceGroup>

        <PreferenceGroup
          label="Audio Player Style"
          icon={<Play size={13} />}
          summary={PLAYER_STYLE_OPTIONS.find(option => option.value === (currentPrefs.playerStyle || 'vinyl'))?.label}
        >
          <div className="grid gap-1.5">
            {PLAYER_STYLE_OPTIONS.map(option => (
              <button key={option.value} type="button" onClick={() => handleUpdatePreference('playerStyle', option.value)} className={choiceClass((currentPrefs.playerStyle || 'vinyl') === option.value)}>
                <span>{option.label}</span>
                {(currentPrefs.playerStyle || 'vinyl') === option.value ? <Check size={12} /> : null}
              </button>
            ))}
          </div>
        </PreferenceGroup>

        {onToggleLegend ? (
          <button type="button" onClick={onToggleLegend} className={choiceClass(Boolean(showLegend))}>
            <span>System Color Legend</span>
            <span>{showLegend ? 'On' : 'Off'}</span>
          </button>
        ) : null}
      </section>

      <section className="rounded-xl border border-neutral-700/80 bg-[#070a0d]/85 p-5 shadow-[0_12px_50px_rgba(0,0,0,0.24)] sm:p-6">
        <div className={`flex items-center justify-between gap-4 ${showTypographySettings ? 'mb-7' : ''}`}>
          <button
            type="button"
            aria-expanded={showTypographySettings}
            aria-controls="reader-typography-settings"
            onClick={() => setShowTypographySettings(open => !open)}
            className="flex min-h-9 min-w-0 flex-1 items-center gap-2.5 text-left text-portal"
          >
            <Eye size={16} />
            <h4 className="font-sans text-[11px] font-semibold uppercase tracking-[0.17em]">Visual &amp; Text Settings</h4>
            <span className="ml-auto hidden truncate font-mono text-[9px] normal-case tracking-normal text-neutral-600 sm:block">
              {typography.lineHeightScale.toFixed(2)} line · {typography.readingWidth}ch
            </span>
            <ChevronDown size={15} className={`shrink-0 text-neutral-600 transition-transform ${showTypographySettings ? 'rotate-180' : ''}`} />
          </button>
          <button type="button" onClick={onResetTypography} className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-[9px] font-mono uppercase tracking-[0.12em] text-neutral-400 transition-colors hover:border-neutral-700 hover:text-neutral-100">
            <RotateCcw size={12} />
            Reset Text
          </button>
        </div>

        <AnimatePresence initial={false}>
          {showTypographySettings ? (
            <motion.div
              id="reader-typography-settings"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
                {TYPOGRAPHY_CONTROLS.map(control => {
                  const value = typography[control.key];
                  return (
                    <TypographySlider
                      key={control.key}
                      label={control.label}
                      min={control.min}
                      max={control.max}
                      step={control.step}
                      value={value}
                      displayValue={control.format(value)}
                      onChange={nextValue => handleTypographyChange(control.key, nextValue)}
                    />
                  );
                })}

                <div className="grid gap-2 text-[10px] font-sans uppercase tracking-[0.14em] text-neutral-400">
                  <span>Text alignment</span>
                  <div className="grid max-w-xs grid-cols-2 gap-2">
                    {(['start', 'justify'] as const).map(alignment => (
                      <button key={alignment} type="button" onClick={() => handleUpdatePreference('textAlignment', alignment)} className={choiceClass(typography.textAlignment === alignment)}>
                        <span>{alignment}</span>
                        {typography.textAlignment === alignment ? <Check size={12} /> : null}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>
    </div>
  );
}

interface ChapterSectionProps {
  chapters: ReaderChapter[];
  selectedChapter: ReaderChapter;
  selectedChapterNum: number;
  onSelectChapter: (num: number) => void;
  onToggleRead: (chapterNumber: number) => void;
}

/** Chapter navigation and read-state controls, moved out of the header. */
function ChapterSection({
  chapters,
  selectedChapter,
  selectedChapterNum,
  onSelectChapter,
  onToggleRead,
}: ChapterSectionProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={selectedChapterNum}
        onChange={(e) => onSelectChapter(parseInt(e.target.value))}
        aria-label="Select Chapter"
        className="rounded border border-neutral-800 bg-void py-1 px-3 font-sans text-xs text-neutral-400 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-portal/70"
      >
        {chapters.map((ch) => (
          <option key={ch.number} value={ch.number}>
            Ch. {ch.number}: {ch.title.substring(0, 20)}...{ch.hasContinuityFaults ? " ⚠️" : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onToggleRead(selectedChapter.number)}
        className={`flex items-center gap-2 rounded border px-3 py-1.5 text-[10px] font-sans transition-all ${
          selectedChapter.status === 'read'
            ? 'border-gold-accent bg-gold-accent/10 text-gold-accent'
            : 'border-neutral-800 text-neutral-400 hover:text-signal hover:bg-neutral-900'
        }`}
        title={selectedChapter.status === 'read' ? 'Mark Chapter as Unread' : 'Mark Chapter as Finished & Read'}
        aria-label={selectedChapter.status === 'read' ? 'Mark Chapter as Unread' : 'Mark Chapter as Finished & Read'}
      >
        <Check size={12} />
        {selectedChapter.status === 'read' ? 'Read' : 'Mark as Read'}
      </button>
    </div>
  );
}

/** All audio controls in one place: mix, voices, playback, and export. */
function AudioSection({ audio, onExportText }: { audio: AudioSettings; onExportText: () => void }) {
  return (
    <div className="space-y-5">
      <AudioMenu idSuffix="reader-settings" />

      <PreferenceGroup
        label="Voice Matrix Signature"
        icon={<Volume2 size={13} />}
        summary="Narrator & character voices"
        defaultOpen={false}
      >
        <div className="space-y-2 text-neutral-400">
          <div>
            <label className="mb-1 block text-[8px] text-neutral-500" htmlFor="reader-settings-narrator-voice">
              Narrator Voice
            </label>
            <select
              id="reader-settings-narrator-voice"
              value={audio.selectedVoiceURI}
              onChange={(e) => audio.setSelectedVoiceURI(e.target.value)}
              className="w-full rounded border border-neutral-850 bg-void p-1 text-[10px] focus:border-portal focus:outline-none"
            >
              {audio.availableVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[8px] text-neutral-500" htmlFor="reader-settings-dialogue-voice">
              Protagonist Voice
            </label>
            <select
              id="reader-settings-dialogue-voice"
              value={audio.selectedDialogueVoiceURI}
              onChange={(e) => audio.setSelectedDialogueVoiceURI(e.target.value)}
              className="w-full rounded border border-neutral-850 bg-void p-1 text-[10px] focus:border-portal focus:outline-none"
            >
              {audio.availableVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[8px] text-neutral-500" htmlFor="reader-settings-side-voice">
              Side Character Voice
            </label>
            <select
              id="reader-settings-side-voice"
              value={audio.selectedSideVoiceURI}
              onChange={(e) => audio.setSelectedSideVoiceURI(e.target.value)}
              className="w-full rounded border border-neutral-850 bg-void p-1 text-[10px] focus:border-portal focus:outline-none"
            >
              {audio.availableVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </PreferenceGroup>

      <div className="space-y-3 border-t border-neutral-900 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-neutral-300">
              Playback Speed
            </span>
            <span className="text-[8px] text-neutral-500">
              Adjust recitation rate
            </span>
          </div>
          <button
            onClick={() => audio.setSpeechRate((prev) => (prev >= 2 ? 0.5 : prev + 0.5))}
            className="rounded border border-neutral-800 bg-void px-3 py-1.5 font-mono text-[10px] text-neutral-400 hover:text-signal focus:outline-none"
          >
            {audio.speechRate.toFixed(1)}x
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-neutral-300">
              Export Chronicle
            </span>
            <span className="text-[8px] text-neutral-500">
              Download chapter as text
            </span>
          </div>
          <button
            onClick={onExportText}
            className="rounded border border-neutral-800 bg-void px-3 py-1.5 font-sc text-[9px] uppercase text-neutral-400 hover:text-signal focus:outline-none"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}

/** Immersion Engine master switch and its reading-effect toggles. */
function ImmersionSection({ immersion, setImmersion }: ImmersionPreferences) {
  return (
    <div className="space-y-3.5">
      {/* Master Switch on Top */}
      <div className="flex items-center justify-between rounded-lg border border-neutral-900 bg-neutral-950/85 p-2">
        <div className="flex flex-col">
          <span className="font-sans text-[11px] font-medium text-[#FAFAFA]">
            Immersion Engine
          </span>
          <span className="font-sans text-[9px] text-neutral-500">
            Master on/off for the reading effects below.
          </span>
        </div>
        <button onClick={() => setImmersion({ master: !immersion.master })}
          role="switch"
          aria-checked={immersion.master}
          aria-label="Toggle Master Immersion"
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            immersion.master ? "bg-portal/80 shadow-[0_0_8px_rgba(4,172,255,0.4)]" : "bg-neutral-850"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-void shadow transition duration-200 ease-in-out ${
              immersion.master ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
            }`}
          />
        </button>
      </div>

      {/* Sub-toggles */}
      <div className={`space-y-3 pl-1 transition-opacity duration-200 ${immersion.master ? "opacity-100" : "opacity-40 pointer-events-none"}`}>

        {/* Auto-scroll */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-neutral-300">
              Autonomous Reading
            </span>
            <span className="text-[8px] text-neutral-500">
              Pages follow reading playhead
            </span>
          </div>
          <button onClick={() => immersion.master && setImmersion({ autoScroll: !immersion.autoScroll })}
            disabled={!immersion.master}
            role="switch"
            aria-checked={immersion.autoScroll}
            aria-label="Toggle Auto Scroll"
            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
              immersion.autoScroll ? "bg-portal/60" : "bg-neutral-850"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                immersion.autoScroll ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
              }`}
            />
          </button>
        </div>

        {/* Image popups */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-neutral-300">
              Holographic Visions
            </span>
            <span className="text-[8px] text-neutral-500">
              Automatic scenic image pop-ups
            </span>
          </div>
          <button onClick={() => immersion.master && setImmersion({ imagePopups: !immersion.imagePopups })}
            disabled={!immersion.master}
            role="switch"
            aria-checked={immersion.imagePopups}
            aria-label="Toggle Image Popups"
            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-150 ease-in-out focus:outline-none ${
              immersion.imagePopups ? "bg-portal/60" : "bg-neutral-850"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-void shadow transition duration-150 ease-in-out ${
                immersion.imagePopups ? "translate-x-4 bg-signal" : "translate-x-0 bg-neutral-500"
              }`}
            />
          </button>
        </div>

      </div>
    </div>
  );
}

interface ReaderSettingsProps {
  currentPrefs: ReaderPreferences;
  handleUpdatePreference: <K extends keyof ReaderPreferences>(key: K, value: ReaderPreferences[K]) => void;
  onResetTypography: () => void;
  showLegend?: boolean;
  onToggleLegend?: () => void;
  audio: AudioSettings;
  immersion: ImmersionPreferences;
  onExportText: () => void;
  chapters: ReaderChapter[];
  selectedChapter: ReaderChapter;
  selectedChapterNum: number;
  onSelectChapter: (num: number) => void;
  onToggleRead: (chapterNumber: number) => void;
  /** Called when the panel's open animation completes (anchor scrolling hook). */
  onReveal?: () => void;
}

/**
 * The single Reader Settings menu: every reader control lives here under
 * labeled sections (Chapter / Reader / Audio / Immersion). The header
 * Settings button opens this panel, and the header Audio button opens it
 * scrolled to the Audio section.
 */
export const ReaderSettings: React.FC<ReaderSettingsProps> = ({
  currentPrefs,
  handleUpdatePreference,
  onResetTypography,
  showLegend,
  onToggleLegend,
  audio,
  immersion,
  onExportText,
  chapters,
  selectedChapter,
  selectedChapterNum,
  onSelectChapter,
  onToggleRead,
  onReveal,
}) => {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      onAnimationComplete={onReveal}
      className="relative overflow-hidden border-b border-neutral-800 bg-[#050709]/95 px-4 py-5 sm:px-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_0%,rgba(4,172,255,0.06),transparent_38%)]" />
      <div className="relative mx-auto max-w-[1480px] space-y-5">
        <div className="flex items-center gap-3 border-b border-neutral-800/80 pb-4">
          <SENSettingsIcon size={18} className="text-portal" />
          <h3 className="font-sans text-sm font-medium uppercase tracking-[0.2em] text-neutral-100 sm:text-base">
            Reader Settings
          </h3>
        </div>

        <div className="max-h-[72dvh] space-y-6 overflow-y-auto pr-1">
          <section className="space-y-4 rounded-xl border border-neutral-800 bg-[#070a0d]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)] sm:p-5">
            <SettingsSectionLabel icon={<ListOrdered size={14} />} label="Chapter" />
            <ChapterSection
              chapters={chapters}
              selectedChapter={selectedChapter}
              selectedChapterNum={selectedChapterNum}
              onSelectChapter={onSelectChapter}
              onToggleRead={onToggleRead}
            />
          </section>

          <section className="space-y-4">
            <SettingsSectionLabel icon={<BookOpen size={14} />} label="Reader" />
            <ReaderSection
              currentPrefs={currentPrefs}
              handleUpdatePreference={handleUpdatePreference}
              onResetTypography={onResetTypography}
              showLegend={showLegend}
              onToggleLegend={onToggleLegend}
            />
          </section>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <section id="reader-settings-audio" className="space-y-4 rounded-xl border border-neutral-800 bg-[#070a0d]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)] sm:p-5">
              <SettingsSectionLabel icon={<Volume2 size={14} />} label="Audio" />
              <AudioSection audio={audio} onExportText={onExportText} />
            </section>

            <section className="space-y-4 rounded-xl border border-neutral-800 bg-[#070a0d]/80 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.2)] sm:p-5">
              <SettingsSectionLabel icon={<Sparkles size={14} />} label="Immersion" />
              <ImmersionSection immersion={immersion.immersion} setImmersion={immersion.setImmersion} />
            </section>
          </div>
        </div>

      </div>
    </motion.div>
  );
};
