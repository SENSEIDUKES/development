import { lazy, Suspense, useEffect, useRef, type CSSProperties } from 'react';
import type { ReaderMixer } from '@seihouse/audio-player';
import { Play, RotateCcw, X } from 'lucide-react';
import {
  DEFAULT_READER_FONTS, DEFAULT_READER_TEXT_SETTINGS, READ_ALOUD_RATES, READ_ALOUD_ROLES, READER_LINE_SPACINGS, READER_TEXT_SIZES, READER_TEXT_WEIGHTS, resolveReaderText,
  type ReadAloud, type ReadAloudRole, type ReadAloudVoice, type ReaderFonts, type ReaderTextSettings, type SoundtrackChoice,
} from '@seihouse/sen/reader-runtime';
import type { SceneAudioTrack } from '@seihouse/sen/audio';
import { getSenLanguageLabel, normalizeSenLanguageCode } from '../../../lib/language';
import { ReaderPanel } from './ReaderPanel';
import { SoundtrackChoicePanel } from './SoundtrackChoicePanel';

const legend = 'font-mono text-[10px] uppercase tracking-[0.18em] text-cyan-200/70';
const pillChoice = 'inline-flex min-h-11 min-w-14 items-center justify-center rounded-full border border-white/15 px-3 text-sm text-neutral-200 peer-checked:border-cyan-300/60 peer-checked:bg-cyan-400/15 peer-checked:text-cyan-50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-cyan-300';

const ROLE_TITLES: Record<ReadAloudRole, string> = { narrator: 'Narrator', protagonist: 'Protagonist', side: 'Side characters' };
const ROLE_HELP: Record<ReadAloudRole, string> = {
  narrator: 'Reads the story itself.',
  protagonist: 'Reads the main character\'s spoken lines.',
  side: 'Reads everyone else\'s spoken lines.',
};

/** A language's own name, without the native script in brackets ("Korean (한국어)" → "Korean"). */
const plainLanguage = (language: string) => getSenLanguageLabel(normalizeSenLanguageCode(language)).replace(/\s*\(.*\)$/u, '');
const voiceLabel = (voice: ReadAloudVoice) => `${voice.name} (${voice.lang})${voice.localService === false ? ' · online' : ''}`;

function VoicePicker({ role, readAloud, language }: { role: ReadAloudRole; readAloud: ReadAloud; language: string }) {
  const id = `reader-voice-${role}`;
  const chosen = readAloud.choice[role]?.voiceURI ?? '';
  const own = new Set(readAloud.languageVoices.map(voice => voice.voiceURI));
  const others = readAloud.voices.filter(voice => !own.has(voice.voiceURI));
  return <div className="mt-4">
    <label htmlFor={id} className={legend}>{ROLE_TITLES[role]}</label>
    <div className="mt-1 flex items-center gap-2">
      <select id={id} value={chosen} data-voice-role={role}
        onChange={event => readAloud.setVoice(role, readAloud.voices.find(voice => voice.voiceURI === event.target.value))}
        className="min-h-11 min-w-0 flex-1 rounded-lg border border-white/15 bg-neutral-900 px-3 text-sm text-neutral-100">
        {!chosen && <option value="">{`The device's ${plainLanguage(language)} voice`}</option>}
        {readAloud.languageVoices.length > 0 && <optgroup label={`${plainLanguage(language)} voices`}>
          {readAloud.languageVoices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voiceLabel(voice)}</option>)}
        </optgroup>}
        {others.length > 0 && <optgroup label="Other voices">
          {others.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voiceLabel(voice)}</option>)}
        </optgroup>}
      </select>
      <button type="button" aria-label={`Preview the ${ROLE_TITLES[role]} voice`} title="Preview" onClick={() => readAloud.preview(role)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 text-neutral-100 hover:border-white/35">
        <Play className="h-4 w-4" aria-hidden />
      </button>
    </div>
    <p className="mt-1 text-xs text-neutral-500">{ROLE_HELP[role]}</p>
  </div>;
}

