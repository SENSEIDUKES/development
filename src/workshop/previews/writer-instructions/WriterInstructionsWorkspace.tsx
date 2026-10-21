import { HARNESS_PROMPT_HEADINGS, HARNESS_PROMPT_PARTS } from '../../../server/harness-generation/prompt';
import { EVERY_CHAPTER, PLANNER, PLANNER_PART_HEADINGS, PLANNER_PROMPT_PARTS, RETIRED_WRITER_INSTRUCTIONS, SOME_STORIES, WRITER_INSTRUCTIONS, countWords, type WriterInstruction, type WriterInstructionId } from './writerInstructions';
import { WRITER_INSTRUCTIONS_HISTORY, lastChange } from './writerInstructionsHistory';
import './writer-instructions.css';

/** The tag instructions and the planner's own rules are open on arrival; the long ones wait for a tap. */
const OPEN_ON_ARRIVAL: ReadonlySet<WriterInstructionId> = new Set(['planner-rules', 'tag-rules', 'sound-cues', 'soundtrack', 'speakers']);
const TITLES = new Map([...WRITER_INSTRUCTIONS.map(block => [block.id, block.title] as const), ...RETIRED_WRITER_INSTRUCTIONS]);
/** The skeleton's parts the system instruction holds; the next message's parts change every chapter. */
const INSTRUCTION_PARTS = HARNESS_PROMPT_PARTS.filter(part => EVERY_CHAPTER.some(block => block.part === part));
const NEXT_MESSAGE_PARTS = HARNESS_PROMPT_PARTS.filter(part => !INSTRUCTION_PARTS.includes(part));

function InstructionBlock({ block }: { block: WriterInstruction }) {
  const change = lastChange(block.id);
  return (
    <details className="writer-instruction" open={OPEN_ON_ARRIVAL.has(block.id)} data-instruction={block.id}>
      <summary>
        <span className="writer-instruction__title">{block.title}</span>
        <span className="writer-instruction__meta">
          {block.source} · {countWords(block.text).toLocaleString('en')} words
          {change && <> · <span className="writer-instruction__date">changed {change.date}</span></>}
        </span>
      </summary>
      <p className="writer-instruction__when">{block.when}</p>
      <pre className="writer-instruction__text">{block.text}</pre>
    </details>
  );
}

/**
 * The Workshop's Writer Instructions page: every block of text a chapter's two
 * calls read before the story, the planner's first, then the writer's,
 * straight from the live code, with its version, size and the date it last
 * changed, then the dated history.
 */
export function WriterInstructionsWorkspace() {
  const plannerWords = PLANNER.reduce((total, block) => total + countWords(block.text), 0);
  const everyChapterWords = EVERY_CHAPTER.reduce((total, block) => total + countWords(block.text), 0);
  return (
    <main className="writer-instructions">
      <header>
        <h1>Writer Instructions</h1>
        <p className="writer-instructions__intro">
          The exact instructions a chapter&rsquo;s two model calls read, taken from the live code: first the planner, which decides what happens in the chapter, then the writer, which narrates that plan. When the code changes, this page changes with it, and every change must be written into the history at the bottom, with its date, or the build fails.
        </p>
        <p className="writer-instructions__note">
          After these comes the story itself (Story Information, the Codex or the Chapter Plan, the chapter request and the Mission Reminder), which changes every chapter, so it is not shown. Skills a story equips by hand (Pacing, Continuity, Style) and Translation packages are the host&rsquo;s own and are not shown either.
        </p>
      </header>

      <section aria-labelledby="writer-instructions-planner">
        <h2 id="writer-instructions-planner">The planner, before every chapter</h2>
        <p className="writer-instructions__total">{plannerWords.toLocaleString('en')} words in all, for a Regular Reader story.</p>
        <p className="writer-instructions__note">
          Fate: one call before each chapter, on the chapter&rsquo;s own model. It reads the story information and the Codex, and returns the chapter&rsquo;s plan: who is on the page and what happens, chosen from menus. The HARNESS checks the plan against the record before the writer sees it.
        </p>
        {PLANNER_PROMPT_PARTS.map(part => (
          <div key={part} className="writer-instructions__part" data-part={`planner-${part}`}>
            <h3 className="writer-instructions__heading">{PLANNER_PART_HEADINGS[part]}</h3>
            {PLANNER.filter(block => block.plannerPart === part).map(block => <InstructionBlock key={block.id} block={block} />)}
          </div>
        ))}
      </section>

      <section aria-labelledby="writer-instructions-every">
        <h2 id="writer-instructions-every">The writer, every chapter, in order</h2>
        <p className="writer-instructions__total">{everyChapterWords.toLocaleString('en')} words in all, for a story with sound words.</p>
        <p className="writer-instructions__note">
          Every block sits in one part of the writer&rsquo;s prompt, under that part&rsquo;s heading, always in this order. Nothing can be placed outside a part.
        </p>
        {INSTRUCTION_PARTS.map(part => (
          <div key={part} className="writer-instructions__part" data-part={part}>
            <h3 className="writer-instructions__heading">{HARNESS_PROMPT_HEADINGS[part]}</h3>
            {EVERY_CHAPTER.filter(block => block.part === part).map(block => <InstructionBlock key={block.id} block={block} />)}
          </div>
        ))}
        <p className="writer-instructions__note" data-part="next-message">
          Then, in the next message, changing every chapter: {NEXT_MESSAGE_PARTS.map(part => HARNESS_PROMPT_HEADINGS[part].replace(/^# /, '').replace(/ \(.*$/, '')).join(', then ')}.
        </p>
      </section>

      <section aria-labelledby="writer-instructions-some">
        <h2 id="writer-instructions-some">Only in some stories</h2>
        {SOME_STORIES.map(block => <InstructionBlock key={block.id} block={block} />)}
      </section>

      <section aria-labelledby="writer-instructions-history">
        <h2 id="writer-instructions-history">History</h2>
        <ol className="writer-instructions__history">
          {WRITER_INSTRUCTIONS_HISTORY.map(change => (
            <li key={`${change.date}:${Object.keys(change.changed).join(',')}`}>
              <time dateTime={change.date}>{change.date}</time>
              <p>{change.summary}</p>
              <p className="writer-instructions__changed">
                Changed: {(Object.keys(change.changed) as WriterInstructionId[]).map(id => TITLES.get(id)).join(', ')}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
