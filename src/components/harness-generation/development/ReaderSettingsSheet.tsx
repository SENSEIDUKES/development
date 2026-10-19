import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react';
import { useReaderMixerState, type ReaderMixer } from '@seihouse/audio-player';
import { SEITabs, SEITabsList, SEITabsTrigger, SEITabsPanel } from '@seihouse/ui';
import { Play, RotateCcw, X } from 'lucide-react';
import {
  DEFAULT_READER_FONTS, DEFAULT_READER_TEXT_SETTINGS, READ_ALOUD_RATES, READ_ALOUD_ROLES, READER_LINE_SPACINGS, READER_TEXT_SIZES, READER_TEXT_WEIGHTS, resolveReaderText,
  type ReadAloud, type ReadAloudRole, type ReadAloudVoice, type ReaderFonts, type ReaderTextSettings, type SoundtrackChoice,
} from '@seihouse/sen/reader-runtime';
import type { SceneAudioTrack } from '@seihouse/sen/audio';
import { getSenLanguageLabel, normalizeSenLanguageCode } from '../../../lib/language';
import { ReaderPanel } from './ReaderPanel';
import { SoundtrackChoicePanel } from './SoundtrackChoicePanel';
import './ReaderSettingsSheet.css';

const legend = 'reader-settings-label';
const pillChoice = 'reader-settings-choice';

const ROLE_TITLES: Record<ReadAloudRole, string> = { narrator: 'Narrator', protagonist: 'Protagonist', side: 'Side characters' };
const ROLE_HELP: Record<ReadAloudRole, string> = {
  narrator: 'Reads the story itself.',
  protagonist: 'The base for the main character\'s voice.',
  side: 'The base for everyone else\'s voices.',
};

/** A language's own name, without the native script in brackets ("Korean (한국어)" → "Korean"). */
const plainLanguage = (language: string) => getSenLanguageLabel(normalizeSenLanguageCode(language)).replace(/\s*\(.*\)$/u, '');
const voiceLabel = (voice: ReadAloudVoice) => `${voice.name} (${voice.lang})${voice.localService === false ? ' · online' : ''}`;

function VoicePicker({ role, readAloud, language }: { role: ReadAloudRole; readAloud: ReadAloud; language: string }) {
  const id = `reader-voice-${role}`;
  const chosen = readAloud.choice[role]?.voiceURI ?? '';
  const own = new Set(readAloud.languageVoices.map(voice => voice.voiceURI));
  const others = readAloud.voices.filter(voice => !own.has(voice.voiceURI));
  return <div className="reader-settings-voice">
    <label htmlFor={id} className={legend}>{ROLE_TITLES[role]}</label>
    <div className="mt-1 flex items-center gap-2">
      <select id={id} value={chosen} data-voice-role={role}
        onChange={event => readAloud.setVoice(role, readAloud.voices.find(voice => voice.voiceURI === event.target.value))}
        className="reader-settings-select min-w-0 flex-1">
        {!chosen && <option value="">{`The device's ${plainLanguage(language)} voice`}</option>}
        {readAloud.languageVoices.length > 0 && <optgroup label={`${plainLanguage(language)} voices`}>
          {readAloud.languageVoices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voiceLabel(voice)}</option>)}
        </optgroup>}
        {others.length > 0 && <optgroup label="Other voices">
          {others.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voiceLabel(voice)}</option>)}
        </optgroup>}
      </select>
      <button type="button" aria-label={`Preview the ${ROLE_TITLES[role]} voice`} title="Preview" onClick={() => readAloud.preview(role)}
        className="reader-settings-icon">
        <Play className="h-4 w-4" aria-hidden />
      </button>
    </div>
    <p className="reader-settings-help mt-1">{ROLE_HELP[role]}</p>
  </div>;
}

/** Grouped radio choices, optionally demonstrating a font, size or weight. */
function PillChoice<Value extends string | number>({ title, name, value, options, onChange }: {
  title: string; name: string; value: Value;
  options: readonly { value: Value; label: string; display?: string; style?: CSSProperties }[];
  onChange: (value: Value) => void;
}) {
  return <fieldset className="reader-settings-field" data-control={name}>
    <legend className={legend}>{title}</legend>
    <div className="reader-settings-options">
      {options.map(option => <label key={String(option.value)} className="min-w-0 cursor-pointer">
        <input type="radio" name={name} value={String(option.value)} checked={value === option.value} onChange={() => onChange(option.value)} className="peer sr-only" />
        <span className={pillChoice} style={option.style}>
          {option.display ? <><span aria-hidden>{option.display}</span><span className="sr-only">{option.label}</span></> : option.label}
        </span>
      </label>)}
    </div>
  </fieldset>;
}

