import { useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { imageExtension, type SavedLabImage } from './imageLabStore';

export type ShownSavedImage = SavedLabImage & { url: string };

function ImageDetails({ image }: { image: ShownSavedImage }) {
  return <>
    <p className="image-lab__image-model">{image.modelLabel}</p>
    <p className="image-lab__try-meta">{image.shape} · {image.seconds}s · {new Date(image.madeAt).toLocaleString('en', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
    {image.attachmentName && <p className="image-lab__try-meta">Reference: {image.attachmentName}</p>}
    <details className="image-lab__prompt-details"><summary>Exact prompt</summary><pre>{image.prompt}</pre></details>
  </>;
}

export function SavedImages({ images, loading, problem, pending, onRemove, onUse }: {
  images: ShownSavedImage[]; loading: boolean; problem?: string; pending: Set<string>;
  onRemove: (id: string) => void; onUse: (image: SavedLabImage) => void;
}) {
  const [selection, setSelection] = useState<string[]>([]);
  const compareRef = useRef<HTMLDivElement>(null);
  const selected = selection.flatMap(id => images.find(image => image.id === id) ?? []);
  const toggle = (id: string) => {
    const next = selected.some(image => image.id === id) ? selected.filter(image => image.id !== id).map(image => image.id) : [...selected.map(image => image.id), id];
    if (next.length > 2) return;
    setSelection(next);
    if (next.length === 2) compareRef.current?.scrollIntoView?.({ block: 'start' });
  };
  return <>
    <div className="image-lab__section-heading"><div><h2>Saved &amp; compare</h2><p className="image-lab__lead">Saved in this browser on this device, with the prompt and settings. Choose two images to compare.</p></div><span className="image-prompts__pill">{images.length} saved</span></div>
    {problem && <p className="image-lab__problem" role="alert">{problem}</p>}
    {loading && <p role="status">Opening saved images…</p>}
    <div ref={compareRef} className="image-lab__comparison" data-image-comparison>
      <div className="image-lab__section-heading"><h3>Compare images <span>{selected.length} / 2</span></h3>
        {selected.length > 0 && <button type="button" className="image-lab__link" onClick={() => setSelection([])}>Clear comparison</button>}
      </div>
      <p className="image-lab__lead" role="status">{selected.length === 2 ? 'Both images use the same display area; their original proportions are preserved.' : selected.length === 1 ? 'Choose one more image below.' : 'Select Compare on two saved images, from any tries or models.'}</p>
      <div className="image-lab__compare-pair">
        {[0, 1].map(index => <div key={index} className="image-lab__compare-slot">
          {selected[index] ? <figure data-comparison-image={selected[index].id}>
            <div className="image-lab__compare-image"><img src={selected[index].url} alt={`Comparison ${index === 0 ? 'A' : 'B'}: ${selected[index].prompt.slice(0, 120)}`} /></div>
            <figcaption><strong>{index === 0 ? 'A' : 'B'}</strong><ImageDetails image={selected[index]} />
              <button type="button" className="image-prompts__button" onClick={() => onUse(selected[index])}>Use this prompt</button>
            </figcaption>
          </figure> : <div className="image-lab__compare-placeholder">{index === 0 ? 'A' : 'B'}<span>Choose an image below</span></div>}
        </div>)}
      </div>
    </div>
    {!loading && !images.length && <p className="image-lab__empty">No saved images yet. Make an image in the Lab, then choose Save image. You can return to it after reloading this page.</p>}
    <ul className="image-lab__saved-grid" aria-label="Saved images">
      {images.map((image, index) => {
        const compared = selected.some(item => item.id === image.id);
        return <li key={image.id} data-saved-image={image.id}>
          <figure><img className="image-lab__saved-thumbnail" src={image.url} alt={`Saved image ${index + 1}: ${image.prompt.slice(0, 120)}`} loading="lazy" />
            <a className="image-lab__download" href={image.url} download={`image-lab-${image.id}.${imageExtension(image.blob)}`} aria-label={`Download saved image ${index + 1}`} title="Download"><Download size={18} /></a>
            <figcaption><ImageDetails image={image} />
              <button type="button" className={`image-prompts__button${compared ? ' image-prompts__button--primary' : ''}`} aria-pressed={compared} disabled={!compared && selected.length === 2} onClick={() => toggle(image.id)}>{compared ? 'In comparison' : 'Compare'}</button>
              <button type="button" className="image-prompts__button" onClick={() => onUse(image)}>Use this prompt</button>
              <button type="button" className="image-lab__link" disabled={pending.has(image.id)} onClick={() => onRemove(image.id)}>{pending.has(image.id) ? 'Removing…' : 'Remove saved image'}</button>
            </figcaption>
          </figure>
        </li>;
      })}
    </ul>
  </>;
}
