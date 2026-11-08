import { useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { STORY_COVER_ASPECT_RATIO } from '../../../server/story-cover/prompt';
import type { ImageLabAspectRatio } from '../../../server/image-lab/limits';
import { IMAGE_IDEAS, IMAGE_KINDS, IMAGE_PROMPTS, IMAGE_STATUS_LABEL, RETIRED_IMAGE_PROMPTS, countWords, type ImageKind, type ImagePrompt, type ImagePromptId, type ImageRule } from './imagePrompts';
import { IMAGE_PROMPTS_HISTORY, lastChange } from './imagePromptsHistory';
import { ImageLab, type ImageLabProps } from './ImageLab';
import type { ImageLabStore } from './imageLabStore';
import '../writer-instructions/writer-instructions.css';
import './image-prompts.css';

const TITLES = new Map<string, string>([...Object.entries(RETIRED_IMAGE_PROMPTS), ...IMAGE_PROMPTS.map(prompt => [prompt.id, prompt.title] as const)]);
type ParentTab = 'prompts' | 'lab' | 'saved' | 'ideas' | 'history';
interface Tab { id: string; label: string; detail?: string; status?: ImageKind['status'] }
const PARENT_TABS: Tab[] = [
  { id: 'prompts', label: 'Prompts', detail: 'Read by kind of image' },
  { id: 'lab', label: 'Image Lab', detail: 'Edit a prompt and generate' },
  { id: 'saved', label: 'Saved & compare', detail: 'Keep results. Compare two.' },
  { id: 'ideas', label: 'Ideas', detail: 'Images that evolve' },
  { id: 'history', label: 'History', detail: 'Every prompt change' },
];

/** Parent cards and prompt blocks follow What the Models Read. */
function PromptTabs({ id, label, tabs, active, onSelect, cards = false }: {
  id: string; label: string; tabs: Tab[]; active: string; onSelect: (id: string) => void; cards?: boolean;
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const index = tabs.findIndex(tab => tab.id === active);
  const select = (next: string, focus = false) => {
    onSelect(next);
    const button = refs.current.get(next);
    if (focus) button?.focus({ preventScroll: true });
    button?.scrollIntoView?.({ block: 'nearest', inline: 'center' });
  };
  const move = (step: number, focus = false) => select(tabs[(index + step + tabs.length) % tabs.length].id, focus);
  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home' || event.key === 'End') select(tabs[event.key === 'Home' ? 0 : tabs.length - 1].id, true);
    else move(event.key === 'ArrowRight' ? 1 : -1, true);
  };
  return <div className={`image-prompts__navigation${cards ? ' image-prompts__navigation--parents' : ''}`}>
    <div role="tablist" aria-label={label} className={cards ? 'image-prompts__parents' : 'image-prompts__tabs'}>
      {tabs.map((tab, tabIndex) => <button key={tab.id} type="button" role="tab" id={`${id}-tab-${tab.id}`}
        ref={element => { if (element) refs.current.set(tab.id, element); else refs.current.delete(tab.id); }}
        aria-selected={active === tab.id} aria-controls={`${id}-panel-${tab.id}`} tabIndex={active === tab.id ? 0 : -1}
        data-tab={tab.id} className={cards ? 'image-prompts__parent' : 'image-prompts__tab'}
        onClick={() => select(tab.id)} onKeyDown={onKey}>
        {cards && <span className="image-prompts__tab-number">{String(tabIndex + 1).padStart(2, '0')}</span>}
        <span className="image-prompts__tab-name">
          {tab.status && <span className="image-prompts__dot" data-status={tab.status} aria-hidden="true" />}
          {tab.label}
        </span>
        {tab.detail && <span className="image-prompts__tab-detail">{tab.detail}</span>}
      </button>)}
    </div>
    {tabs.length > 1 && <div className="image-prompts__arrows">
      <span>{index + 1} / {tabs.length}</span>
      <button type="button" aria-label={`Previous ${label.toLowerCase()} tab`} onClick={() => move(-1)}><ChevronLeft size={18} /></button>
      <button type="button" aria-label={`Next ${label.toLowerCase()} tab`} onClick={() => move(1)}><ChevronRight size={18} /></button>
    </div>}
  </div>;
}

const shapeFor = (kind: ImageKind): ImageLabAspectRatio => kind.id === 'cover' ? STORY_COVER_ASPECT_RATIO : '1:1';

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
  const change = lastChange(prompt.id);
  return <article className="image-prompt-card" data-image-prompt={prompt.id}>
    <div className="image-prompt-card__header">
      <div><h3>{prompt.title}</h3><p className="image-prompt-card__meta">{countWords(prompt.text).toLocaleString('en')} words{change && <> · changed {change.date}</>}</p></div>
      <div className="image-prompt-card__actions"><CopyButton text={prompt.text} />
        <button type="button" className="image-prompts__button image-prompts__button--primary" onClick={() => onTry(prompt, kind)}>Try this prompt</button>
      </div>
    </div>
    <p className="image-prompt-card__when">{prompt.when}</p>
    <pre className="image-prompt-card__text">{prompt.text}</pre>
    <details className="image-prompt-card__source"><summary>Prompt source</summary><p>{prompt.source}</p></details>
  </article>;
}

