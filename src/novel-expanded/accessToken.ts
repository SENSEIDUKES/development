import type { HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import type { AccessTokenStore } from '../host/generation/accessToken';
import { HarnessGenerationRequestError } from '../host/generation/httpClient';
import { StoryCoverRequestError, type requestStoryCover } from '../host/media/storyCoverClient';
import type { StoryCoverRequester } from '../host/media/storyCovers';
import { PROFILE_PICTURE_CHOICES, ProfilePictureRequestError, keptPortrait, readProfilePhoto, type requestProfilePicture } from '../host/media/profilePictureClient';
import { blobToDataUrl } from '../host/media/imageFiles';
import type { DevicePortraitMaker } from '../host/profile/deviceProfileServices';
import type { AccessTokenRequest } from './AccessTokenSheet';

/** Asks for the owner's access token; resolves with it, or nothing when cancelled. */
export type AskForAccessToken = (request: Pick<AccessTokenRequest, 'reason' | 'rejected'>) => Promise<string | undefined>;

/**
 * The chapter writer with the owner's access token. A request refused for the
 * visitor limit without a token (429), or for a token the server did not
 * accept (401), asks for the token and is sent again with it: the server
 * refused it before any model call, so nothing is written twice. Cancelling
 * keeps the server's own message. The Holdings fixer never asks: a refused
 * check is recorded on its chapter and the reader sees nothing.
 */
export const writerWithAccessToken = (
  writer: HarnessGenerationModelAdapter,
  token: AccessTokenStore,
  ask: AskForAccessToken,
): HarnessGenerationModelAdapter => {
  const withToken = async <T,>(send: () => Promise<T>): Promise<T> => {
    for (;;) {
      try {
        return await send();
      } catch (error) {
        const status = error instanceof HarnessGenerationRequestError ? error.status : undefined;
        // A limit reached with the token sent means this server lifts nothing for it.
        if (status !== 401 && !(status === 429 && !token.current)) throw error;
        if (status === 401) token.current = undefined;
        const entered = await ask({ reason: 'chapters', rejected: status === 401 });
        if (!entered) throw error;
        token.current = entered;
      }
    }
  };
  return {
    getServerInfo: () => writer.getServerInfo(),
    generate: request => withToken(() => writer.generate(request)),
    ...(writer.arcOperation ? { arcOperation: request => withToken(() => writer.arcOperation!(request)) } : {}),
    // The Holdings fixer runs unseen: it sends the token the reader already gave and never asks for one.
    ...(writer.fixHoldings ? { fixHoldings: request => writer.fixHoldings!(request) } : {}),
  };
};

/**
 * The cover maker with the owner's access token, the same way as chapters: a
 * cover refused for the visitor limit without a token (429), or for a token
 * the server did not accept (401), asks for the token and is asked for again.
 * The server refused it before any model call, so nothing is made twice.
 */
export const coverRequesterWithAccessToken = (
  request: typeof requestStoryCover,
  token: AccessTokenStore,
  ask: AskForAccessToken,
  model: () => string | undefined,
): StoryCoverRequester => async story => {
  for (;;) {
    try {
      return await request(story, { model: model(), accessToken: token.current });
    } catch (error) {
      const status = error instanceof StoryCoverRequestError ? error.status : undefined;
      if (status !== 401 && !(status === 429 && !token.current)) throw error;
      if (status === 401) token.current = undefined;
      const entered = await ask({ reason: 'covers', rejected: status === 401 });
      if (!entered) throw error;
      token.current = entered;
    }
  }
};

/**
 * The profile picture maker with the owner's access token: the reader's photo
 * is made small enough to send, then three portraits are asked for at once,
 * each its own request. When the visitor limit (429 without a token) or a
 * token the server did not accept (401) stops any of them, the token is asked
 * for once and those are asked for again; the server refused them before any
 * model call. The chosen portrait is kept small, as a data URL.
 */
export const portraitMakerWithAccessToken = (
  request: typeof requestProfilePicture,
  token: AccessTokenStore,
  ask: AskForAccessToken,
  model: () => string | undefined,
): DevicePortraitMaker => ({
  make: async file => {
    const photo = await readProfilePhoto(file);
    const send = () => request(photo, { model: model(), accessToken: token.current });
    let results = await Promise.allSettled(Array.from({ length: PROFILE_PICTURE_CHOICES }, send));
    const needsToken = (result: PromiseSettledResult<Blob>) => result.status === 'rejected' && result.reason instanceof ProfilePictureRequestError
      && (result.reason.status === 401 || (result.reason.status === 429 && !token.current));
    // Which were refused for the token is decided before the token changes.
    const refused = results.map(needsToken);
    if (refused.some(Boolean)) {
      const rejected = results.some((result, index) => refused[index] && (result as PromiseRejectedResult).reason.status === 401);
      if (rejected) token.current = undefined;
      const entered = await ask({ reason: 'portraits', rejected });
      if (entered) {
        token.current = entered;
        results = await Promise.all(results.map((result, index) => refused[index] ? Promise.allSettled([send()]).then(([again]) => again) : result));
      }
    }
    const images = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    const reason = failures[0]?.reason instanceof Error ? failures[0].reason.message : undefined;
    const problem = !failures.length ? undefined
      : images.length ? `${failures.length} of ${PROFILE_PICTURE_CHOICES} portraits could not be made. ${reason ?? ''}`.trim()
        : reason;
    return { images, ...(problem ? { problem } : {}) };
  },
  keep: async portrait => blobToDataUrl(await keptPortrait(portrait)),
});
