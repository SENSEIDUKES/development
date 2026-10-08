import { base64ToBlob, blobToBase64, shrinkImage } from '../../../host/media/imageFiles';
import { IMAGE_LAB_ATTACHMENT_MAX_BASE64, IMAGE_LAB_ATTACHMENT_TYPES, type ImageLabAspectRatio } from '../../../server/image-lab/limits';

export interface ImageLabRequest {
  prompt: string;
  /** Empty means the Model Router's default image model. */
  model?: string;
  aspectRatio: ImageLabAspectRatio;
  token: string;
  /** A photo or other image the model works from. */
  attachment?: ImageLabAttachment;
}

export interface ImageLabAttachment {
  name: string;
  data: string;
  mimeType: string;
}

export interface ImageLabImage {
  blob: Blob;
  mimeType: string;
  model: string;
  durationMs: number;
}

export interface ImageModelOption {
  id: string;
  label: string;
  available: boolean;
}

export interface ImageModelChoices {
  models: ImageModelOption[];
  defaultModel?: string;
}

/** One image from the Image Lab (`/api/image-lab`), with the owner's access token. */
export async function generateLabImage(request: ImageLabRequest, fetcher: typeof fetch = fetch): Promise<ImageLabImage> {
  let response: Response;
  try {
    response = await fetcher('/api/image-lab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${request.token}` },
      body: JSON.stringify({
        prompt: request.prompt,
        ...(request.model ? { model: request.model } : {}),
        aspectRatio: request.aspectRatio,
        ...(request.attachment ? { images: [{ data: request.attachment.data, mimeType: request.attachment.mimeType }] } : {}),
      }),
    });
  } catch {
    throw new Error('The Image Lab could not be reached. Check the connection and try again.');
  }
  const body = await response.json().catch(() => undefined) as Record<string, unknown> | undefined;
  if (!response.ok) {
    throw new Error(typeof body?.error === 'string' ? body.error : `The Image Lab answered ${response.status}.`);
  }
  if (typeof body?.image !== 'string' || typeof body.mimeType !== 'string') throw new Error('The Image Lab sent back no image.');
  return {
    blob: base64ToBlob(body.image, body.mimeType),
    mimeType: body.mimeType,
    model: typeof body.model === 'string' ? body.model : request.model ?? '',
    durationMs: typeof body.durationMs === 'number' ? body.durationMs : 0,
  };
}

/** The Model Router's image models, as its Workshop page reads them. */
export async function loadImageModels(fetcher: typeof fetch = fetch): Promise<ImageModelChoices> {
  const response = await fetcher('/api/model-router');
  if (!response.ok) throw new Error(`The Model Router answered ${response.status}.`);
  const status = await response.json() as { capabilities?: Array<{ id: string; defaultModel?: string; models?: ImageModelOption[] }> };
  const images = status.capabilities?.find(capability => capability.id === 'images');
  return {
    models: (images?.models ?? []).map(({ id, label, available }) => ({ id, label, available })),
    ...(images?.defaultModel ? { defaultModel: images.defaultModel } : {}),
  };
}

/** The longest side an attached image is sent at: plenty for a likeness, small enough to send. */
const ATTACHMENT_MAX_SIDE = 1280;

/**
 * A file the owner attached, ready to send: made smaller when the browser can,
 * so a phone photo fits in one request. Refuses what the model cannot read.
 */
export async function readAttachment(file: File): Promise<ImageLabAttachment> {
  const blob = (await shrinkImage(file, ATTACHMENT_MAX_SIDE)) ?? file;
  if (!IMAGE_LAB_ATTACHMENT_TYPES.includes(blob.type as never)) throw new Error('Attach a PNG, JPEG or WebP image.');
  const data = await blobToBase64(blob);
  if (data.length > IMAGE_LAB_ATTACHMENT_MAX_BASE64) throw new Error('This image is too large to send. Use a smaller photo.');
  return { name: file.name, data, mimeType: blob.type };
}