/** The chapter itself previews these settings, including beside the half-height sheet. */
function TextSettings({ settings, fonts, onChange }: { settings: ReaderTextSettings; fonts: ReaderFonts; onChange: (next: ReaderTextSettings) => void }) {
  const resolved = resolveReaderText(settings, fonts);
  // The same lists `resolveReaderText` falls back to, so an empty host list still offers SEN's own.
  const textFonts = fonts.text.length ? fonts.text : DEFAULT_READER_FONTS.text;
  const titleFonts = fonts.titles.length ? fonts.titles : DEFAULT_READER_FONTS.titles;
  const change = (patch: Partial<ReaderTextSettings>) => onChange({ ...settings, ...patch });
  return <section aria-labelledby="reader-settings-text" data-testid="reader-settings-text">
    <h3 id="reader-settings-text" className="sr-only">Text</h3>
    <div className="reader-settings-group">
    <PillChoice title="Font" name="reader-text-font" value={resolved.font.id} onChange={font => change({ font })}
      options={textFonts.map(choice => ({ value: choice.id, label: choice.label }))} />
    {titleFonts.length > 1 && <PillChoice title="Title font" name="reader-title-font" value={resolved.titleFont.id} onChange={titleFont => change({ titleFont })}
      options={titleFonts.map(choice => ({ value: choice.id, label: choice.label }))} />}
    </div>
    <div className="reader-settings-group">
    <PillChoice title="Size" name="reader-text-size" value={settings.size} onChange={size => change({ size })}
      options={READER_TEXT_SIZES.map((step, index) => ({ value: step.id, label: step.label, display: 'A', style: { fontSize: `${0.8 + index * 0.15}rem` } }))} />
    <PillChoice title="Line spacing" name="reader-line-spacing" value={settings.lineSpacing} onChange={lineSpacing => change({ lineSpacing })}
      options={READER_LINE_SPACINGS.map(step => ({ value: step.id, label: step.label }))} />
    <PillChoice title="Weight" name="reader-text-weight" value={settings.weight} onChange={weight => change({ weight })}
      options={READER_TEXT_WEIGHTS.map(step => ({ value: step.id, label: step.label, style: { fontFamily: resolved.font.family, fontWeight: step.id, fontSynthesis: 'none' } }))} />
    </div>
    <button type="button" onClick={() => onChange(DEFAULT_READER_TEXT_SETTINGS)}
      className="reader-settings-reset">
      <RotateCcw className="h-4 w-4" aria-hidden /> Reset text
    </button>
  </section>;
}

/**
 * The audio player's mixer view, built from the SEIHouse UI controls. It loads
 * when the Audio category first opens, so reading never waits for it.
 */
const ReaderMixerPanel = lazy(() => import('@seihouse/audio-player/reader-ui').then(module => ({ default: module.ReaderMixerPanel })));

/** Host composition keeps presets secondary to Master and individual levels. */
function AudioPresets({ mixer }: { mixer: ReaderMixer }) {
  const state = useReaderMixerState(mixer);
  if (!state?.presets.length) return null;
  return <div className="reader-settings-group">
    <PillChoice title="Presets" name="reader-audio-preset" value={state.activePresetId ?? ''}
      onChange={id => mixer.applyPreset(id)} options={state.presets.map(preset => ({ value: preset.id, label: preset.label }))} />
  </div>;
}

type SettingsSection = 'text' | 'audio' | 'narration';

/**
 * Reader Settings: one of the Reader's panels, beside the chapter on laptops
 * and a sheet from the bottom on phones, so the chapter stays in view and
 * shows each text change as it is made. Persistent category tabs expose one
 * task at a time: Text, Audio, or Narration. The mixer and saved preferences
 * remain the owners of all changes; switching tabs does not reset them.
 */
