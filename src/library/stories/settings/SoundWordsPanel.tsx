import { useId, useRef, useState, type FormEvent } from 'react';
import { AudioLines, X } from 'lucide-react';
import { normalizeSoundWord, SOUND_WORD_LIMITS, validateSoundWordList, type SoundWordsPreset } from '@seihouse/sen/audio';
import { NarrativePanel as LibraryPanel } from '@seihouse/sen/presentation';

const presetKey = (preset: Pick<SoundWordsPreset, 'id' | 'version'>) => `${preset.id}@${preset.version}`;
const messageOf = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

/**
 * Story Settings' Sound Words: the sounds the writer may place in the story,
 * kept by the story apart from its recordings. A preset fills the list; the
 * reader adds, changes and removes words, at most 30. A word no recording
 * answers stays, marked, and never reaches the writer; an empty list plays no
 * Sound Cues. Create, World Info and the developer page share it.
 */
export function SoundWordsPanel({
  words,
  answered,
  presets,
  busy,
  onChange,
  onImport,
}: {
  /** The story's sound words, or those a story being created will start with. */
  words: readonly string[];
  /** Every word a recording answers now. */
  answered: readonly string[];
  presets: readonly SoundWordsPreset[];
  busy: boolean;
  onChange: (words: string[]) => void;
  /** Installs a Sound Words `.spp` package, when the host offers it. */
  onImport?: (file: Blob) => Promise<SoundWordsPreset>;
}) {
  const titleId = useId();
  const presetId = useId();
  const wordId = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<string>();
  const [problem, setProblem] = useState<string>();
  const [importing, setImporting] = useState(false);
  const playable = new Set(answered);
  const silent = words.filter(word => !playable.has(word));
  const full = words.length >= SOUND_WORD_LIMITS.maxWords;
  const disabled = busy || importing;

  const apply = (next: readonly string[]) => {
    try {
      onChange(validateSoundWordList(next));
      setProblem(undefined);
      return true;
    } catch (error) {
      setProblem(messageOf(error, 'These sound words could not be saved.'));
      return false;
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const word = normalizeSoundWord(draft);
    if (!word) return;
    const next = editing ? words.map(entry => entry === editing ? word : entry) : [...words, word];
    if (apply(next)) {
      setDraft('');
      setEditing(undefined);
    }
  };
  const startEditing = (word: string) => {
    setEditing(word);
    setDraft(word);
    setProblem(undefined);
  };
  const stopEditing = () => {
    setEditing(undefined);
    setDraft('');
    setProblem(undefined);
  };
  const importFile = async (file: File) => {
    if (!onImport) return;
    setImporting(true);
    setProblem(undefined);
    try {
      const preset = await onImport(file);
      apply(preset.words);
    } catch (error) {
      setProblem(messageOf(error, 'This package could not be installed.'));
    } finally {
      setImporting(false);
    }
  };

  return <LibraryPanel as="section" padding="md" aria-labelledby={titleId} data-testid="story-settings-sound-words">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <AudioLines size={18} className="text-emerald-200" aria-hidden="true" />
          <h2 id={titleId} className="font-display text-xl text-white">Sound Words</h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-400">
          The sounds the writer may place in your chapters. They are the story’s own: changing its Sound Cue pack never changes them, and an empty list plays no Sound Cues.
        </p>
      </div>
      <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-100"
        data-testid="sound-words-count">
        {words.length}/{SOUND_WORD_LIMITS.maxWords}
      </span>
    </div>

    <div className="mt-4 flex flex-wrap items-end gap-2">
      <div className="min-w-0 flex-1">
        <label className="block text-[10px] uppercase tracking-[0.14em] text-neutral-500" htmlFor={presetId}>Start from a preset</label>
        <select id={presetId} value="" disabled={disabled || presets.length === 0}
          onChange={event => {
            const preset = presets.find(item => presetKey(item) === event.target.value);
            if (preset) apply(preset.words);
          }}
          className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-neutral-100 outline-none focus:border-emerald-300/60">
          <option value="">{presets.length ? 'Choose a preset…' : 'No presets'}</option>
          {presets.map(preset => <option key={presetKey(preset)} value={presetKey(preset)}>
            {preset.name}{preset.source ? ` · v${preset.version}` : ''} · {preset.words.length} words
          </option>)}
        </select>
      </div>
      {onImport && <>
        <input ref={fileInput} type="file" accept=".spp" className="sr-only" tabIndex={-1} aria-hidden="true"
          data-testid="sound-words-import-file"
          onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void importFile(file);
          }} />
        <button type="button" disabled={disabled} onClick={() => fileInput.current?.click()}
          className="min-h-11 rounded-full border border-emerald-300/40 px-4 text-sm text-emerald-50 hover:border-emerald-300/70 disabled:opacity-40">
          {importing ? 'Installing…' : 'Import .spp'}
        </button>
      </>}
    </div>

    {words.length > 0
      ? <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="This story's sound words">
          {words.map(word => {
            const plays = playable.has(word);
            return <li key={word} data-testid="sound-word"
              className={`flex items-center rounded-full border text-[11px] ${editing === word ? 'border-emerald-300/60 bg-emerald-400/15' : plays ? 'border-emerald-300/20 bg-black/25' : 'border-dashed border-white/20 bg-black/15'}`}>
              <button type="button" disabled={disabled} onClick={() => startEditing(word)}
                title={plays ? `Change “${word}”` : `No recording plays “${word}” yet`}
                className={`min-h-8 rounded-l-full py-1 pl-2.5 pr-1 ${plays ? 'text-emerald-50' : 'text-neutral-400'}`}>
                {word}{!plays && <span className="ml-1 text-neutral-500">· no recording</span>}
              </button>
              <button type="button" disabled={disabled} aria-label={`Remove ${word}`}
                onClick={() => { if (editing === word) stopEditing(); apply(words.filter(entry => entry !== word)); }}
                className="flex min-h-8 min-w-8 items-center justify-center rounded-r-full pr-1 text-neutral-400 hover:text-white">
                <X size={12} aria-hidden="true" />
              </button>
            </li>;
          })}
        </ul>
      : <p className="mt-4 text-xs text-neutral-500" data-testid="sound-words-empty">No sound words: this story plays no Sound Cues.</p>}

    <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={submit}>
      <div className="min-w-0 flex-1">
        <label className="block text-[10px] uppercase tracking-[0.14em] text-neutral-500" htmlFor={wordId}>
          {editing ? `Change “${editing}”` : 'Add a sound word'}
        </label>
        <input id={wordId} value={draft} disabled={disabled || (!editing && full)} maxLength={SOUND_WORD_LIMITS.wordCharacters + 8}
          placeholder={!editing && full ? `The list holds ${SOUND_WORD_LIMITS.maxWords} words` : 'one to three words, like “door slam”'}
          onChange={event => setDraft(event.target.value)}
          className="mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-black/35 px-3 text-sm text-neutral-100 outline-none focus:border-emerald-300/60" />
      </div>
      <button type="submit" disabled={disabled || !draft.trim() || (!editing && full)}
        className="min-h-11 rounded-full border border-emerald-300/40 px-4 text-sm text-emerald-50 hover:border-emerald-300/70 disabled:opacity-40">
        {editing ? 'Save' : 'Add'}
      </button>
      {editing && <button type="button" onClick={stopEditing}
        className="min-h-11 rounded-full px-3 text-sm text-neutral-400 hover:text-white">Cancel</button>}
    </form>

    {problem && <p role="alert" className="mt-2 text-xs text-human">{problem}</p>}
    {silent.length > 0 && <p className="mt-3 text-[11px] leading-relaxed text-neutral-500" data-testid="sound-words-silent">
      {silent.length === 1 ? '1 word has' : `${silent.length} words have`} no recording yet. The writer uses {silent.length === 1 ? 'it' : 'them'} once a recording plays {silent.length === 1 ? 'it' : 'them'}.
    </p>}
  </LibraryPanel>;
}
