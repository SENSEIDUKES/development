import { pricedModelRouterStatus } from './status';

interface RequestLike {
  method?: string;
}

interface ResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): ResponseLike;
  json(value: unknown): void;
}

/** Read-only Model Router status: which models each capability can route to. No key values leave the server. */
export default async function modelRouterHandler(request: RequestLike, response: ResponseLike) {
  response.setHeader('Cache-Control', 'no-store');
  if (request.method && request.method.toUpperCase() !== 'GET') {
    response.setHeader('Allow', 'GET');
    response.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  response.status(200).json(await pricedModelRouterStatus(process.env));
}
