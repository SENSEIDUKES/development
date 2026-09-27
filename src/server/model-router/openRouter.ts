import { generateOpenRouterText as sharedGenerateOpenRouterText, type OpenRouterTextRequest } from '@seihouse/library/model-router-server';
export type { OpenRouterTextRequest, OpenRouterTextResult } from '@seihouse/library/model-router-server';

/** Development's attribution stays in its host adapter. */
export const generateOpenRouterText = (request: OpenRouterTextRequest) => sharedGenerateOpenRouterText({
  ...request,
  attribution: request.attribution ?? { referer: 'https://dev.seaportal.world', title: 'SEIHouse Development' },
});
