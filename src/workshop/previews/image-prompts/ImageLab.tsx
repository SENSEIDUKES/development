import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { EnergyActionCost, EnergySpendFloater, getEnergyPriceEntry, type EnergySpendBurst } from '@seihouse/library/energy';
import { createSavedAccessToken } from '../../../host/generation/accessToken';
import { preferredModel, useModelPreference } from '../../../host/generation/modelPreference';
import { IMAGE_LAB_ASPECT_RATIOS, IMAGE_LAB_ATTACHMENT_TYPES, IMAGE_LAB_PROMPT_LIMIT, IMAGE_LAB_VARIATIONS, type ImageLabAspectRatio } from '../../../server/image-lab/limits';
import { generateLabImage, loadImageModels, readAttachment, type ImageLabAttachment, type ImageModelChoices } from './imageLabClient';
import { IndexedDbImageLabStore, imageExtension, type ImageLabStore, type SavedLabImage } from './imageLabStore';
import { SavedImages, type ShownSavedImage } from './SavedImages';

export type ImageLabVariations = typeof IMAGE_LAB_VARIATIONS[number];
const SHAPE_LABEL: Record<ImageLabAspectRatio, string> = {
  '1:1': 'Square 1:1', '2:3': 'Cover 2:3', '3:2': 'Wide 3:2', '3:4': 'Portrait 3:4',
  '4:3': 'Landscape 4:3', '9:16': 'Phone 9:16', '16:9': 'Screen 16:9',
};
interface LabImage { id: string; url: string; blob: Blob; model: string; modelLabel: string; seconds: number }
interface LabTry {
  id: string; prompt: string; shape: ImageLabAspectRatio; attachmentName?: string;
  madeAt: string; images: LabImage[]; chosen?: string;
}
export interface ImageLabProps {
  incoming?: { prompt: string; label?: string; shape?: ImageLabAspectRatio; variations?: ImageLabVariations; key: number };
  fetcher?: typeof fetch;
  savedStore?: ImageLabStore;
  active?: string;
  onOpenLab?: () => void;
  onOpenSaved?: () => void;
}

function TryImages({ item, saved, pending, loading, onSave, onChoose }: {
  item: LabTry; saved: ShownSavedImage[]; pending: Set<string>; loading: boolean;
  onSave: (image: LabImage, item: LabTry) => void; onChoose: (tryId: string, imageId: string) => void;
}) {
  const galleryRef = useRef<HTMLOListElement>(null);
  const slide = (direction: number) => galleryRef.current?.scrollBy({ left: direction * galleryRef.current.clientWidth });
  return <>
    <div className="image-lab__section-heading"><p className="image-lab__try-meta">{new Date(item.madeAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })} · {SHAPE_LABEL[item.shape]}{item.attachmentName ? ` · with ${item.attachmentName}` : ''}</p>
      {item.images.length > 1 && <div className="image-prompts__arrows image-lab__variation-arrows"><button type="button" aria-label="Previous result" onClick={() => slide(-1)}><ChevronLeft size={18} /></button><button type="button" aria-label="Next result" onClick={() => slide(1)}><ChevronRight size={18} /></button></div>}
    </div>
    <ol ref={galleryRef} className="image-lab__gallery" data-count={item.images.length}>
      {item.images.map((image, index) => {
        const kept = saved.some(result => result.id === image.id);
        return <li key={image.id} data-chosen={item.chosen === image.id || undefined}>
          <figure><img src={image.url} style={{ aspectRatio: item.shape.replace(':', ' / ') }} alt={`${item.images.length > 1 ? `Variation ${index + 1}, made` : 'Made'} from: ${item.prompt.slice(0, 120)}`} />
            <a className="image-lab__download" href={image.url} download={`image-lab-${image.id}.${imageExtension(image.blob)}`} aria-label={item.images.length > 1 ? `Download variation ${index + 1}` : 'Download image'} title="Download"><Download size={18} /></a>
            <figcaption><span className="image-lab__image-model">{image.modelLabel}</span><span>{image.seconds}s{item.images.length > 1 ? ` · ${index + 1} of ${item.images.length}` : ''}</span>
              <div className="image-lab__actions">
                <button type="button" className="image-prompts__button" data-save-image aria-live="polite" disabled={kept || pending.has(image.id) || loading} onClick={() => onSave(image, item)}>{kept ? 'Saved' : pending.has(image.id) ? 'Saving…' : 'Save image'}</button>
                {item.images.length > 1 && <button type="button" className={`image-prompts__button${item.chosen === image.id ? ' image-prompts__button--primary' : ''}`} aria-pressed={item.chosen === image.id} onClick={() => onChoose(item.id, image.id)}>{item.chosen === image.id ? 'Chosen' : 'Choose'}</button>}
              </div>
            </figcaption>
          </figure>
        </li>;
      })}
    </ol>
  </>;
}

