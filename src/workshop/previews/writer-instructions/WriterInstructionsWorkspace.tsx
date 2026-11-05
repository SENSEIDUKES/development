import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { CAPA_SCHEMA, type HarnessSkillManifest } from '@seihouse/sen/harness-generation';
import type { StoryStyle } from '@seihouse/sen/story-seed';
import { OFFICIAL_STYLE_REFERENCES, installOfficialCapaSkillsInMemory } from '../../../host/generation/capa/officialCapaSkills';
import {
  PIPELINE, PIPELINE_CHECKS, RETIRED_WRITER_INSTRUCTIONS, WHOLE_PROMPTS, WRITER_INSTRUCTIONS, WRITER_NEXT_MESSAGE, countWords,
  officialWriterSkills, writerSystemInstruction,
  type PipelineStep, type PipelineStepId, type PromptMessage, type WriterInstruction, type WriterInstructionId,
} from './writerInstructions';
import { WRITER_INSTRUCTIONS_HISTORY, type WriterInstructionsChange } from './writerInstructionsHistory';
import './writer-instructions.css';

const TITLES = new Map([...WRITER_INSTRUCTIONS.map(block => [block.id, block.title] as const), ...RETIRED_WRITER_INSTRUCTIONS]);
const STEP_OF = new Map(PIPELINE.flatMap(step => step.groups.flatMap(group => group.blocks.map(block => [block.id, step.id] as const))));
const changesTo = (id: WriterInstructionId) => WRITER_INSTRUCTIONS_HISTORY.filter(change => change.changed[id] !== undefined);

type View = PipelineStepId | 'changes';
const VIEWS: readonly View[] = [...PIPELINE.map(step => step.id), 'changes'];

/** The page's place, kept in the address so a link opens the same step and block. */
const readHash = (): { view: View; block?: string } => {
  const [view, block] = (typeof window === 'undefined' ? '' : window.location.hash.slice(1)).split('/');
  if (!VIEWS.includes(view as View)) return { view: 'tagger' };
  return { view: view as View, ...(block && view !== 'changes' ? { block: decodeURIComponent(block) } : {}) };
};

/** The chip that shows a step's whole prompt, as one. */
const ALL = 'all';

/** One block on the page: the HARNESS's own, or a CAPA skill read from its package. */
type ShownBlock = Omit<WriterInstruction, 'id'> & { id: string };

const STYLES: ReadonlyArray<[StoryStyle, string]> = [['chinese', 'Chinese'], ['japanese', 'Japanese'], ['korean', 'Korean']];
const slotLabel = (skill: HarnessSkillManifest) => CAPA_SCHEMA.find(slot => slot.id === skill.slot)?.label ?? skill.slot;

/** A CAPA skill as the page shows it: its words, exactly as its package holds them. */
const skillBlock = (skill: HarnessSkillManifest): ShownBlock => ({
  id: skill.id,
  title: slotLabel(skill),
  source: `${skill.name.replace(/ · .*$/, '')} v${skill.version}`,
  part: 'writing',
  when: skill.slot === 'style'
    ? 'Every chapter of a story whose Story Seed chose this style, under How to write. Pick the style above. Its words are fixed by its package: a change to them is a new package version.'
    : `Every story made in Novel Expanded starts with this ${slotLabel(skill)} skill, under How to write. Its words are fixed by its package: a change to them is a new package version.`,
  text: skill.instructions?.trim() ?? '',
});

// ─── The text, made readable without changing a word ──────────────────────

/** A tag written in the SEN language, set apart so it reads as a tag. */
function withTags(text: string): ReactNode {
  const parts = text.split(/(\[\[[^\]]*\]\])/g);
  return parts.map((part, index) => /^\[\[.*\]\]$/.test(part) ? <code key={index} className="wi-tag">{part}</code> : <Fragment key={index}>{part}</Fragment>);
}

/** An example note, as the tagger returns it: read out field by field. A line may hold more than one, with words between. */
function ExampleNote({ line }: { line: string }) {
  try {
    const pieces = line.replace(/^Example:\s*/, '').split(/(\{[^{}]*\})/).map(piece => piece.trim()).filter(Boolean);
    const parts = pieces.map(piece => piece.startsWith('{') ? { note: JSON.parse(piece) as { paragraph?: number; words?: string; tag?: string } } : { aside: piece.replace(/^\((.*)\)$/, '$1') });
    if (!parts.some(part => typeof part.note?.tag === 'string')) throw new Error('not a note');
    return (
      <div className="wi-example">
        <span className="wi-example__label">Example</span>
        {parts.map((part, index) => part.note ? (
          <Fragment key={index}>
            <span className="wi-example__words">{part.note.words ? `“${part.note.words}”` : '(no words)'}</span>
            <span className="wi-example__tag"><code className="wi-tag">{part.note.tag}</code>{part.note.paragraph !== undefined && <span className="wi-example__where"> on paragraph {part.note.paragraph}</span>}</span>
          </Fragment>
        ) : <span key={index} className="wi-example__where">{part.aside}</span>)}
      </div>
    );
  } catch {
    return <p className="wi-line">{withTags(line)}</p>;
  }
}

