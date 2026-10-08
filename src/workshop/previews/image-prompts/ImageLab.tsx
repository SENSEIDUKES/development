import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createSavedAccessToken } from '../../../host/generation/accessToken';
import { preferredModel, useModelPreference } from '../../../host/generation/modelPreference';
import { IMAGE_LAB_ASPECT_RATIOS, IMAGE_LAB_PROMPT_LIMIT, type ImageLabAspectRatio } from '../../../server/image-lab/limits';
import { generateLabImage, loadImageModels, type ImageModelChoices } from './imageLabClient';

const SHAPE_LABEL: Record<ImageLabAspectRatio, string> = {
  '1:1': 'Square 1:1', '2:3': 'Cover 2:3', '3:2': 'Wide 3:2', '3:4': 'Portrait 3:4',
  '4:3': 'Landscape 4:3', '9:16': 'Phone 9:16', '16:9': 'Screen 16:9',
};

interface LabImage {
  id: string;
  url: string;
  prompt: string;
  model: string;
  shape: ImageLabAspectRatio;
  seconds: number;
  madeAt: string;
  extension: string;
}

export interface ImageLabProps {
  /** The prompt and shape a prompt card sent here; a new value replaces what is written. */
  incoming?: { prompt: string; shape?: ImageLabAspectRatio; key: number };
  fetcher?: typeof fetch;
}

/**
 * The Image Lab: write or paste a prompt, choose an image model from the
 * Model Router and a shape, and make the image. Images stay on this page
 * until it is closed; Download keeps one. Needs the owner's access token.
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
  const [images, setImages] = useState<LabImage[]>([]);
  const urls = useRef<string[]>([]);
  const ids = { prompt: useId(), model: useId(), shape: useId(), token: useId() };

  useEffect(() => {
    if (!incoming) return;
    setPrompt(incoming.prompt);
    if (incoming.shape) setShape(incoming.shape);
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

  const make = async () => {
    if (!savedToken) return;
    setWorking(true);
    setProblem(undefined);
    try {
      const image = await generateLabImage({ prompt: prompt.trim(), model: chosenModel, aspectRatio: shape, token: savedToken }, fetcher);
      const url = URL.createObjectURL(image.blob);
      urls.current.push(url);
      setImages(current => [{
        id: `${Date.now()}-${current.length}`,
        url, prompt: prompt.trim(), model: image.model, shape,
        seconds: Math.max(1, Math.round(image.durationMs / 1000)),
        madeAt: new Date().toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }),
        extension: image.mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png',
      }, ...current]);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'The image could not be made.');
    } finally {
      setWorking(false);
    }
  };

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
      </div>

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

      <button type="button" className="image-prompts__button image-prompts__button--primary image-lab__make" disabled={!canMake} onClick={() => void make()}>
        {working ? 'Making the image… (up to 2 minutes)' : 'Make image'}
      </button>
      {problem && <p className="image-lab__problem" role="alert">{problem}</p>}

      {images.length > 0 && (
        <ol className="image-lab__gallery" aria-label="Images made on this page">
          {images.map(image => (
            <li key={image.id}>
              <figure>
                <img src={image.url} alt={`Made from: ${image.prompt.slice(0, 120)}`} />
                <figcaption>
                  <span>{labelFor(image.model)} · {SHAPE_LABEL[image.shape]} · {image.seconds}s · {image.madeAt}</span>
                  <span className="image-lab__actions">
                    <a className="image-prompts__button" href={image.url} download={`image-lab-${image.id}.${image.extension}`}>Download</a>
                    <button type="button" className="image-prompts__button" onClick={() => { setPrompt(image.prompt); setShape(image.shape); }}>Use this prompt again</button>
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>
      )}
      {!images.length && <p className="image-lab__empty">Images you make appear here. They stay until this page is closed, so download the ones to keep.</p>}
    </section>
  );
}
