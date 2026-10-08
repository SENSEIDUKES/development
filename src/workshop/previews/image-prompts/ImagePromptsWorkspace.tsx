import { IMAGE_IDEAS, IMAGE_KINDS, IMAGE_PROMPTS, IMAGE_STATUS_LABEL, countWords, type ImageKind, type ImagePrompt, type ImagePromptId } from './imagePrompts';
import { IMAGE_PROMPTS_HISTORY, lastChange } from './imagePromptsHistory';
import '../writer-instructions/writer-instructions.css';
import './image-prompts.css';

const TITLES = new Map(IMAGE_PROMPTS.map(prompt => [prompt.id, prompt.title]));

function PromptBlock({ prompt, open }: { prompt: ImagePrompt; open: boolean }) {
  const change = lastChange(prompt.id);
  return (
    <details className="writer-instruction" open={open} data-image-prompt={prompt.id}>
      <summary>
        <span className="writer-instruction__title">{prompt.title}</span>
        <span className="writer-instruction__meta">
          {prompt.source} · {countWords(prompt.text).toLocaleString('en')} words
          {change && <> · <span className="writer-instruction__date">changed {change.date}</span></>}
        </span>
      </summary>
      <p className="writer-instruction__when">{prompt.when}</p>
      <pre className="writer-instruction__text">{prompt.text}</pre>
    </details>
  );
}

function KindSection({ kind }: { kind: ImageKind }) {
  const headingId = `image-kind-${kind.id}`;
  return (
    <section aria-labelledby={headingId} data-image-kind={kind.id} className="image-kind">
      <h2 id={headingId}>{kind.title}</h2>
      <p className="image-kind__status" data-status={kind.status}>{IMAGE_STATUS_LABEL[kind.status]}</p>
      <p className="writer-instructions__note">{kind.summary}</p>
      {kind.prompts.map((prompt, index) => <PromptBlock key={prompt.id} prompt={prompt} open={kind.status === 'in-the-app' && index === 0} />)}
      <h3 className="image-kind__rules-title">Rules</h3>
      <ul className="image-kind__rules">
        {kind.rules.map(rule => (
          <li key={rule.title}>
            <strong>{rule.title}</strong>
            <p>{rule.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The Workshop's Image Prompts page: every image prompt by kind of image
 * (cover art, the profile picture, Codex portraits and places, chapter scene
 * art, Familiar art), the app's own read from the live code and the old
 * app's quoted word for word, each with its rules; then the ideas for images
 * that change over time, and the dated history.
 */
export function ImagePromptsWorkspace() {
  return (
    <main className="writer-instructions image-prompts">
      <header>
        <h1>Image Prompts</h1>
        <p className="writer-instructions__intro">
          Every prompt an image model is given, by kind of image, with the rules around it. The app&rsquo;s own prompts come from the live code, so this page changes with them; the old app&rsquo;s are quoted word for word so they can be refined and rebuilt. Words in braces are filled in for each image. Every change must be written into the history at the bottom, with its date, or the build fails.
        </p>
      </header>

      <nav aria-label="Kinds of image" className="image-prompts__index">
        <ol>
          {IMAGE_KINDS.map(kind => (
            <li key={kind.id}><a href={`#image-kind-${kind.id}`}>{kind.title}</a> <span data-status={kind.status}>{IMAGE_STATUS_LABEL[kind.status]}</span></li>
          ))}
          <li><a href="#image-ideas">Images that change over time</a></li>
        </ol>
      </nav>

      {IMAGE_KINDS.map(kind => <KindSection key={kind.id} kind={kind} />)}

      <section aria-labelledby="image-ideas" data-image-ideas>
        <h2 id="image-ideas">Images that change over time</h2>
        <p className="writer-instructions__note">Ideas, not built. Kept here so they are designed on purpose when these images are rebuilt.</p>
        <ul className="image-kind__rules">
          {IMAGE_IDEAS.map(idea => (
            <li key={idea.title}>
              <strong>{idea.title}</strong>
              <p>{idea.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="image-prompts-history">
        <h2 id="image-prompts-history">History</h2>
        <ol className="writer-instructions__history">
          {IMAGE_PROMPTS_HISTORY.map(change => (
            <li key={`${change.date}:${Object.keys(change.changed).join(',')}`}>
              <time dateTime={change.date}>{change.date}</time>
              <p>{change.summary}</p>
              <p className="writer-instructions__changed">
                Changed: {(Object.keys(change.changed) as ImagePromptId[]).map(id => TITLES.get(id)).join(', ')}
              </p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
