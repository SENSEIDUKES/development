/** Workshop reference content. Add one current explanation to the existing topic. */
export interface DocsTopic {
  id: string;
  title: string;
  aliases: readonly string[];
  definition?: string;
  howItFits?: string;
  related?: readonly string[];
}

export interface DocsCategory {
  id: string;
  title: string;
  description: string;
  topics: readonly DocsTopic[];
}

const topic = (id: string, title: string, aliases: string[] = []): DocsTopic => ({ id, title, aliases });

// The product-term audit supplies the index, not approved definitions. Deliberately
// leave explanation fields absent until the product owner supplies their wording.
export const docsCategories: readonly DocsCategory[] = [
  {
    id: 'product', title: 'Product & people', description: 'The products, the Workshop, and the people using them.',
    topics: [
      topic('seihouse', 'SEIHouse'), topic('sen', 'SEN', ['SEIHouse Expanded Novels']),
      topic('library', 'Library', ['Celestial Library']), topic('workshop', 'Workshop', ['Development', 'DEV']),
      topic('sensei', 'SENSEI'), topic('creator', 'Creator', ['Author']),
      topic('reader', 'Reader', ['Cultivator']),
    ],
  },
  {
    id: 'story', title: 'Story', description: 'Story creation, world planning, direction, and fate.',
    topics: [
      topic('story-seed', 'Story Seed'), topic('story-foundation', 'Story Foundation'),
      topic('origin', 'Origin'), topic('arc', 'Arc'), topic('world', 'World'),
      topic('genre', 'Genre'), topic('style', 'Style'), topic('story-tags', 'Story Tags'),
      topic('world-identity', 'World Identity', ['Make It Work', 'Main Opposition']),
      topic('world-blueprint', 'World Blueprint', ['Blueprint']),
      topic('destined-ending', 'Destined Ending'), topic('hard-pin', 'Hard Pin'),
      topic('fun-settings', 'Fun Settings'), topic('arc-roadmap', 'Arc Roadmap'),
      topic('arc-goal', 'Arc Goal', ['Active Arc Goal', 'allocation', 'deadline']),
      topic('fate-pressure', 'Fate Pressure'), topic('chapter-rhythm', 'Chapter Rhythm'),
      topic('fate-survival', 'Fate Survival'), topic('alter-fate', 'Alter Fate'),
      topic('fate-outcome', 'Fate Outcome'),
    ],
  },
  {
    id: 'generation', title: 'Generation', description: 'The authoring system and the information it works with.',
    topics: [
      topic('harness', 'HARNESS', ['Harness Generation']), topic('capa', 'CAPA', ['Composable Author Prompt Architecture']),
      topic('capa-schema', 'CAPA Schema'), topic('capa-skill', 'CAPA Skill'),
      topic('capa-prompt', 'CAPA Prompt'), topic('capa-loadout', 'CAPA Loadout'),
      topic('story-information', 'Story Information'), topic('story-information-packet', 'Story Information Packet'),
      topic('mission-reminder', 'Mission Reminder'), topic('immediate-chapter-request', 'Immediate Chapter Request'),
      topic('generation-model-call', 'Generation Model Call'), topic('generated-chapter', 'Generated Chapter'),
      topic('generation-attempt', 'Generation Attempt', ['checkpoint', 'commit', 'replay']),
      topic('story-memory', 'Story Memory', ['context', 'evidence']),
      topic('steering', 'Steering', ['correction']), topic('sen-block', 'SEN Block', ['paragraph', 'prose', 'semantic signal']),
    ],
  },
  {
    id: 'models', title: 'Models', description: 'Models, providers, and how generation work is routed.',
    topics: [
      topic('model', 'Model'), topic('provider', 'Provider'), topic('agent', 'Agent'),
      topic('model-router', 'Model Router'), topic('model-capability', 'Model Capability'),
      topic('generation-consumer', 'Generation Consumer', ['Used by']), topic('model-profile', 'Model Profile'),
    ],
  },
  {
    id: 'packages', title: 'Packages', description: 'Software packages, SPPs, and their different responsibilities.',
    topics: [
      topic('software-package', 'Software Package', ['package owner', 'package lane']),
      topic('seihouse-ui', '@seihouse/ui'), topic('seihouse-library-ui', '@seihouse/library-ui'),
      topic('seihouse-sen', '@seihouse/sen'), topic('seihouse-library', '@seihouse/library'),
      topic('spp', 'SPP'), topic('spp-manifest', 'SPP Manifest', ['Package ID', 'instructions', 'resources']),
      topic('media-pack', 'Media Pack'),
    ],
  },
  {
    id: 'media', title: 'Media', description: 'Media selection, sound, visual expression, and asset records.',
    topics: [
      topic('media-loadout', 'Media Loadout'), topic('media-catalog', 'Media Catalog'),
      topic('media-resolver', 'Media Resolver', ['resolved asset']),
      topic('soundscape', 'Soundscape'), topic('world-cue', 'World Cue'), topic('sound-cue', 'Sound Cue'),
      topic('manifest-action', 'Manifest Action'), topic('manifestation', 'Manifestation'),
      topic('motion-picture', 'Motion Picture'), topic('provenance', 'Provenance'),
    ],
  },
  {
    id: 'reader-codex', title: 'Reader & Codex', description: 'The reading experience and its structured story world.',
    topics: [
      topic('reader-chamber', 'Reader Chamber'), topic('reader-codex', 'Reader Codex'),
      topic('codex-record', 'Codex Record', ['Character', 'Location', 'Faction', 'Artifact', 'Ability', 'Power System', 'Lore', 'World Rule']),
      topic('portrait', 'Portrait'), topic('bestiary', 'Bestiary', ['species']),
      topic('system-prompt', 'System Prompt', ['Fate System Prompt']),
      topic('system-panel', 'System Panel'), topic('world-notice', 'World Notice'),
      topic('color-codes', 'Color Codes'), topic('character-voice', 'Character Voice', ['signature quote', 'voice key']),
      topic('original-language', 'Original Language'), topic('reader-language', 'Reader Language'),
      topic('translation', 'Translation'),
    ],
  },
  {
    id: 'rewards', title: 'Rewards', description: 'Currencies, progression, rewards, and collected customization.',
    topics: [
      topic('energy', 'Energy'), topic('qi', 'QI'), topic('dao-xp', 'DAO XP'), topic('cultivator-rank', 'Cultivator Rank'),
      topic('daily-dao-pillar', 'Daily Dao Pillar'), topic('achievement', 'Achievement'),
      topic('mystery-scroll', 'Mystery Scroll'), topic('fate-survival-relic', 'Fate Survival Relic'),
      topic('familiar', 'Familiar', ['Active Familiar']), topic('familiar-rarity', 'Familiar Rarity'),
      topic('bond-rank', 'Bond Rank'), topic('elemental-effect', 'Elemental Effect', ['Active Elemental Effect']),
      topic('element-mastery', 'Element Mastery'), topic('offer', 'Offer'),
      topic('entitlement', 'Entitlement', ['ownership', 'purchase']), topic('equipment', 'Equipment', ['equipped state']),
    ],
  },
];

export const docsTopics = docsCategories.flatMap(category => category.topics);

export function findDocsTopic(id: string) {
  return docsTopics.find(entry => entry.id === id);
}

export function searchDocs(query: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return docsCategories.flatMap(category => category.topics
    .filter(entry => {
      const text = [entry.title, ...entry.aliases, entry.definition, entry.howItFits, category.title].join(' ').toLocaleLowerCase();
      return words.every(word => text.includes(word));
    })
    .map(entry => ({ ...entry, category: category.title })));
}

export function docsHref(id = 'overview') {
  return `?tab=docs${id === 'overview' ? '' : `&doc=${encodeURIComponent(id)}`}`;
}
