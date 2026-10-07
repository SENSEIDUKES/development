/**
 * Answers the production Reader's direct AI calls inside the Workshop.
 *
 * A few copied production files call `fetch('/api/…')` themselves instead of
 * going through a module the Workshop can stand in for. While the production
 * Reader is on screen, this guard answers exactly those routes locally, so
 * no request ever leaves the browser. Steering suggestions, the Codex
 * glossary and portraits get sample answers in production's response shape;
 * translation and voice generation answer with the error production shows
 * when its service is down. Every other request passes through untouched.
 */

type RouteAnswer = { status: number; body: unknown };

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PORTRAITS: Record<string, string> = {
  character: '/card-workshop/test-images/elder_kaelen_portrait.png',
  beast: '/familiars/nine-tailed-fox/neutral.png',
  creature: '/familiars/nine-tailed-fox/neutral.png',
  location: '/manifest-backdrops/immortal-land-1.jpg',
};

const ROUTES: Record<string, (body: Record<string, unknown> | undefined) => RouteAnswer> = {
  '/api/generate-next-directions': () => ({
    status: 200,
    body: {
      directions: [
        { title: 'The Pavilion Strikes First', directionType: 'action', description: 'Elder Kang turns the Ashen Pavilion on the outer court before the gate can judge Li Wei again.' },
        { title: 'The Hand That Wrote the First Oath', directionType: 'twist', description: 'The name in the Ledger of Ash leads to someone Li Wei already trusts.' },
        { title: 'A Debt Called In', directionType: 'romance', description: 'The fox names its price, and it is Mei Lin’s life or Li Wei’s oath.' },
        { title: 'Beyond the Ninth Door', directionType: 'new location', description: 'The gate opens onto a sect that died three hundred years ago and never noticed.' },
      ],
    },
  }),
  '/api/generate-custom-glossary': () => ({
    status: 200,
    body: {
      terms: [
        { term: 'Oath of Embers (余烬之誓)', category: 'Forbidden Rite', definition: 'An oath sworn beneath a meridian gate that trades lifespan for a sealed path. It cannot be withdrawn, only paid.' },
        { term: 'Ledger of Ash (灰之账)', category: 'Sect Record', definition: 'The Discipline Hall’s record of every oath sworn at the gate and the price each one took.' },
        { term: 'Debt Fox (债狐)', category: 'Spirit Beast', definition: 'A fox spirit that stores every debt owed to it in the embers of its tails.' },
      ],
    },
  }),
  '/api/generate-card-image': (body) => ({
    status: 200,
    body: { imageUrl: PORTRAITS[String(body?.type ?? '')] ?? '/manifest-backdrops/immortal-land-4.jpg' },
  }),
  '/api/translate-chapter': () => ({
    status: 503,
    body: { error: 'Translation is not connected in the Workshop preview.' },
  }),
  '/api/generate-audio': () => ({
    status: 503,
    body: { error: 'Voice generation is not connected in the Workshop preview.' },
  }),
};

/** Production service prefixes the stand-ins replace; refused if anything still reaches them. */
const REFUSED_PREFIXES = ['/api/foundation/', '/api/persistence'];

function pathnameOf(input: RequestInfo | URL): string {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return new URL(href, window.location.origin).pathname;
}

function readBody(init?: RequestInit): Record<string, unknown> | undefined {
  if (typeof init?.body !== 'string') return undefined;
  try {
    return JSON.parse(init.body) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** Installs the guard; the returned function restores the browser's own fetch. */
export function installProductionApiGuard(): () => void {
  const original = window.fetch;
  const guarded: typeof window.fetch = async (input, init) => {
    const pathname = pathnameOf(input);
    const route = ROUTES[pathname];
    if (route) {
      await delay(900);
      const answer = route(readBody(init));
      return new Response(JSON.stringify(answer.body), {
        status: answer.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (REFUSED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return new Response(JSON.stringify({ error: 'Production services are not connected in the Workshop preview.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return original(input, init);
  };
  window.fetch = guarded;
  return () => {
    if (window.fetch === guarded) window.fetch = original;
  };
}