/** One row of radio pills, each label optionally drawn in its own style (a font in itself, a weight in its weight). */
function PillChoice<Value extends string | number>({ title, name, value, options, onChange }: {
  title: string; name: string; value: Value;
  options: readonly { value: Value; label: string; display?: string; style?: CSSProperties }[];
  onChange: (value: Value) => void;
}) {
  return <fieldset className="mt-4">
    <legend className={legend}>{title}</legend>
    <div className="mt-2 flex flex-wrap gap-2">
      {options.map(option => <label key={String(option.value)} className="cursor-pointer">
        <input type="radio" name={name} value={String(option.value)} checked={value === option.value} onChange={() => onChange(option.value)} className="peer sr-only" />
        <span className={pillChoice} style={option.style}>
          {option.display ? <><span aria-hidden>{option.display}</span><span className="sr-only">{option.label}</span></> : option.label}
        </span>
      </label>)}
    </div>
  </fieldset>;
}

/** Text: the font, the title font, size, line spacing and weight, with a line set in them. */
function TextSettings({ settings, fonts, onChange }: { settings: ReaderTextSettings; fonts: ReaderFonts; onChange: (next: ReaderTextSettings) => void }) {
  const resolved = resolveReaderText(settings, fonts);
  // The same lists `resolveReaderText` falls back to, so an empty host list still offers SEN's own.
  const textFonts = fonts.text.length ? fonts.text : DEFAULT_READER_FONTS.text;
  const titleFonts = fonts.titles.length ? fonts.titles : DEFAULT_READER_FONTS.titles;
  const change = (patch: Partial<ReaderTextSettings>) => onChange({ ...settings, ...patch });
  return <section aria-labelledby="reader-settings-text" data-testid="reader-settings-text" className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4">
    <h3 id="reader-settings-text" className="text-sm font-semibold text-neutral-100">Text</h3>
    <p className="mt-1 text-xs leading-relaxed text-neutral-400">How every chapter reads. Your choices stay on this device.</p>
    <div aria-hidden data-testid="reader-text-sample" className="mt-3 rounded-lg border border-white/10 bg-neutral-900/60 px-3 py-2 text-neutral-200"
      style={{ fontFamily: resolved.font.family, fontSize: resolved.fontSize, fontWeight: resolved.fontWeight, lineHeight: resolved.lineHeight, fontSynthesis: 'none' }}>
      <span className="block text-lg text-white" style={{ fontFamily: resolved.titleFont.family, fontWeight: 400 }}>The Drowned Gate</span>
      The tide pulled back, and the bells of the city answered.
    </div>
    <PillChoice title="Font" name="reader-text-font" value={resolved.font.id} onChange={font => change({ font })}
      options={textFonts.map(choice => ({ value: choice.id, label: choice.label, style: { fontFamily: choice.family } }))} />
    {titleFonts.length > 1 && <PillChoice title="Title font" name="reader-title-font" value={resolved.titleFont.id} onChange={titleFont => change({ titleFont })}
      options={titleFonts.map(choice => ({ value: choice.id, label: choice.label, style: { fontFamily: choice.family } }))} />}
    <PillChoice title="Size" name="reader-text-size" value={settings.size} onChange={size => change({ size })}
      options={READER_TEXT_SIZES.map((step, index) => ({ value: step.id, label: step.label, display: 'A', style: { fontSize: `${0.8 + index * 0.15}rem` } }))} />
    <PillChoice title="Line spacing" name="reader-line-spacing" value={settings.lineSpacing} onChange={lineSpacing => change({ lineSpacing })}
      options={READER_LINE_SPACINGS.map(step => ({ value: step.id, label: step.label }))} />
    <PillChoice title="Weight" name="reader-text-weight" value={settings.weight} onChange={weight => change({ weight })}
      options={READER_TEXT_WEIGHTS.map(step => ({ value: step.id, label: step.label, style: { fontFamily: resolved.font.family, fontWeight: step.id, fontSynthesis: 'none' } }))} />
    <button type="button" onClick={() => onChange(DEFAULT_READER_TEXT_SETTINGS)}
      className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:border-white/35">
      <RotateCcw className="h-4 w-4" aria-hidden /> Reset text
    </button>
  </section>;
}

/**
 * The audio player's mixer view, built from the SEIHouse UI controls. It loads
 * when Reader Settings first opens, so reading never waits for it.
 */
const ReaderMixerPanel = lazy(() => import('@seihouse/audio-player/reader-ui').then(module => ({ default: module.ReaderMixerPanel })));

