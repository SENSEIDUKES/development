export interface AgentProfile {
  id: 'versa' | 'scout';
  name: string;
  title: string;
  purpose: string;
  role: string;
  logoUrl: string;
  colorClass: string;
}

export const AGENTS = {
  VERSA: {
    id: 'versa',
    name: 'VERSA',
    title: 'The Writer',
    purpose: 'Language / lyrics',
    role: 'Wordsmith. Drafts, rewrites, sharpens phrasing.',
    logoUrl: 'https://images.seihouse.org/AGENT%20EMBLEM/Versa/VERSA_OFFICAL.png',
    colorClass: 'text-human'
  } as AgentProfile,
  SCOUT: {
    id: 'scout',
    name: 'SCOUT',
    title: 'The Retriever',
    purpose: 'Retrieval / discovery',
    role: 'Finder. Scans, surfaces, locates.',
    logoUrl: 'https://images.seihouse.org/AGENT%20EMBLEM/Scout/master-scout-emblem.svg',
    colorClass: 'text-portal'
  } as AgentProfile
};
