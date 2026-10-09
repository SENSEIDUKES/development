import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { STORY_COVER_ASPECT_RATIO } from '../../../server/story-cover/prompt';
import type { ImageLabAspectRatio } from '../../../server/image-lab/limits';
import { IMAGE_IDEAS, IMAGE_KINDS, IMAGE_PROMPTS, IMAGE_STATUS_LABEL, RETIRED_IMAGE_PROMPTS, countWords, type ImageKind, type ImagePrompt, type ImagePromptId, type ImageRule } from './imagePrompts';
import { IMAGE_PROMPTS_HISTORY, lastChange } from './imagePromptsHistory';
import { ImageLab, type ImageLabProps } from './ImageLab';
import '../writer-instructions/writer-instructions.css';
import './image-prompts.css';

const TITLES = new Map<string, string>([...Object.entries(RETIRED_IMAGE_PROMPTS), ...IMAGE_PROMPTS.map(prompt => [prompt.id, prompt.title] as const)]);

type TabId = 'lab' | ImageKind['id'] | 'ideas' | 'history';
interface Tab { id: TabId; label: string; status?: ImageKind['status'] }

const TABS: Tab[] = [
  { id: 'lab', label: 'Image Lab' },
  ...IMAGE_KINDS.map(kind => ({ id: kind.id, label: kind.title.replace(/ \(.*\)$/, ''), status: kind.status })),
  { id: 'ideas', label: 'Ideas' },
  { id: 'history', label: 'History' },
];

/** The shape a prompt is tried at: covers are 2:3 like the app's; the old app made every image square. */
const shapeFor = (kind: ImageKind): ImageLabAspectRatio => (kind.id === 'cover' ? STORY_COVER_ASPECT_RATIO : '1:1');

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = () => {
    const done = (next: 'copied' | 'failed') => { setState(next); window.setTimeout(() => setState('idle'), 1600); };
    if (!navigator.clipboard) { done('failed'); return; }
    navigator.clipboard.writeText(text).then(() => done('copied'), () => done('failed'));
  };
  return <button type="button" className="image-prompts__button" onClick={copy} aria-live="polite">
    {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}
  </button>;
}

function PromptCard({ prompt, kind, onTry }: { prompt: ImagePrompt; kind: ImageKind; onTry: (prompt: ImagePrompt, kind: ImageKind) => void }) {
  const [expanded, setExpanded] = useState(false);
  const change = lastChange(prompt.id);
  const words = countWords(prompt.text);
  const long = words > 60;
  return (
    <article className="image-prompt-card" data-image-prompt={prompt.id}>
      <h3>{prompt.title}</h3>
      <p className="image-prompt-card__meta">
        {prompt.source} · {words.toLocaleString('en')} words{change && <> · changed {change.date}</>}
      </p>
      <p className="image-prompt-card__when">{prompt.when}</p>
      <pre className="image-prompt-card__text" data-clamped={long && !expanded ? '' : undefined}>{prompt.text}</pre>
      <div className="image-prompt-card__actions">
        {long && <button type="button" className="image-prompts__button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
          {expanded ? 'Show less' : 'Show all'}
        </button>}
        <CopyButton text={prompt.text} />
        <button type="button" className="image-prompts__button image-prompts__button--primary" onClick={() => onTry(prompt, kind)}>Try this prompt</button>
      </div>
    </article>
  );
}

function RuleCards({ rules }: { rules: ImageRule[] }) {
  return <ul className="image-rule-cards">
    {rules.map(rule => (
      <li key={rule.title}>
        <strong>{rule.title}</strong>
        <p>{rule.text}</p>
      </li>
    ))}
  </ul>;
}

function KindPanel({ kind, onTry }: { kind: ImageKind; onTry: (prompt: ImagePrompt, kind: ImageKind) => void }) {
  return (
    <div data-image-kind={kind.id} className="image-kind">
      <h2>{kind.title}</h2>
      <p className="image-prompts__pill" data-status={kind.status}>{IMAGE_STATUS_LABEL[kind.status]}</p>
      <p className="image-kind__summary">{kind.summary}</p>
      <h3 className="image-kind__heading">Prompts <span>{kind.prompts.length}</span></h3>
      <div className="image-kind__prompts">
        {kind.prompts.map(prompt => <PromptCard key={prompt.id} prompt={prompt} kind={kind} onTry={onTry} />)}
      </div>
      <h3 className="image-kind__heading">Rules <span>{kind.rules.length}</span></h3>
      <RuleCards rules={kind.rules} />
    </div>
  );
}

