import { AFTER_A_CHAPTER, EVERY_CHAPTER, SOME_STORIES, WRITER_INSTRUCTIONS, countWords, type WriterInstruction, type WriterInstructionId } from './writerInstructions';
import { WRITER_INSTRUCTIONS_HISTORY, lastChange } from './writerInstructionsHistory';
import './writer-instructions.css';

/** The tag instructions are open on arrival; the long ones wait for a tap. */
const OPEN_ON_ARRIVAL: ReadonlySet<WriterInstructionId> = new Set(['tag-rules', 'sound-cues', 'speakers', 'holdings']);
const TITLES = new Map(WRITER_INSTRUCTIONS.map(block => [block.id, block.title]));

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
          After these comes the story itself (Story Information and the chapter request), which changes every chapter, so it is not shown. Skills a story equips by hand (Pacing, Continuity, Style) and Translation packages are the host&rsquo;s own and are not shown either.
        </p>
      </header>

      <section aria-labelledby="writer-instructions-every">
        <h2 id="writer-instructions-every">Every chapter, in order</h2>
        <p className="writer-instructions__total">{everyChapterWords.toLocaleString('en')} words in all, for a story with sound words.</p>
        {EVERY_CHAPTER.map(block => <InstructionBlock key={block.id} block={block} />)}
      </section>

      <section aria-labelledby="writer-instructions-some">
        <h2 id="writer-instructions-some">Only in some stories</h2>
        {SOME_STORIES.map(block => <InstructionBlock key={block.id} block={block} />)}
      </section>

      <section aria-labelledby="writer-instructions-after">
        <h2 id="writer-instructions-after">After a chapter</h2>
        <p className="writer-instructions__note">
          Not the chapter writer: a separate small check that settles a saved chapter&rsquo;s holdings problems quietly and keeps a record on the chapter.
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