function RuleCards({ rules }: { rules: ImageRule[] }) {
  return <ul className="image-rule-cards">{rules.map(rule => <li key={rule.title}><strong>{rule.title}</strong><p>{rule.text}</p></li>)}</ul>;
}

function KindPanel({ kind, onTry }: { kind: ImageKind; onTry: (prompt: ImagePrompt, kind: ImageKind) => void }) {
  const [promptId, setPromptId] = useState(kind.prompts[0].id);
  const id = `image-kind-${kind.id}`;
  return <div data-image-kind={kind.id} className="image-kind">
    <div className="image-kind__title"><h2>{kind.title}</h2><span className="image-prompts__pill" data-status={kind.status}>{IMAGE_STATUS_LABEL[kind.status]}</span></div>
    <p className="image-kind__summary">{kind.summary}</p>
    <PromptTabs id={id} label={`${kind.title} prompts`} tabs={kind.prompts.map(prompt => ({ id: prompt.id, label: prompt.title }))}
      active={promptId} onSelect={value => setPromptId(value as ImagePromptId)} />
    {kind.prompts.map(prompt => <div key={prompt.id} role="tabpanel" id={`${id}-panel-${prompt.id}`} aria-labelledby={`${id}-tab-${prompt.id}`} hidden={promptId !== prompt.id}>
      <PromptCard prompt={prompt} kind={kind} onTry={onTry} />
    </div>)}
    <details className="image-kind__rules"><summary>Rules for {kind.title.toLowerCase()} <span>{kind.rules.length}</span></summary><RuleCards rules={kind.rules} /></details>
  </div>;
}

/** Workshop-owned prompt reference, generation workbench and device image library. */
export function ImagePromptsWorkspace({ fetcher, savedStore }: { fetcher?: typeof fetch; savedStore?: ImageLabStore } = {}) {
  const [active, setActive] = useState<ParentTab>('prompts');
  const [kindId, setKindId] = useState(IMAGE_KINDS[0].id);
  const [incoming, setIncoming] = useState<ImageLabProps['incoming']>();
  const topRef = useRef<HTMLDivElement>(null);
  const tryPrompt = (prompt: ImagePrompt, kind: ImageKind) => {
    setIncoming(current => ({ prompt: prompt.text, label: `${kind.title} · ${prompt.title}`, shape: shapeFor(kind), variations: kind.variations, key: (current?.key ?? 0) + 1 }));
    setActive('lab');
    topRef.current?.scrollIntoView?.({ block: 'start' });
  };
  const panelProps = (tab: ParentTab) => ({ role: 'tabpanel', id: `image-prompts-panel-${tab}`, 'aria-labelledby': `image-prompts-tab-${tab}`, hidden: active !== tab, className: 'image-prompts__panel' });
  return <main className="writer-instructions image-prompts">
    <header><h1>Image Prompts</h1>
      <p className="writer-instructions__intro">Read the prompts. Try your changes. Keep the images worth comparing.</p>
      <details className="image-prompts__about"><summary>How this page works</summary>
        <p>The app&rsquo;s own prompts come from the live code; the old app&rsquo;s are reference material. Trying a prompt in the Lab does not change the app. Saved images and their exact prompts stay in this browser on this device. Download an image to keep a separate copy.</p>
      </details>
    </header>
    <div ref={topRef} className="image-prompts__tabs-wrap">
      <PromptTabs id="image-prompts" label="Image Prompts" cards tabs={PARENT_TABS} active={active} onSelect={value => setActive(value as ParentTab)} />
    </div>
    <section {...panelProps('prompts')}>
      <PromptTabs id="image-kinds" label="Image kinds" tabs={IMAGE_KINDS.map(kind => ({ id: kind.id, label: kind.title.replace(/ \(.*\)$/, ''), status: kind.status }))} active={kindId} onSelect={setKindId} />
      {IMAGE_KINDS.map(kind => <section key={kind.id} role="tabpanel" id={`image-kinds-panel-${kind.id}`} aria-labelledby={`image-kinds-tab-${kind.id}`} hidden={kindId !== kind.id}>
        <KindPanel kind={kind} onTry={tryPrompt} />
      </section>)}
    </section>
    <ImageLab incoming={incoming} fetcher={fetcher} savedStore={savedStore} active={active}
      onOpenLab={() => { setActive('lab'); topRef.current?.scrollIntoView?.({ block: 'start' }); }}
      onOpenSaved={() => { setActive('saved'); topRef.current?.scrollIntoView?.({ block: 'start' }); }} />
    <section {...panelProps('ideas')} data-image-ideas><h2>Images that change over time</h2>
      <p className="image-kind__summary">Ideas, not built. Kept here so they are designed on purpose when these images are rebuilt.</p><RuleCards rules={IMAGE_IDEAS} />
    </section>
    <section {...panelProps('history')}><h2>Prompt history</h2>
      <p className="image-kind__summary">Every change to the app&rsquo;s prompts, with its date. Lab experiments leave these words unchanged.</p>
      <ol className="writer-instructions__history">{IMAGE_PROMPTS_HISTORY.map((change, index) => <li key={`${change.date}:${index}`}>
        <time dateTime={change.date}>{change.date}</time><p>{change.summary}</p>
        <p className="writer-instructions__changed">Changed: {(Object.keys(change.changed) as ImagePromptId[]).map(id => TITLES.get(id)).join(', ')}</p>
      </li>)}</ol>
    </section>
  </main>;
}