/**
 * The Workshop's Image Prompts page: one tab per kind of image (cover art,
 * the profile picture, Codex portraits and places, chapter scene art,
 * Familiar art), each with its prompts as cards and its rules, the app's own
 * read from the live code and the old app's quoted word for word; then the
 * ideas for images that change over time and the dated history. The Image
 * Lab tab makes an image from any prompt, so a prompt can be refined by
 * seeing what it makes.
 */
export function ImagePromptsWorkspace({ fetcher }: { fetcher?: typeof fetch } = {}) {
  const [active, setActive] = useState<TabId>(IMAGE_KINDS[0].id);
  const [incoming, setIncoming] = useState<ImageLabProps['incoming']>();
  const tabRefs = useRef(new Map<TabId, HTMLButtonElement>());
  const topRef = useRef<HTMLDivElement>(null);

  const select = (id: TabId, focus = false) => {
    setActive(id);
    const button = tabRefs.current.get(id);
    if (focus) button?.focus();
    button?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (event.key === 'Home') { event.preventDefault(); select(TABS[0].id, true); return; }
    if (event.key === 'End') { event.preventDefault(); select(TABS[TABS.length - 1].id, true); return; }
    if (!step) return;
    event.preventDefault();
    select(TABS[(index + step + TABS.length) % TABS.length].id, true);
  };
  const tryPrompt = (prompt: ImagePrompt, kind: ImageKind) => {
    setIncoming(current => ({ prompt: prompt.text, shape: shapeFor(kind), variations: kind.variations, key: (current?.key ?? 0) + 1 }));
    select('lab');
    topRef.current?.scrollIntoView?.({ block: 'start' });
  };

  const panel = (id: TabId, children: ReactNode) => (
    <div key={id} role="tabpanel" id={`image-prompts-panel-${id}`} aria-labelledby={`image-prompts-tab-${id}`}
      hidden={active !== id} tabIndex={0} className="image-prompts__panel">
      {children}
    </div>
  );

  return (
    <main className="writer-instructions image-prompts">
      <header>
        <h1>Image Prompts</h1>
        <p className="writer-instructions__intro">
          Every prompt an image model is given, by kind of image, with its rules. Open a kind below; try any prompt in the Image Lab.
        </p>
        <details className="image-prompts__about">
          <summary>How this page works</summary>
          <p>The app&rsquo;s own prompts come from the live code, so this page changes with them; the old app&rsquo;s are quoted word for word so they can be refined and rebuilt. Words in braces are filled in for each image. Every change to a prompt must be written into the History tab, with its date, or the build fails.</p>
        </details>
      </header>

      <div ref={topRef} className="image-prompts__tabs-wrap">
        <div role="tablist" aria-label="Image Prompts" className="image-prompts__tabs">
          {TABS.map((tab, index) => (
            <button key={tab.id} type="button" role="tab" id={`image-prompts-tab-${tab.id}`}
              ref={element => { if (element) tabRefs.current.set(tab.id, element); else tabRefs.current.delete(tab.id); }}
              aria-selected={active === tab.id} aria-controls={`image-prompts-panel-${tab.id}`} tabIndex={active === tab.id ? 0 : -1}
              data-tab={tab.id} className="image-prompts__tab"
              onClick={() => select(tab.id)} onKeyDown={event => onTabKey(event, index)}>
              {tab.status && <span className="image-prompts__dot" data-status={tab.status} aria-hidden="true" />}
              {tab.label}
              {tab.status && <span className="image-prompts__sr">, {IMAGE_STATUS_LABEL[tab.status]}</span>}
            </button>
          ))}
        </div>
      </div>

      {panel('lab', <ImageLab incoming={incoming} fetcher={fetcher} />)}
      {IMAGE_KINDS.map(kind => panel(kind.id, <KindPanel kind={kind} onTry={tryPrompt} />))}
      {panel('ideas', (
        <div data-image-ideas>
          <h2>Images that change over time</h2>
          <p className="image-kind__summary">Ideas, not built. Kept here so they are designed on purpose when these images are rebuilt.</p>
          <RuleCards rules={IMAGE_IDEAS} />
        </div>
      ))}
      {panel('history', (
        <>
          <h2>History</h2>
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
        </>
      ))}
    </main>
  );
}
