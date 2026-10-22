import { HARNESS_PROMPT_HEADINGS, HARNESS_PROMPT_PARTS } from '../../../server/harness-generation/prompt';
import { AFTER_A_CHAPTER, EVERY_CHAPTER, RETIRED_WRITER_INSTRUCTIONS, SOME_STORIES, WRITER_INSTRUCTIONS, countWords, type WriterInstruction, type WriterInstructionId } from './writerInstructions';
import { WRITER_INSTRUCTIONS_HISTORY, lastChange } from './writerInstructionsHistory';
import './writer-instructions.css';

/** The tag instructions are open on arrival; the long ones wait for a tap. */
const OPEN_ON_ARRIVAL: ReadonlySet<WriterInstructionId> = new Set(['tag-rules', 'sound-cues', 'soundtrack', 'speakers', 'holdings', 'appearance']);
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
 * The Workshop's Writer Instructions page: every block of text the chapter
 * writer reads before the story, straight from the live code, with its
 * version, size and the date it last changed, then the dated history.
 */
export function WriterInstructionsWorkspace() {
  const everyChapterWords = EVERY_CHAPTER.reduce((total, block) => total + countWords(block.text), 0);
  return (
    <main className="writer-instructions">
      <header>
        <h1>Writer Instructions</h1>
        <p className="writer-instructions__intro">
          The exact instructions the writing model reads before it writes a chapter, taken from the live code. When the code changes, this page changes with it, and every change must be written into the history at the bottom, with its date, or the build fails.
        </p>
        <p className="writer-instructions__note">
          After these comes the story itself (Story Information, the chapter request and the Mission Reminder), which changes every chapter, so it is not shown. Skills a story equips by hand (Pacing, Continuity, Style) and Translation packages are the host&rsquo;s own and are not shown either.
        </p>
      </header>

      <section aria-labelledby="writer-instructions-every">
        <h2 id="writer-instructions-every">Every chapter, in order</h2>
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

      <section aria-labelledby="writer-instructions-after">
        <h2 id="writer-instructions-after">After a chapter</h2>
        <p className="writer-instructions__note">
          Not the chapter writer: separate small calls on a saved chapter, each keeping a record on it. The Holdings fixer settles its holdings problems quietly; the look step writes down how everyone and everything it tagged looks.
        </p>
        {AFTER_A_CHAPTER.map(block => <InstructionBlock key={block.id} block={block} />)}
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
