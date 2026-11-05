import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { PIPELINE, PIPELINE_CHECKS, RETIRED_WRITER_INSTRUCTIONS, WRITER_INSTRUCTIONS, countWords, type PipelineStep, type PipelineStepId, type WriterInstruction, type WriterInstructionId } from './writerInstructions';
import { WRITER_INSTRUCTIONS_HISTORY, type WriterInstructionsChange } from './writerInstructionsHistory';
import './writer-instructions.css';

const TITLES = new Map([...WRITER_INSTRUCTIONS.map(block => [block.id, block.title] as const), ...RETIRED_WRITER_INSTRUCTIONS]);
const STEP_OF = new Map(PIPELINE.flatMap(step => step.groups.flatMap(group => group.blocks.map(block => [block.id, step.id] as const))));
const changesTo = (id: WriterInstructionId) => WRITER_INSTRUCTIONS_HISTORY.filter(change => change.changed[id] !== undefined);

type View = PipelineStepId | 'changes';
const VIEWS: readonly View[] = [...PIPELINE.map(step => step.id), 'changes'];
const firstBlock = (step: PipelineStep) => step.groups[0].blocks[0].id;

/** The page's place, kept in the address so a link opens the same step and block. */
const readHash = (): { view: View; block?: WriterInstructionId } => {
  const [view, block] = (typeof window === 'undefined' ? '' : window.location.hash.slice(1)).split('/');
  if (!VIEWS.includes(view as View)) return { view: 'tagger' };
  const step = PIPELINE.find(item => item.id === view);
  const known = step && block && step.groups.some(group => group.blocks.some(item => item.id === block));
  return { view: view as View, ...(known ? { block: block as WriterInstructionId } : {}) };
};

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

function InstructionBlock({ block }: { block: WriterInstruction }) {
  const [raw, setRaw] = useState(false);
  const changes = changesTo(block.id);
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

// ─── One step of the pipeline ────────────────────────────────────────────

function StepView({ step, block, onBlock }: { step: PipelineStep; block: WriterInstructionId; onBlock: (id: WriterInstructionId) => void }) {
  const selected = step.groups.flatMap(group => group.blocks).find(item => item.id === block) ?? step.groups[0].blocks[0];
  const single = step.groups.length === 1 && step.groups[0].blocks.length === 1;
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
      {!single && step.groups.map(group => (
        <div key={group.label} className="wi-picker">
          <h3>{group.label}</h3>
          <div className="wi-chips" role="tablist" aria-label={group.label}>
            {group.blocks.map((item, index) => (
              <button key={item.id} type="button" role="tab" aria-selected={item.id === selected.id} onClick={() => onBlock(item.id)} data-block={item.id}>
                {step.groups.length === 1 || group === step.groups[0] ? <span className="wi-chips__order">{index + 1}</span> : null}{item.title}
              </button>
            ))}
          </div>
        </div>
      ))}
      <InstructionBlock key={selected.id} block={selected} />
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
  const [blocks, setBlocks] = useState<Partial<Record<PipelineStepId, WriterInstructionId>>>(() => {
    const start = readHash();
    return start.block && start.view !== 'changes' ? { [start.view]: start.block } : {};
  });
  const step = PIPELINE.find(item => item.id === view);
  const block = step ? blocks[step.id] ?? firstBlock(step) : undefined;
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.replaceState(null, '', `#${view}${block ? `/${block}` : ''}`);
  }, [view, block]);

  return (
    <main className="writer-instructions">
      <header>
        <h1>What the Models Read</h1>
        <p className="writer-instructions__intro">
          Every word each model in a story is told, straight from the live code. Pick a step to see what it does, what it is given, and its instructions.
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

      {step && block ? <StepView step={step} block={block} onBlock={id => setBlocks(current => ({ ...current, [step.id]: id }))} /> : <ChangesView />}
    </main>
  );
}
