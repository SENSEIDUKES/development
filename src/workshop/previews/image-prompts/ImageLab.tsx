import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Download } from 'lucide-react';
import { EnergyActionCost, EnergySpendFloater, getEnergyPriceEntry, type EnergySpendBurst } from '@seihouse/library/energy';
import { createSavedAccessToken } from '../../../host/generation/accessToken';
import { preferredModel, useModelPreference } from '../../../host/generation/modelPreference';
import { IMAGE_LAB_ASPECT_RATIOS, IMAGE_LAB_ATTACHMENT_TYPES, IMAGE_LAB_PROMPT_LIMIT, IMAGE_LAB_VARIATIONS, type ImageLabAspectRatio } from '../../../server/image-lab/limits';
import { generateLabImage, loadImageModels, readAttachment, type ImageLabAttachment, type ImageModelChoices } from './imageLabClient';

export type ImageLabVariations = typeof IMAGE_LAB_VARIATIONS[number];

const SHAPE_LABEL: Record<ImageLabAspectRatio, string> = {
  '1:1': 'Square 1:1', '2:3': 'Cover 2:3', '3:2': 'Wide 3:2', '3:4': 'Portrait 3:4',
  '4:3': 'Landscape 4:3', '9:16': 'Phone 9:16', '16:9': 'Screen 16:9',
};

interface LabImage {
  id: string;
  url: string;
  model: string;
  seconds: number;
  extension: string;
}

/** One press of Make image: its prompt and settings, and the images it made. */
interface LabTry {
  id: string;
  prompt: string;
  shape: ImageLabAspectRatio;
  attachmentName?: string;
  madeAt: string;
  images: LabImage[];
  failed: number;
  chosen?: string;
}

export interface ImageLabProps {
  /** The prompt and shape a prompt card sent here; a new value replaces what is written. */
  incoming?: { prompt: string; shape?: ImageLabAspectRatio; variations?: ImageLabVariations; key: number };
  fetcher?: typeof fetch;
}

/**
 * The Image Lab: write or paste a prompt, attach an image the model works
 * from (a photo for a profile picture), choose an image model from the Model
 * Router, a shape, and one image or three to choose from, then make them.
 * Images stay on this page until it is closed; Download keeps one. Needs the
 * owner's access token.
 */
