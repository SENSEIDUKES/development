import type { HarnessGenerationModelAdapter } from '@seihouse/sen/harness-generation';
import type { AccessTokenStore } from '../host/generation/accessToken';
import { HarnessGenerationRequestError } from '../host/generation/httpClient';
import type { AccessTokenRequest } from './AccessTokenSheet';

/** Asks for the owner's access token; resolves with it, or nothing when cancelled. */
export type AskForAccessToken = (request: Pick<AccessTokenRequest, 'reason' | 'rejected'>) => Promise<string | undefined>;

/**
 * The chapter writer with the owner's access token. A request refused for the
 * visitor limit without a token (429), or for a token the server did not
 * accept (401), asks for the token and is sent again with it: the server
 * refused it before any model call, so nothing is written twice. Cancelling
 * keeps the server's own message.
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
  };
};
