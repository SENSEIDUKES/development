import { base64ToBlob, blobToBase64, shrinkImage } from './imageFiles';

export const PROFILE_PICTURE_ENDPOINT = '/api/profile-picture';

/** Portraits offered for each photo; each is its own request. The server's limit counts each one. */
export const PROFILE_PICTURE_CHOICES = 3;

/** The longest side a photo is sent at: enough for a likeness, small enough to send. */
const PHOTO_MAX_SIDE = 1280;
/** The longest side the chosen portrait is kept at: it is shown in a small circle. */
const KEPT_PORTRAIT_MAX_SIDE = 512;
const SENDABLE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export interface ProfilePhoto { data: string; mimeType: string }

/** A portrait the server refused or could not make; `status` is its HTTP status. */
export class ProfilePictureRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ProfilePictureRequestError';
  }
}

/** The reader's photo, made smaller when the browser can, ready to send. */
export async function readProfilePhoto(file: Blob): Promise<ProfilePhoto> {
  const photo = (await shrinkImage(file, PHOTO_MAX_SIDE)) ?? file;
  if (!SENDABLE_TYPES.includes(photo.type)) throw new Error('Choose a JPG, PNG or WebP photo.');
  return { data: await blobToBase64(photo), mimeType: photo.type };
}

/** The chosen portrait made small enough to keep in the profile record on this device. */
export async function keptPortrait(portrait: Blob): Promise<Blob> {
  return (await shrinkImage(portrait, KEPT_PORTRAIT_MAX_SIDE, 0.88)) ?? portrait;
}

/**
 * Asks for one portrait from the reader's photo; the server holds the prompt.
 * Uses the Model Router's image choice when there is one; the owner's token
 * lifts the visitor limit.
 */
export async function requestProfilePicture(photo: ProfilePhoto, options: {
  model?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
} = {}): Promise<Blob> {
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(PROFILE_PICTURE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
      },
      body: JSON.stringify({ photo, ...(options.model ? { model: options.model } : {}) }),
    });
  } catch {
    throw new ProfilePictureRequestError('The portrait server could not be reached. Check the connection and try again.', 0);
  }
  const body = await response.json().catch(() => undefined) as { image?: unknown; mimeType?: unknown; error?: unknown } | undefined;
  if (!response.ok) {
    throw new ProfilePictureRequestError(typeof body?.error === 'string' ? body.error : `The portrait server answered ${response.status}.`, response.status);
  }
  if (typeof body?.image !== 'string' || typeof body.mimeType !== 'string' || !body.mimeType.startsWith('image/')) {
    throw new ProfilePictureRequestError('The portrait server answered without an image.', 502);
  }
  return base64ToBlob(body.image, body.mimeType);
}