export function ImageLab({ incoming, fetcher }: ImageLabProps) {
  const tokenStore = useMemo(() => createSavedAccessToken(), []);
  const [savedToken, setSavedToken] = useState(() => tokenStore.current);
  const [tokenDraft, setTokenDraft] = useState('');
  const [prompt, setPrompt] = useState(incoming?.prompt ?? '');
  const [shape, setShape] = useState<ImageLabAspectRatio>(incoming?.shape ?? '1:1');
  const [choices, setChoices] = useState<ImageModelChoices>();
  const [routerPreference] = useModelPreference('images');
  const [model, setModel] = useState<string>();
  const [working, setWorking] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [variations, setVariations] = useState<ImageLabVariations>(incoming?.variations ?? 1);
  const [attachment, setAttachment] = useState<ImageLabAttachment & { previewUrl: string }>();
  const [tries, setTries] = useState<LabTry[]>([]);
  const [spent, setSpent] = useState<EnergySpendBurst>();
  const imagePrice = getEnergyPriceEntry('image.generate').price ?? 0;
  const urls = useRef<string[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const ids = { prompt: useId(), model: useId(), shape: useId(), token: useId(), variations: useId() };

  useEffect(() => {
    if (!incoming) return;
    setPrompt(incoming.prompt);
    if (incoming.shape) setShape(incoming.shape);
    if (incoming.variations) setVariations(incoming.variations);
  }, [incoming]);

  useEffect(() => {
    let live = true;
    loadImageModels(fetcher).then(found => { if (live) setChoices(found); }).catch(() => { if (live) setChoices({ models: [] }); });
    return () => { live = false; };
  }, [fetcher]);

  useEffect(() => () => urls.current.forEach(url => URL.revokeObjectURL(url)), []);

  const available = choices?.models.filter(option => option.available) ?? [];
  // The Router's choice for images starts the select; changing it here does not change the Router.
  const startModel = choices?.defaultModel ? preferredModel('images', available, choices.defaultModel) : routerPreference;
  const chosenModel = model ?? startModel ?? '';
  const labelFor = (id: string) => choices?.models.find(option => option.id === id)?.label ?? (id || 'The Router\'s default');
  const placeholders = /\{[^}]+\}/.test(prompt);
  const tooLong = prompt.length > IMAGE_LAB_PROMPT_LIMIT;
  const canMake = Boolean(savedToken && prompt.trim() && !tooLong && !working);

  const saveToken = () => {
    tokenStore.current = tokenDraft;
    setSavedToken(tokenStore.current);
    setTokenDraft('');
  };
  const forgetToken = () => {
    tokenStore.current = undefined;
    setSavedToken(undefined);
  };

  const keepUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    urls.current.push(url);
    return url;
  };

  const attach = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setProblem(undefined);
    try {
      const read = await readAttachment(file);
      setAttachment({ ...read, previewUrl: keepUrl(file) });
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'The image could not be attached.');
    }
  };

  const make = async () => {
    if (!savedToken) return;
    setWorking(true);
    setProblem(undefined);
    try {
      const tryId = `${Date.now()}`;
      const request = { prompt: prompt.trim(), model: chosenModel, aspectRatio: shape, token: savedToken, ...(attachment ? { attachment } : {}) };
      // Each variation is its own call, so one refusal does not cost the others.
      const results = await Promise.allSettled(Array.from({ length: variations }, () => generateLabImage(request, fetcher)));
      const images = results.flatMap((result, index) => result.status === 'fulfilled' ? [{
        id: `${tryId}-${index + 1}`,
        url: keepUrl(result.value.blob),
        model: result.value.model,
        seconds: Math.max(1, Math.round(result.value.durationMs / 1000)),
        extension: result.value.mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png',
      }] : []);
      const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failures.length) {
        const reason = failures[0].reason instanceof Error ? failures[0].reason.message : 'The image could not be made.';
        setProblem(variations > 1 ? `${failures.length} of ${variations} images could not be made. ${reason}` : reason);
      }
      if (images.length) {
        if (imagePrice) setSpent(previous => ({ key: (previous?.key ?? 0) + 1, amount: imagePrice, count: images.length }));
        setTries(current => [{
          id: tryId, prompt: request.prompt, shape, images, failed: failures.length,
          ...(attachment ? { attachmentName: attachment.name } : {}),
          madeAt: new Date().toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }),
        }, ...current]);
      }
    } finally {
      setWorking(false);
    }
  };

  const choose = (tryId: string, imageId: string) => setTries(current => current.map(item => item.id === tryId
    ? { ...item, chosen: item.chosen === imageId ? undefined : imageId }
    : item));

  return (
    <section className="image-lab" aria-labelledby="image-lab-title" data-image-lab>
      <h2 id="image-lab-title">Image Lab</h2>
      <p className="image-lab__lead">Write a prompt, or send one here from any prompt card with <strong>Try this prompt</strong>, then make the image.</p>

      <label className="image-lab__label" htmlFor={ids.prompt}>Prompt</label>
      <textarea id={ids.prompt} className="image-lab__prompt" value={prompt} rows={8}
        placeholder="A lone cultivator on a cliff above a sea of clouds at dawn…"
        onChange={event => setPrompt(event.target.value)} />
      <p className="image-lab__count" data-over={tooLong || undefined}>
        {prompt.length.toLocaleString('en')} / {IMAGE_LAB_PROMPT_LIMIT.toLocaleString('en')} characters
      </p>
      {placeholders && <p className="image-lab__hint" role="note">Words in braces, like {'{name}'}, are filled in for each image in the app. Replace them with real words first, or the model draws from the placeholders.</p>}

      <div className="image-lab__row">
        <div>
          <label className="image-lab__label" htmlFor={ids.model}>Image model</label>
          <select id={ids.model} className="image-lab__select" value={chosenModel} onChange={event => setModel(event.target.value)}>
            {!choices && <option value={chosenModel}>Loading the Model Router…</option>}
            {choices && !choices.models.length && <option value="">The Router&rsquo;s default</option>}
            {choices?.models.map(option => (
              <option key={option.id} value={option.id} disabled={!option.available}>
                {option.label}{option.available ? '' : ' (no key on this server)'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="image-lab__label" htmlFor={ids.shape}>Shape</label>
          <select id={ids.shape} className="image-lab__select" value={shape} onChange={event => setShape(event.target.value as ImageLabAspectRatio)}>
            {IMAGE_LAB_ASPECT_RATIOS.map(ratio => <option key={ratio} value={ratio}>{SHAPE_LABEL[ratio]}</option>)}
          </select>
        </div>
        <div>
          <label className="image-lab__label" htmlFor={ids.variations}>Images per try</label>
          <select id={ids.variations} className="image-lab__select" value={variations} onChange={event => setVariations(Number(event.target.value) as ImageLabVariations)}>
            {IMAGE_LAB_VARIATIONS.map(count => <option key={count} value={count}>{count === 1 ? '1 image' : `${count} to choose from`}</option>)}
          </select>
        </div>
      </div>

      <p className="image-lab__label" id={`${ids.prompt}-attach`}>Attached image</p>
      {attachment ? (
        <div className="image-lab__attachment" data-image-lab-attachment>
          <img src={attachment.previewUrl} alt={`Attached: ${attachment.name}`} />
          <span>{attachment.name}<br /><small>Sent to the image model with the prompt.</small></span>
          <button type="button" className="image-prompts__button" onClick={() => setAttachment(undefined)}>Remove</button>
        </div>
      ) : (
        <button type="button" className="image-prompts__button" aria-describedby={`${ids.prompt}-attach`} onClick={() => fileInput.current?.click()}>Attach an image</button>
      )}
      <input ref={fileInput} type="file" hidden accept={IMAGE_LAB_ATTACHMENT_TYPES.join(',')} data-image-lab-file onChange={event => void attach(event)} />

      {savedToken ? (
        <p className="image-lab__token">Access token saved on this device. <button type="button" className="image-lab__link" onClick={forgetToken}>Forget it</button></p>
      ) : (
        <div className="image-lab__token-form">
          <label className="image-lab__label" htmlFor={ids.token}>Development access token</label>
          <p className="image-lab__hint">Making images needs your access token. It is kept on this device only, shared with the rest of the Workshop.</p>
          <div className="image-lab__token-row">
            <input id={ids.token} type="password" autoComplete="off" className="image-lab__input" value={tokenDraft}
              onChange={event => setTokenDraft(event.target.value)} />
            <button type="button" className="image-prompts__button" disabled={!tokenDraft.trim()} onClick={saveToken}>Save</button>
          </div>
        </div>
      )}

      <div className="image-lab__make-wrap">
        <button type="button" className="image-prompts__button image-prompts__button--primary image-lab__make" disabled={!canMake} onClick={() => void make()}>
          {working ? `Making ${variations === 1 ? 'the image' : `${variations} images`}… (up to 2 minutes)` : variations === 1 ? 'Make image' : `Make ${variations} images`}
        </button>
        <EnergySpendFloater burst={spent} note="practice: nothing is taken yet" />
      </div>
      {imagePrice > 0 && <p className="image-lab__cost">Costs <EnergyActionCost price={imagePrice * variations} /> Energy, {imagePrice} per image (practice: nothing is taken yet).</p>}
      {problem && <p className="image-lab__problem" role="alert">{problem}</p>}

      {tries.length > 0 && (
        <ol className="image-lab__tries" aria-label="Images made on this page">
          {tries.map(item => (
            <li key={item.id} data-image-lab-try>
              <p className="image-lab__try-meta">
                {item.madeAt} · {SHAPE_LABEL[item.shape]}{item.attachmentName ? ` · with ${item.attachmentName}` : ''}
                {item.images.length > 1 && !item.chosen && ' · choose one'}
              </p>
              <ol className="image-lab__gallery" data-count={item.images.length}>
                {item.images.map((image, index) => (
                  <li key={image.id} data-chosen={item.chosen === image.id || undefined}>
                    <figure>
                      <img src={image.url} alt={`${item.images.length > 1 ? `Variation ${index + 1}, made` : 'Made'} from: ${item.prompt.slice(0, 120)}`} />
                      <a className="image-lab__download" href={image.url} download={`image-lab-${image.id}.${image.extension}`}
                        aria-label={item.images.length > 1 ? `Download variation ${index + 1}` : 'Download image'} title="Download">
                        <Download size={18} aria-hidden="true" />
                      </a>
                      <figcaption>
                        <span>{labelFor(image.model)} · {image.seconds}s</span>
                        <span className="image-lab__actions">
                          {item.images.length > 1 && (
                            <button type="button" className={`image-prompts__button${item.chosen === image.id ? ' image-prompts__button--primary' : ''}`}
                              aria-pressed={item.chosen === image.id} onClick={() => choose(item.id, image.id)}>
                              {item.chosen === image.id ? 'Chosen' : 'Choose'}
                            </button>
                          )}
                        </span>
                      </figcaption>
                    </figure>
                  </li>
                ))}
              </ol>
              <button type="button" className="image-lab__link" onClick={() => { setPrompt(item.prompt); setShape(item.shape); }}>Use this prompt again</button>
            </li>
          ))}
        </ol>
      )}
      {!tries.length && <p className="image-lab__empty">Images you make appear here. They stay until this page is closed, so download the ones to keep.</p>}
    </section>
  );
}
