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

// The product-term audit supplied the index, not approved definitions. Add
// explanations only as each term's meaning is confirmed by the product owner.
export const docsCategories: readonly DocsCategory[] = [
  {
    id: 'product', title: 'Product & people', description: 'SEN, the Celestial Library, our Workshop, and the people creating and reading stories.',
    topics: [
      {
        ...topic('seihouse', 'SEIHouse'),
        definition: 'A better time capsule and translator of artistic expression.',
        howItFits: 'SEIHouse is the company and creative platform we are building around that purpose. SEN (SEIHouse Expanded Novels) is our engine for expanded novels, and the Celestial Library is our own place to create and experience them. SEA (SEIHouse Expanded Albums) brings the same vision into music. We develop and pressure-test reusable systems through SEN so they can serve SEA too; the two sides grow together.',
      },
      {
        ...topic('sen', 'SEN', ['SEIHouse Expanded Novels']),
        definition: 'Our portable engine for expanded novels.',
        howItFits: 'We build SEN as the shared narrative foundation beneath the Celestial Library. It provides story and chapter structure, Reader and Codex experiences, cards, Color Codes, translation, and other reusable capabilities. Other creators and publishers can use SEN in their own apps with their own stories, branding, accounts, storage, and media. AI generation is an optional content source. We keep Library-specific rules in the Library so SEN stays portable.',
      },
      {
        ...topic('library', 'Library', ['Celestial Library']),
        definition: 'Our home for creating, discovering, and experiencing expanded novels.',
        howItFits: 'The Celestial Library is the application we build on top of SEN. SEN gives us reusable narrative capabilities; we add our visual identity, story creation and discovery, profiles and community, cultivation and QI, rewards, and economy. The Library’s host and backend provide accounts, storage, APIs, and the source of truth for transactions. We keep those first-party rules here so SEN can power other apps too.',
      },
      {
        ...topic('workshop', 'Workshop', ['Development', 'DEV']),
        definition: 'Our space for building, previewing, and refining SEN and Library experiences.',
        howItFits: 'We use the Workshop inside the Development repository to see SEN and Library work in context while it is still being developed. Its previews, controls, and NovelExpanded Docs let us test product flows and agree on the language around them. Workshop is our workbench, not a product package: SEN owns reusable narrative behavior, and Library owns our first-party product behavior. Moving approved work into production is a separate step.',
      },
      {
        ...topic('creator', 'Creator', ['Author']),
        definition: 'A person creating a story with SEN or the Celestial Library.',
        howItFits: 'We use Creator for the person making a story. It is not a separate kind of user from Reader: someone can create one story and experience another. SEN provides reusable story and chapter capabilities, while the Celestial Library gives creators our own place to make and share their novels. The artistic direction belongs to the creator.',
      },
      {
        ...topic('reader', 'Reader', ['Cultivator']),
        definition: 'A person experiencing a story; in the Celestial Library, we call that reader a Cultivator.',
        howItFits: 'We use Reader for the person reading chapters, listening, or exploring a story’s Codex. SEN carries the reusable reading experience, and we bring it into the Celestial Library with our cultivation language and progression. Cultivator is our name for the Reader there, not a separate user type. The same person can be a Creator when making a work.',
      },
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
      topic('fate-survival', 'Fate Survival', ['Fate Outcome']), topic('alter-fate', 'Alter Fate'),
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
      topic('mind-palace', 'Mind Palace', ['bookmark', 'saved passage']),
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