/**
 * Reader Settings: one of the Reader's panels, beside the chapter on laptops
 * and a sheet from the bottom on phones, so the chapter stays in view and
 * shows each text change as it is made. Text
 * comes first: the reader's font, title font, size, line spacing and weight.
 * Audio follows: the reader's mix of the story's soundtrack (presets, the
 * layers the chapter uses and the sleep timer), then the Scene: each
 * chapter's own music and atmosphere (Automatic) or the reader's own.
 * Narration follows: the three voices and the speed Read Aloud uses.
 */
export function ReaderSettingsSheet({ open, onClose, readAloud, language, mixer, section, soundtrack, text }: {
  open: boolean;
  onClose: () => void;
  readAloud: ReadAloud;
  /** The story's language: its voices are listed first. */
  language: string;
  /** The host's reader mixer. Without one there is no Audio section. */
  mixer?: ReaderMixer | null;
  /** The section to bring into view when the sheet opens (the note's long-press opens Audio). */
  section?: 'audio' | 'narration';
  /** Who chooses the music and atmosphere, and the pieces the chapter on screen can play. */
  soundtrack?: { choice: SoundtrackChoice; onChoice: (choice: SoundtrackChoice) => void; pieces: readonly SceneAudioTrack[] };
  /** The reader's text settings and the fonts on offer. Without them there is no Text section. */
  text?: { settings: ReaderTextSettings; onChange: (next: ReaderTextSettings) => void; fonts: ReaderFonts };
}) {
  const audioRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (open && section === 'audio') audioRef.current?.scrollIntoView?.({ block: 'start' });
  }, [open, section]);
  return <ReaderPanel open={open} onClose={onClose} labelledBy="reader-settings-title" testId="reader-settings">
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <h2 id="reader-settings-title" className="font-display text-xl text-white">Reader Settings</h2>
          <button type="button" aria-label="Close Reader Settings" onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/15 text-neutral-200 hover:border-white/35">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {text && <TextSettings settings={text.settings} fonts={text.fonts} onChange={text.onChange} />}
        {mixer && <section ref={audioRef} aria-label="Audio" data-testid="reader-settings-audio" className="mt-4 scroll-mt-4">
          <Suspense fallback={<p role="status" className="text-sm text-neutral-400">Opening Audio…</p>}>
            {/* The atmosphere is chosen in Scene below, beside the music, so the panel's own picker is hidden. */}
            <ReaderMixerPanel mixer={mixer} titleAs="h3" showAtmospherePicker={!soundtrack} />
          </Suspense>
          {soundtrack && <SoundtrackChoicePanel mixer={mixer} choice={soundtrack.choice} onChoice={soundtrack.onChoice} pieces={soundtrack.pieces} />}
        </section>}
        <section aria-labelledby="reader-settings-narration" data-testid="reader-settings-narration" className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 sm:p-4">
          <h3 id="reader-settings-narration" className="text-sm font-semibold text-neutral-100">Narration</h3>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            Three voices read the story when you tap Listen. Your choices stay on this device, for each story language.
            Voices on this device start at once; an online voice can pause before its lines.
          </p>
          {!readAloud.supported
            ? <p role="note" className="mt-3 text-sm text-amber-200">This browser can't read aloud.</p>
            : <>
                {readAloud.languageVoices.length === 0 && <p role="note" className="mt-3 text-sm text-amber-200">
                  {`This device has no ${plainLanguage(language)} voice. Add one in your device's speech settings; until then the device chooses how to read ${plainLanguage(language)}.`}
                </p>}
                {READ_ALOUD_ROLES.map(role => <VoicePicker key={role} role={role} readAloud={readAloud} language={language} />)}
                <PillChoice title="Speed" name="read-aloud-rate" value={readAloud.rate} onChange={readAloud.setRate}
                  options={READ_ALOUD_RATES.map(rate => ({ value: rate, label: `${rate}×` }))} />
                <button type="button" onClick={readAloud.resetVoices}
                  className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-neutral-200 hover:border-white/35">
                  <RotateCcw className="h-4 w-4" aria-hidden /> Reset voices
                </button>
              </>}
        </section>
      </div>
  </ReaderPanel>;
}
