import { describe, expect, it, vi } from 'vitest';
import { decodeFingerprint, FINGERPRINT_DIMENSIONS } from '@seihouse/sen/meaning-engine';
import { handleMeaningFingerprintHttp, MEANING_FINGERPRINT_MAX_LENGTH, MEANING_FINGERPRINT_MAX_TEXTS } from './http';

const environment = { OPENROUTER_API_KEY: 'test-key' };
const vector = (seed: number) => Array.from({ length: 3072 }, (_, index) => Math.sin(seed + index));

describe('Meaning Fingerprint route', () => {
  it('reports whether a model key is configured', async () => {
    expect((await handleMeaningFingerprintHttp({ method: 'GET' }, { environment })).body).toMatchObject({ configured: true });
    expect((await handleMeaningFingerprintHttp({ method: 'GET' }, { environment: {} })).body).toMatchObject({ configured: false });
  });

  it('answers each text with one packed fingerprint, in order, from the Meaning model', async () => {
    const fingerprint = vi.fn(async ({ texts }: { texts: string[] }) => texts.map((_, index) => vector(index)));
    const response = await handleMeaningFingerprintHttp({ method: 'POST', body: { texts: [' a flower awakens ', 'my own tag'] } }, { environment, fingerprint });
    expect(response.status).toBe(200);
    expect(fingerprint).toHaveBeenCalledWith({ apiKey: 'test-key', model: 'openrouter/google/gemini-embedding-2', texts: ['a flower awakens', 'my own tag'] });
    const { fingerprints } = response.body as { fingerprints: string[] };
    expect(fingerprints).toHaveLength(2);
    expect(decodeFingerprint(fingerprints[0])).toHaveLength(FINGERPRINT_DIMENSIONS);
    expect(fingerprints[0]).not.toBe(fingerprints[1]);
  });

  it.each([
    {}, { texts: [] }, { texts: 'a flower' }, { texts: ['ok', 4] }, { texts: ['  '] },
    { texts: ['x'.repeat(MEANING_FINGERPRINT_MAX_LENGTH + 1)] }, { texts: Array(MEANING_FINGERPRINT_MAX_TEXTS + 1).fill('a flower') },
  ])('refuses a request it cannot fingerprint: %j', async body => {
    const fingerprint = vi.fn();
    expect((await handleMeaningFingerprintHttp({ method: 'POST', body }, { environment, fingerprint })).status).toBe(400);
    expect(fingerprint).not.toHaveBeenCalled();
  });

  it('says so when there is no key or the model does not answer, without leaking why', async () => {
    expect((await handleMeaningFingerprintHttp({ method: 'POST', body: { texts: ['a flower'] } }, { environment: {} })).status).toBe(503);
    const onError = vi.fn();
    const response = await handleMeaningFingerprintHttp({ method: 'POST', body: { texts: ['a flower'] } },
      { environment, onError, fingerprint: async () => { throw new Error('provider said: secret detail'); } });
    expect(response).toMatchObject({ status: 502, body: { error: 'The meaning model did not answer.' } });
    expect(onError).toHaveBeenCalled();
    expect((await handleMeaningFingerprintHttp({ method: 'DELETE' }, { environment })).status).toBe(405);
  });
});