export function ReaderSettingsSheet({ open, onClose, readAloud, language, mixer, section, soundtrack, text }: {
  open: boolean;
  onClose: () => void;
  readAloud: ReadAloud;
  /** The story's language: its voices are listed first. */
  language: string;
  /** The host's reader mixer. Without one there is no Audio section. */
  mixer?: ReaderMixer | null;
  /** The category to open directly, when requested by the host. */
  section?: 'audio' | 'narration';
  /** Who chooses the music and atmosphere, and the pieces the chapter on screen can play. */
  soundtrack?: { choice: SoundtrackChoice; onChoice: (choice: SoundtrackChoice) => void; pieces: readonly SceneAudioTrack[] };
  /** The reader's text settings and the fonts on offer. Without them there is no Text section. */
  text?: { settings: ReaderTextSettings; onChange: (next: ReaderTextSettings) => void; fonts: ReaderFonts };
}) {
  const initialSection: SettingsSection = section === 'audio' && mixer ? 'audio'
    : section === 'narration' ? 'narration' : text ? 'text' : mixer ? 'audio' : 'narration';
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  useEffect(() => {
    if (open) setActiveSection(initialSection);
  }, [open, initialSection]);
  return <SEITabs value={activeSection} onValueChange={value => setActiveSection(value as SettingsSection)} className="reader-settings-scope">
    <ReaderPanel open={open} onClose={onClose} labelledBy="reader-settings-title" testId="reader-settings" scrollKey={activeSection}
      header={<div className="reader-settings-header">
        <div className="reader-settings-heading">
          <h2 id="reader-settings-title">Reader Settings</h2>
          <button type="button" aria-label="Close Reader Settings" onClick={onClose}
            className="reader-settings-icon">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <SEITabsList aria-label="Reader settings categories" className="reader-settings-tabs">
          {text && <SEITabsTrigger value="text" className="reader-settings-tab">Text</SEITabsTrigger>}
          {mixer && <SEITabsTrigger value="audio" className="reader-settings-tab">Audio</SEITabsTrigger>}
          <SEITabsTrigger value="narration" className="reader-settings-tab">Narration</SEITabsTrigger>
        </SEITabsList>
      </div>}>
      <div className="reader-settings-body">
        {text && <SEITabsPanel value="text" className="reader-settings-page">
          <TextSettings settings={text.settings} fonts={text.fonts} onChange={text.onChange} />
        </SEITabsPanel>}
        {mixer && <SEITabsPanel value="audio" className="reader-settings-page">
        <section aria-label="Audio" data-testid="reader-settings-audio">
          <h3 className="sr-only">Audio</h3>
          <p className="reader-settings-help mb-3">The story’s music, atmosphere and sound effects.</p>
          <Suspense fallback={<p role="status" className="text-sm text-neutral-400">Opening Audio…</p>}>
            {/* The atmosphere is chosen in Scene below, beside the music, so the panel's own picker is hidden. */}
            <ReaderMixerPanel mixer={mixer} showTitle={false} showPresets={false} showAtmospherePicker={!soundtrack} />
          </Suspense>
          <AudioPresets mixer={mixer} />
          {soundtrack && <SoundtrackChoicePanel mixer={mixer} choice={soundtrack.choice} onChoice={soundtrack.onChoice} pieces={soundtrack.pieces} />}
        </section></SEITabsPanel>}
        <SEITabsPanel value="narration" className="reader-settings-page">
        <section aria-labelledby="reader-settings-narration" data-testid="reader-settings-narration">
          <h3 id="reader-settings-narration" className="sr-only">Narration</h3>
          <p className="reader-settings-help mb-3">Voices and speed for reading aloud in {plainLanguage(language)}.</p>
          {!readAloud.supported
            ? <p role="note" className="mt-3 text-sm text-amber-200">This browser can't read aloud.</p>
            : <>
                {readAloud.languageVoices.length === 0 && <p role="note" className="mt-3 text-sm text-amber-200">
                  {`This device has no ${plainLanguage(language)} voice. Add one in your device's speech settings; until then the device chooses how to read ${plainLanguage(language)}.`}
                </p>}
                <div className="reader-settings-group">
                <PillChoice title="Speed" name="read-aloud-rate" value={readAloud.rate} onChange={readAloud.setRate}
                  options={READ_ALOUD_RATES.map(rate => ({ value: rate, label: `${rate}×` }))} />
                </div>
                <div className="reader-settings-group">
                  {READ_ALOUD_ROLES.map(role => <VoicePicker key={role} role={role} readAloud={readAloud} language={language} />)}
                </div>
                <p className="reader-settings-help">Each character speaks in a voice of their own, shaped from these. Online voices may take a moment to start.</p>
                <button type="button" onClick={readAloud.resetVoices}
                  className="reader-settings-reset">
                  <RotateCcw className="h-4 w-4" aria-hidden /> Reset voices
                </button>
              </>}
        </section></SEITabsPanel>
        <p className="reader-settings-help reader-settings-saved">Changes are saved on this device.</p>
      </div>
    </ReaderPanel>
  </SEITabs>;
}