/** One workbench owns the draft, visit results and explicitly saved device images. */
export function ImageLab({ incoming, fetcher, savedStore, active = 'lab', onOpenLab, onOpenSaved }: ImageLabProps) {
  const tokenStore = useMemo(() => createSavedAccessToken(), []);
  const store = useMemo(() => savedStore ?? new IndexedDbImageLabStore(), [savedStore]);
  const [savedToken, setSavedToken] = useState(() => tokenStore.current);
  const [tokenDraft, setTokenDraft] = useState('');
  const [prompt, setPrompt] = useState(incoming?.prompt ?? '');
  const [sourceLabel, setSourceLabel] = useState(incoming?.label);
  const [shape, setShape] = useState<ImageLabAspectRatio>(incoming?.shape ?? '1:1');
  const [choices, setChoices] = useState<ImageModelChoices>();
  const [routerPreference] = useModelPreference('images');
  const [model, setModel] = useState<string>();
  const [workingCount, setWorkingCount] = useState<ImageLabVariations>();
  const working = workingCount !== undefined;
  const [problem, setProblem] = useState<string>();
  const [variations, setVariations] = useState<ImageLabVariations>(incoming?.variations ?? 1);
  const [attachment, setAttachment] = useState<ImageLabAttachment & { previewUrl: string }>();
  const [readingAttachment, setReadingAttachment] = useState(false);
  const [tries, setTries] = useState<LabTry[]>([]);
  const [saved, setSaved] = useState<ShownSavedImage[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [storageProblem, setStorageProblem] = useState<string>();
  const [pending, setPending] = useState(new Set<string>());
  const pendingRef = useRef(new Set<string>());
  const making = useRef(false);
  const live = useRef(true);
  const attachmentRead = useRef(0);
  const [spent, setSpent] = useState<EnergySpendBurst>();
  const imagePrice = getEnergyPriceEntry('image.generate').price ?? 0;
  const urls = useRef(new Set<string>());
  const fileInput = useRef<HTMLInputElement>(null);
  const promptInput = useRef<HTMLTextAreaElement>(null);
  const focusRestoredPrompt = useRef(false);
  const resultsPanel = useRef<HTMLElement>(null);
  const lastShownTry = useRef<string>(undefined);
  const ids = { prompt: useId(), model: useId(), shape: useId(), token: useId(), variations: useId() };
  const keepUrl = (blob: Blob) => { const url = URL.createObjectURL(blob); urls.current.add(url); return url; };
  const releaseUrl = (url: string) => { URL.revokeObjectURL(url); urls.current.delete(url); };

  useEffect(() => {
    if (!incoming) return;
    setPrompt(incoming.prompt);
    setSourceLabel(incoming.label);
    if (incoming.shape) setShape(incoming.shape);
    if (incoming.variations) setVariations(incoming.variations);
    promptInput.current?.focus({ preventScroll: true });
  }, [incoming]);
  useEffect(() => {
    if (active === 'lab' && focusRestoredPrompt.current) {
      promptInput.current?.focus({ preventScroll: true });
      focusRestoredPrompt.current = false;
    }
  }, [active, prompt]);
  useEffect(() => {
    const latest = tries[0]?.id;
    if (active !== 'lab' || !latest || lastShownTry.current === latest) return;
    lastShownTry.current = latest;
    if (window.matchMedia?.('(max-width: 899px)').matches) resultsPanel.current?.scrollIntoView?.({ block: 'start' });
  }, [active, tries]);
  useEffect(() => {
    let current = true;
    loadImageModels(fetcher).then(found => { if (current) setChoices(found); }).catch(() => { if (current) setChoices({ models: [] }); });
    return () => { current = false; };
  }, [fetcher]);
  useEffect(() => {
    let current = true;
    setLoadingSaved(true);
    void store.loadAll().then(images => {
      if (current) setSaved(images.map(image => ({ ...image, url: keepUrl(image.blob) })));
    }).catch(() => {
      if (current) setStorageProblem('Saved images could not be opened. Reload to retry. You can still generate and download images.');
    }).finally(() => { if (current) setLoadingSaved(false); });
    return () => { current = false; };
  }, [store]);
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; attachmentRead.current += 1; urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); };
  }, []);

  const available = choices?.models.filter(option => option.available) ?? [];
  const startModel = choices?.defaultModel ? preferredModel('images', available, choices.defaultModel) : routerPreference;
  const chosenModel = model ?? startModel ?? '';
  const labelFor = (id: string) => choices?.models.find(option => option.id === id)?.label ?? (id || 'The Router\'s default');
  const placeholders = /\{[^}]+\}/.test(prompt);
  const tooLong = prompt.length > IMAGE_LAB_PROMPT_LIMIT;
  const selectedUnavailable = choices?.models.find(option => option.id === chosenModel)?.available === false;
  const canMake = Boolean(savedToken && prompt.trim() && !tooLong && !working && !readingAttachment && !selectedUnavailable);
  const saveToken = () => { tokenStore.current = tokenDraft; setSavedToken(tokenStore.current); setTokenDraft(''); };
  const forgetToken = () => { tokenStore.current = undefined; setSavedToken(undefined); };
  const removeAttachment = () => {
    attachmentRead.current += 1;
    setReadingAttachment(false);
    if (attachment) releaseUrl(attachment.previewUrl);
    setAttachment(undefined);
  };
  const attach = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const readId = ++attachmentRead.current;
    setReadingAttachment(true);
    setProblem(undefined);
    try {
      const read = await readAttachment(file);
      if (!live.current || readId !== attachmentRead.current) return;
      if (attachment) releaseUrl(attachment.previewUrl);
      setAttachment({ ...read, previewUrl: keepUrl(file) });
    } catch (error) {
      if (live.current && readId === attachmentRead.current) setProblem(error instanceof Error ? error.message : 'The image could not be attached.');
    } finally {
      if (live.current && readId === attachmentRead.current) setReadingAttachment(false);
    }
  };
  const make = async () => {
    if (!canMake || making.current || !savedToken) return;
    making.current = true;
    setWorkingCount(variations);
    setProblem(undefined);
    const request = { prompt: prompt.trim(), model: chosenModel, aspectRatio: shape, token: savedToken, ...(attachment ? { attachment } : {}) };
    const count = variations;
    try {
      const tryId = crypto.randomUUID();
      const results = await Promise.allSettled(Array.from({ length: count }, () => generateLabImage(request, fetcher)));
      if (!live.current) return;
      const images = results.flatMap((result, index) => result.status === 'fulfilled' ? [{
        id: `${tryId}-${index + 1}`, url: keepUrl(result.value.blob), blob: result.value.blob,
        model: result.value.model, modelLabel: labelFor(result.value.model), seconds: Math.max(1, Math.round(result.value.durationMs / 1000)),
      }] : []);
      const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failures.length) {
        const reason = failures[0].reason instanceof Error ? failures[0].reason.message : 'The image could not be made.';
        setProblem(count > 1 ? `${failures.length} of ${count} images could not be made. ${reason}` : reason);
      }
      if (images.length) {
        if (imagePrice) setSpent(previous => ({ key: (previous?.key ?? 0) + 1, amount: imagePrice, count: images.length }));
        setTries(current => [{ id: tryId, prompt: request.prompt, shape: request.aspectRatio, images,
          ...(request.attachment ? { attachmentName: request.attachment.name } : {}), madeAt: new Date().toISOString(),
        }, ...current]);
      }
    } finally {
      making.current = false;
      if (live.current) setWorkingCount(undefined);
    }
  };
  const choose = (tryId: string, imageId: string) => setTries(current => current.map(item => item.id === tryId ? { ...item, chosen: item.chosen === imageId ? undefined : imageId } : item));
  const updateSaved = async (id: string, operation: () => Promise<void>) => {
    if (pendingRef.current.has(id)) return;
    pendingRef.current.add(id); setPending(new Set(pendingRef.current)); setStorageProblem(undefined);
    try { await operation(); }
    catch (error) { if (live.current) setStorageProblem(`The saved images could not be updated. ${error instanceof Error ? error.message : 'Try again, or download the image.'}`); }
    finally { pendingRef.current.delete(id); if (live.current) setPending(new Set(pendingRef.current)); }
  };
  const saveImage = (image: LabImage, item: LabTry) => void updateSaved(image.id, async () => {
    const result: SavedLabImage = { id: image.id, blob: image.blob, model: image.model, modelLabel: image.modelLabel, seconds: image.seconds, prompt: item.prompt, shape: item.shape, madeAt: item.madeAt, ...(item.attachmentName ? { attachmentName: item.attachmentName } : {}) };
    await store.save(result);
    if (live.current) setSaved(current => [{ ...result, url: image.url }, ...current.filter(previous => previous.id !== result.id)]);
  });
  const removeSaved = (id: string) => void updateSaved(id, async () => { await store.remove(id); if (live.current) setSaved(current => current.filter(image => image.id !== id)); });
  const useSaved = (image: SavedLabImage) => {
    focusRestoredPrompt.current = true;
    setPrompt(image.prompt); setShape(image.shape); setModel(image.model); setVariations(1);
    setSourceLabel(image.attachmentName ? `Saved result · attach ${image.attachmentName} again to use the same reference` : 'Saved result · original prompt and model');
    removeAttachment(); setProblem(undefined); onOpenLab?.(); promptInput.current?.focus({ preventScroll: true });
  };

  return <>
    <section className="image-prompts__panel image-lab" role="tabpanel" id="image-prompts-panel-lab" aria-labelledby="image-prompts-tab-lab" hidden={active !== 'lab'} data-image-lab>
      <h2 id="image-lab-title">Image Lab</h2><p className="image-lab__lead">Edit a prompt, choose a model, and generate. Save the results you want to compare.</p>
      <div className="image-lab__workbench">
        <div className="image-lab__editor">
          <label className="image-lab__label" htmlFor={ids.prompt}>Prompt</label>
          {sourceLabel && <p className="image-lab__source">{sourceLabel}</p>}
          <textarea ref={promptInput} id={ids.prompt} className="image-lab__prompt" value={prompt} rows={7} placeholder="A lone cultivator on a cliff above a sea of clouds at dawn…" onChange={event => setPrompt(event.target.value)} />
          <p className="image-lab__count" data-over={tooLong || undefined}>{prompt.length.toLocaleString('en')} / {IMAGE_LAB_PROMPT_LIMIT.toLocaleString('en')} characters</p>
          {placeholders && <p className="image-lab__hint" role="note">Replace words in braces, like {'{name}'}, with real details before generating.</p>}
          <div className="image-lab__row">
            <div className="image-lab__model-field"><label className="image-lab__label" htmlFor={ids.model}>Image model</label>
              <select id={ids.model} className="image-lab__select" value={chosenModel} onChange={event => setModel(event.target.value)}>
                {!choices && <option value={chosenModel}>Loading the Model Router…</option>}
                {choices && !choices.models.length && <option value={chosenModel}>{chosenModel ? labelFor(chosenModel) : 'The Router’s default'}</option>}
                {choices && choices.models.length > 0 && chosenModel && !choices.models.some(option => option.id === chosenModel) && <option value={chosenModel}>{chosenModel} (previously used)</option>}
                {choices?.models.map(option => <option key={option.id} value={option.id} disabled={!option.available}>{option.label}{option.available ? '' : ' (no key on this server)'}</option>)}
              </select><p className="image-lab__field-note">{selectedUnavailable ? 'This model has no key on this server. Choose an available model.' : 'Starts with the Model Router’s choice. Changes here apply to this Lab only.'}</p>
            </div>
            <div><label className="image-lab__label" htmlFor={ids.shape}>Shape</label><select id={ids.shape} className="image-lab__select" value={shape} onChange={event => setShape(event.target.value as ImageLabAspectRatio)}>{IMAGE_LAB_ASPECT_RATIOS.map(ratio => <option key={ratio} value={ratio}>{SHAPE_LABEL[ratio]}</option>)}</select></div>
            <div><label className="image-lab__label" htmlFor={ids.variations}>Images per try</label><select id={ids.variations} className="image-lab__select" value={variations} onChange={event => setVariations(Number(event.target.value) as ImageLabVariations)}>{IMAGE_LAB_VARIATIONS.map(count => <option key={count} value={count}>{count === 1 ? '1 image' : `${count} to choose from`}</option>)}</select></div>
          </div>
          <div className="image-lab__reference">
            {attachment ? <div className="image-lab__attachment" data-image-lab-attachment><img src={attachment.previewUrl} alt={`Attached: ${attachment.name}`} /><span>{attachment.name}<small>Sent with the prompt.</small></span><button type="button" className="image-prompts__button" onClick={removeAttachment}>Remove</button></div> : <button type="button" className="image-prompts__button" disabled={readingAttachment} onClick={() => fileInput.current?.click()}>{readingAttachment ? 'Reading image…' : 'Attach an image'}</button>}
            <input ref={fileInput} type="file" hidden accept={IMAGE_LAB_ATTACHMENT_TYPES.join(',')} data-image-lab-file onChange={event => void attach(event)} />
          </div>
          {savedToken ? <p className="image-lab__token">Access token saved. <button type="button" className="image-lab__link" onClick={forgetToken}>Forget it</button></p> : <div className="image-lab__token-form"><label className="image-lab__label" htmlFor={ids.token}>Development access token</label><p className="image-lab__field-note">Use your Workshop access token to generate images. Saved on this device only.</p><div className="image-lab__token-row"><input id={ids.token} type="password" autoComplete="off" className="image-lab__input" value={tokenDraft} onChange={event => setTokenDraft(event.target.value)} /><button type="button" className="image-prompts__button" disabled={!tokenDraft.trim()} onClick={saveToken}>Save</button></div></div>}
          <div className="image-lab__generate"><div className="image-lab__make-wrap"><button type="button" className="image-prompts__button image-prompts__button--primary image-lab__make" disabled={!canMake} onClick={() => void make()}>{working ? `Making ${workingCount === 1 ? 'the image' : `${workingCount} images`}…` : variations === 1 ? 'Make image' : `Make ${variations} images`}</button><EnergySpendFloater burst={spent} note="practice: nothing is taken yet" /></div>
            {imagePrice > 0 && <p className="image-lab__cost">Costs <EnergyActionCost price={imagePrice * variations} /> Energy · {imagePrice} per image (practice: nothing is taken yet).</p>}
          </div>
          {problem && <p className="image-lab__problem" role="alert">{problem}</p>}
          {storageProblem && <p className="image-lab__problem" role="alert">{storageProblem}</p>}
        </div>
        <section ref={resultsPanel} className="image-lab__results" aria-label="Generated results" aria-busy={working}>
          <div className="image-lab__section-heading"><h3>Results <span>{tries.reduce((total, item) => total + item.images.length, 0)}</span></h3><button type="button" className="image-lab__link" onClick={onOpenSaved}>Saved &amp; compare ({saved.length})</button></div>
          {working && <p className="image-lab__waiting" role="status">Making {workingCount === 1 ? 'your image' : `${workingCount} images`}… This can take up to two minutes per image. Your earlier results stay here.</p>}
          {!tries.length && !working && <div className="image-lab__empty-canvas"><span>Your next image starts here</span><p>Generate an image, then save or download the result.</p></div>}
          <ol className="image-lab__tries" aria-label="Images made on this page">{tries.map(item => <li key={item.id} data-image-lab-try>
            <TryImages item={item} saved={saved} pending={pending} loading={loadingSaved} onSave={saveImage} onChoose={choose} />
            <details className="image-lab__prompt-details"><summary>Prompt used for this try</summary><pre>{item.prompt}</pre></details>
            <button type="button" className="image-lab__link" onClick={() => { setPrompt(item.prompt); setShape(item.shape); setSourceLabel('Earlier try · prompt and shape'); promptInput.current?.focus(); }}>Use this prompt again</button>
          </li>)}</ol>
        </section>
      </div>
    </section>
    <section className="image-prompts__panel" role="tabpanel" id="image-prompts-panel-saved" aria-labelledby="image-prompts-tab-saved" hidden={active !== 'saved'}>
      <SavedImages images={saved} loading={loadingSaved} problem={storageProblem} pending={pending} onRemove={removeSaved} onUse={useSaved} />
    </section>
  </>;
}
