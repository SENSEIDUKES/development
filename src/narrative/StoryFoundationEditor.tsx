import { BookOpen, CheckCircle2, type LucideIcon } from 'lucide-react';
import { NarrativePanel as LibraryPanel, NarrativeTextBox as LibraryTextBox, NarrativeTextArea as LibraryTextArea, CreationButton as ManifestButton } from '../presentation';
import type { StoryFoundationInput, HarnessStory } from './generation';

const field = (
  input: StoryFoundationInput,
  key: Exclude<keyof StoryFoundationInput, 'sourceSnapshot' | 'identities'>,
  value: string,
): StoryFoundationInput => ({ ...input, [key]: value });

export function StoryFoundationEditor({
  form,
  story,
  createIcon = BookOpen,
  busy,
  error,
  onChange,
  onSubmit,
}: {
  form: StoryFoundationInput;
  createIcon?: LucideIcon;
  story?: HarnessStory;
  busy: boolean;
  error?: string;
  onChange: (next: StoryFoundationInput) => void;
  onSubmit: () => void;
}) {
  return (
    <LibraryPanel as="section" padding="md" aria-labelledby="harness-foundation-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-200/55">Permanent author canon</p>
          <h2 id="harness-foundation-title" className="mt-1 font-display text-xl text-white">Story Foundation</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-neutral-400">
            {form.sourceSnapshot
              ? 'This independent snapshot was copied from Story Seed. Saving changes creates a new Harness revision without rewriting the source.'
              : 'Premise is the only requirement. Every generation freezes the active revision before the provider is called.'}
          </p>
        </div>
        {story && <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 font-mono text-[10px] text-cyan-100">{form.sourceSnapshot ? 'Story Seed snapshot' : 'Revision saved'}</span>}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <LibraryTextBox
          id="harness-foundation-title-input"
          label="Title"
          value={form.title ?? ''}
          onChange={value => onChange(field(form, 'title', value))}
          helpText="Optional. The premise supplies a local title when left blank."
          disabled={busy}
        />
        <LibraryTextBox
          id="harness-foundation-genre-input"
          label="Genre"
          value={form.genre ?? ''}
          onChange={value => onChange(field(form, 'genre', value))}
          disabled={busy}
        />
      </div>

      <div className="mt-4">
        <LibraryTextArea
          id="harness-foundation-premise"
          label="Premise"
          required
          value={form.premise}
          onChange={value => onChange(field(form, 'premise', value))}
          helpText="The smallest permanent statement needed to begin a durable Harness story."
          error={error}
          rows={4}
          disabled={busy}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <LibraryTextArea
          id="harness-foundation-instructions"
          label="Permanent instructions"
          value={form.permanentInstructions ?? ''}
          onChange={value => onChange(field(form, 'permanentInstructions', value))}
          rows={4}
          disabled={busy}
        />
        <LibraryTextArea
          id="harness-foundation-tone"
          label="Tone and style"
          value={form.toneStyle ?? ''}
          onChange={value => onChange(field(form, 'toneStyle', value))}
          rows={4}
          disabled={busy}
        />
        <LibraryTextArea
          id="harness-foundation-opening"
          label="Opening situation"
          value={form.openingSituation ?? ''}
          onChange={value => onChange(field(form, 'openingSituation', value))}
          rows={4}
          disabled={busy}
        />
        <LibraryTextArea
          id="harness-foundation-direction"
          label="Intended direction"
          value={form.intendedDirection ?? ''}
          onChange={value => onChange(field(form, 'intendedDirection', value))}
          rows={4}
          disabled={busy}
        />
        <LibraryTextArea
          id="harness-foundation-canon"
          label="Declared canon"
          value={form.declaredCanon ?? ''}
          onChange={value => onChange(field(form, 'declaredCanon', value))}
          rows={4}
          disabled={busy}
        />
        <LibraryTextArea
          id="harness-foundation-characters"
          label="Characters"
          value={form.characters ?? ''}
          onChange={value => onChange(field(form, 'characters', value))}
          rows={4}
          disabled={busy}
        />
      </div>

      <div className="mt-4">
        <LibraryTextArea
          id="harness-foundation-world-facts"
          label="World facts"
          value={form.worldFacts ?? ''}
          onChange={value => onChange(field(form, 'worldFacts', value))}
          rows={4}
          disabled={busy}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <ManifestButton
          type="button"
          onClick={onSubmit}
          loading={busy}
          icon={story ? CheckCircle2 : createIcon}
        >
          {story ? 'Save Foundation Revision' : 'Create Harness Story'}
        </ManifestButton>
      </div>
    </LibraryPanel>
  );
}