const HEADING = /^[A-Z0-9][A-Z0-9 ,'’&()/-]{2,}[.:]?$/;
const LEAD = /^([A-Z][A-Z0-9 ,'’&()/-]{2,}):\s+(.+)$/;

/** The exact text, laid out for a person: headings, lists and examples, every word kept. */
export function ReadableText({ text }: { text: string }) {
  return (
    <div className="wi-text">
      {text.split('\n').map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} className="wi-gap" />;
        if (/^Example:\s*\{/.test(trimmed)) return <ExampleNote key={index} line={trimmed} />;
        if (HEADING.test(trimmed) && /[A-Z]{3}/.test(trimmed)) return <h4 key={index} className="wi-subheading">{trimmed}</h4>;
        const lead = trimmed.match(LEAD);
        if (lead) return <p key={index} className="wi-line"><strong>{lead[1]}:</strong> {withTags(lead[2])}</p>;
        if (/^[-•]\s/.test(trimmed)) return <p key={index} className={`wi-line wi-bullet${/^\s/.test(line) ? ' wi-bullet--deep' : ''}`}>{withTags(trimmed.replace(/^[-•]\s/, ''))}</p>;
        if (/^\s{2,}/.test(line)) return <p key={index} className="wi-line wi-bullet wi-bullet--deep">{withTags(trimmed)}</p>;
        return <p key={index} className="wi-line">{withTags(trimmed)}</p>;
      })}
    </div>
  );
}

// ─── One block ────────────────────────────────────────────────────────────

function ChangeSummary({ change }: { change: WriterInstructionsChange }) {
  return (
    <li className="wi-change">
      <time dateTime={change.date}>{change.date}</time>
      <p>{change.summary}</p>
    </li>
  );
}

function InstructionBlock({ block }: { block: ShownBlock }) {
  const [raw, setRaw] = useState(false);
  const changes = changesTo(block.id as WriterInstructionId);
  return (
    <article className="wi-block" data-instruction={block.id}>
      <header className="wi-block__header">
        <h3>{block.title}</h3>
        <p className="wi-block__meta">
          {block.source} · {countWords(block.text).toLocaleString('en')} words
          {changes[0] && <> · changed {changes[0].date}</>}
        </p>
        <p className="wi-block__when">{block.when}</p>
      </header>
      <div className="wi-block__view" role="group" aria-label="How to show the text">
        <button type="button" aria-pressed={!raw} onClick={() => setRaw(false)}>Easy to read</button>
        <button type="button" aria-pressed={raw} onClick={() => setRaw(true)}>Exactly as the model sees it</button>
      </div>
      {raw ? <pre className="wi-raw">{block.text}</pre> : <ReadableText text={block.text} />}
      {changes.length > 0 && (
        <details className="wi-block__history">
          <summary>Why it says this · {changes.length} {changes.length === 1 ? 'change' : 'changes'}</summary>
          <ol>{changes.map(change => <ChangeSummary key={`${change.date}:${change.summary.slice(0, 40)}`} change={change} />)}</ol>
        </details>
      )}
    </article>
  );
}

/** A step's whole prompt, as one: every message the model is sent, in order, as the code builds it. */
function WholePrompt({ messages, note }: { messages: readonly PromptMessage[]; note: string }) {
  const [raw, setRaw] = useState(true);
  const [copied, setCopied] = useState(false);
  const words = messages.reduce((total, message) => total + countWords(message.text), 0);
  const copy = () => {
    void navigator.clipboard?.writeText(messages.map(message => `${message.label.toUpperCase()}\n\n${message.text}`).join('\n\n\n')).then(() => setCopied(true));
  };
  return (
    <article className="wi-block" data-instruction={ALL}>
      <header className="wi-block__header">
        <h3>All, as one prompt</h3>
        <p className="wi-block__meta">{words.toLocaleString('en')} words · built by the same code that sends it</p>
        <p className="wi-block__when">{note}</p>
      </header>
      <div className="wi-block__view" role="group" aria-label="How to show the text">
        <button type="button" aria-pressed={raw} onClick={() => setRaw(true)}>Exactly as the model sees it</button>
        <button type="button" aria-pressed={!raw} onClick={() => setRaw(false)}>Easy to read</button>
        <button type="button" onClick={copy}>{copied ? 'Copied' : 'Copy all'}</button>
      </div>
      {messages.map(message => (
        <section key={message.label} className="wi-message">
          <h4 className="wi-message__label">{message.label}</h4>
          {raw ? <pre className="wi-raw">{message.text}</pre> : <ReadableText text={message.text} />}
        </section>
      ))}
    </article>
  );
}

// ─── One step of the pipeline ────────────────────────────────────────────

interface StepGroups { label: string; blocks: readonly ShownBlock[] }

function StepView({ step, groups, whole, block, onBlock, before }: {
  step: PipelineStep;
  groups: readonly StepGroups[];
  whole: { messages: readonly PromptMessage[]; note: string } | undefined;
  block: string;
  onBlock: (id: string) => void;
  before?: ReactNode;
}) {
  const all = groups.flatMap(group => group.blocks);
  const selected = block === ALL && whole ? undefined : all.find(item => item.id === block) ?? (whole ? undefined : all[0]);
  return (
    <section className="wi-step" aria-labelledby="wi-step-title" data-step={step.id}>
      <h2 id="wi-step-title">{step.name} <span className="wi-step__runs">{step.runs}</span></h2>
      <p className="wi-step__job">{step.job}</p>
      <div className="wi-flow">
        <div>
          <h3>It is given</h3>
          <ul>{step.reads.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <h3>It hands back</h3>
          <ul>{step.gives.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
      {before}
      {groups.map((group, groupIndex) => (
        <div key={group.label} className="wi-picker">
          <h3>{group.label}</h3>
          <div className="wi-chips" role="tablist" aria-label={group.label}>
            {groupIndex === 0 && whole && (
              <button type="button" role="tab" className="wi-chips__all" aria-selected={!selected} onClick={() => onBlock(ALL)} data-block={ALL}>All, as one prompt</button>
            )}
            {group.blocks.map((item, index) => (
              <button key={item.id} type="button" role="tab" aria-selected={item.id === selected?.id} onClick={() => onBlock(item.id)} data-block={item.id}>
                {groupIndex === 0 ? <span className="wi-chips__order">{index + 1}</span> : null}{item.title}
              </button>
            ))}
          </div>
        </div>
      ))}
      {selected ? <InstructionBlock key={selected.id} block={selected} /> : whole && <WholePrompt messages={whole.messages} note={whole.note} />}
    </section>
  );
}

function ChangesView() {
  return (
    <section className="wi-step" aria-labelledby="wi-changes-title" data-step="changes">
      <h2 id="wi-changes-title">Every change <span className="wi-step__runs">newest first</span></h2>
      <p className="wi-step__job">Any change to what a model reads must be written here, with its date, or the build fails.</p>
      <ol className="wi-changes">
        {WRITER_INSTRUCTIONS_HISTORY.map(change => (
          <li key={`${change.date}:${change.summary.slice(0, 40)}`} className="wi-change">
            <time dateTime={change.date}>{change.date}</time>
            <p className="wi-change__what">{(Object.keys(change.changed) as WriterInstructionId[]).map(id => {
              const step = PIPELINE.find(item => item.id === STEP_OF.get(id));
              const title = TITLES.get(id);
              return <span key={id} className="wi-pill">{step && step.name !== title ? `${step.name}: ` : ''}{title}</span>;
            })}</p>
            <details>
              <summary><span className="wi-change__short">{change.summary.length > 180 ? `${change.summary.slice(0, 180).replace(/\s+\S*$/, '')}…` : change.summary}</span><span className="wi-change__less">Show less</span></summary>
              <p>{change.summary}</p>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * The Workshop's model instructions page: every word each model in the story's
 * pipeline reads, straight from the live code, one step and one block at a
 * time, with why each says what it says.
 */
export function WriterInstructionsWorkspace() {
  const [view, setView] = useState<View>(() => readHash().view);
  const [blocks, setBlocks] = useState<Partial<Record<PipelineStepId, string>>>(() => {
    const start = readHash();
    return start.block && start.view !== 'changes' ? { [start.view]: start.block } : {};
  });
  const [installed, setInstalled] = useState<readonly HarnessSkillManifest[] | 'loading' | 'failed'>('loading');
  // A saved link to a Style skill reopens that style (review finding, Codex, 2026-11-05).
  const [style, setStyle] = useState<StoryStyle>(() => STYLES.find(([id]) => OFFICIAL_STYLE_REFERENCES[id].id === readHash().block)?.[0] ?? 'chinese');
  useEffect(() => {
    let live = true;
    installOfficialCapaSkillsInMemory().then(skills => { if (live) setInstalled(skills); }, () => { if (live) setInstalled('failed'); });
    return () => { live = false; };
  }, []);
  const skills = Array.isArray(installed) ? officialWriterSkills(installed, style) : [];
  const step = PIPELINE.find(item => item.id === view);
  const groups: StepGroups[] = !step ? [] : step.id !== 'writer' ? step.groups.map(group => ({ ...group })) : step.groups.map((group, index) => index > 0 ? { ...group } : {
    ...group,
    // The official CAPA skills sit under How to write, before the HARNESS writing rules, as the writer reads them.
    blocks: group.blocks.flatMap(item => item.id === 'writing-rules' ? [...skills.map(skillBlock), item] : [item]),
  });
  const whole = !step ? undefined : step.id === 'writer'
    ? (skills.length ? {
      messages: [{ label: 'Its instructions', text: writerSystemInstruction(skills) }, WRITER_NEXT_MESSAGE],
      note: `What the writer of a Novel Expanded story in ${STYLES.find(([id]) => id === style)![1]} style reads, in English, with no Fate Survival, Reading Mode or translation. The next message changes every chapter, so each part's place is shown.`,
    } : undefined)
    : {
      messages: WHOLE_PROMPTS[step.id],
      note: step.id === 'world'
        ? 'The whole request, with an empty Story Seed where yours goes.'
        : step.id === 'tagger'
          ? 'Everything the tagger is sent for one chapter, with the story\'s default sound words, music and atmospheres. The parts that change every chapter show their place.'
          : 'Everything it is sent. The parts that change every time show their place.',
    };
  const block = step ? blocks[step.id] ?? (whole ? ALL : groups[0]?.blocks[0]?.id) : undefined;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.replaceState(null, '', `#${view}${block ? `/${encodeURIComponent(block)}` : ''}`);
  }, [view, block]);
  const styleRow = step?.id === 'writer' && (
    <div className="wi-picker">
      <h3>Story style</h3>
      <div className="wi-chips" role="radiogroup" aria-label="Story style">
        {STYLES.map(([id, label]) => (
          <button key={id} type="button" role="radio" aria-checked={style === id} aria-selected={style === id} onClick={() => setStyle(id)} data-style={id}>{label}</button>
        ))}
      </div>
      {installed === 'loading' && <p className="wi-step__note">Loading the official skills from their packages…</p>}
      {installed === 'failed' && <p className="wi-step__note">The official skills could not be loaded, so the writer's CAPA skills are not shown.</p>}
    </div>
  );

  return (
    <main className="writer-instructions">
      <header>
        <h1>What the Models Read</h1>
        <p className="writer-instructions__intro">
          Every word each model in a story is told, straight from the live code. Pick a step to see what it does, what it is given, and its instructions, one by one or all as one prompt.
        </p>
        <button type="button" className="wi-history-link" aria-current={view === 'changes' ? 'page' : undefined} onClick={() => setView('changes')} data-view="changes">
          Every change, with its date
        </button>
      </header>

      <nav className="wi-pipeline" aria-label="The story's pipeline">
        {PIPELINE.map((item, index) => (
          <Fragment key={item.id}>
            <button type="button" className="wi-pipeline__step" aria-current={item.id === view ? 'step' : undefined} onClick={() => setView(item.id)} data-view={item.id}>
              <span className="wi-pipeline__number">{index + 1}</span>
              <span className="wi-pipeline__name">{item.name}</span>
              <span className="wi-pipeline__runs">{item.runs}</span>
            </button>
            {item.id === PIPELINE_CHECKS.after && (
              <div className="wi-pipeline__checks" aria-label="Code checks the tags, no model">
                <span className="wi-pipeline__name">{PIPELINE_CHECKS.name}</span>
                <span className="wi-pipeline__runs">{PIPELINE_CHECKS.runs}</span>
              </div>
            )}
          </Fragment>
        ))}
      </nav>

      {step && block
        ? <StepView step={step} groups={groups} whole={whole} block={block} before={styleRow} onBlock={id => setBlocks(current => ({ ...current, [step.id]: id }))} />
        : <ChangesView />}
    </main>
  );
}
