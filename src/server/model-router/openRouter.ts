import { fingerprintWithOpenRouter as sharedFingerprintWithOpenRouter, generateOpenRouterText as sharedGenerateOpenRouterText, type OpenRouterFingerprintRequest, type OpenRouterTextRequest } from '@seihouse/library/model-router-server';
export type { OpenRouterTextRequest, OpenRouterTextResult } from '@seihouse/library/model-router-server';

export const DEVELOPMENT_OPENROUTER_ATTRIBUTION = {
  referer: 'https://dev.seaportal.world', title: 'SEIHouse Development',
} as const;

/** Development's attribution stays in its host adapter. */
export const generateOpenRouterText = (request: OpenRouterTextRequest) => sharedGenerateOpenRouterText({
  ...request,
  attribution: request.attribution ?? DEVELOPMENT_OPENROUTER_ATTRIBUTION,
});

export const fingerprintWithOpenRouter = (request: OpenRouterFingerprintRequest) => sharedFingerprintWithOpenRouter({
  ...request,
  attribution: request.attribution ?? DEVELOPMENT_OPENROUTER_ATTRIBUTION,
});
