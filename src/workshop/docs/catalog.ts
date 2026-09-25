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
      {
        ...topic('story-seed', 'Story Seed'),
        definition: 'The starting place for a new novel and its world.',
        howItFits: 'We collect the creator’s premise and choices through Origin, ARC, and World, then save that Story Seed for review and reuse. Its required story inputs include premise, genre, Style, and Story Tags; other direction and world details can be added as needed. A reviewed World Blueprint expands the seed before we manifest a novel. Starting the novel carries the resolved seed and Blueprint into a HARNESS Story Foundation.',
      },
      {
        ...topic('story-foundation', 'Story Foundation'),
        definition: 'The story’s saved starting truth and direction for chapter writing.',
        howItFits: 'When a novel begins, we resolve its Story Seed and reviewed World Blueprint into a Foundation for HARNESS. It carries the creator’s premise, world facts, characters, opening, and direction without making the Blueprint or a model response a second source of truth. Reviewed changes to a started novel become Foundation revisions; committed chapters and their evidence remain intact.',
      },
      {
        ...topic('origin', 'Origin'),
        definition: 'The part of Story Seed where a novel’s core idea takes shape.',
        howItFits: 'Origin brings together Style, Genre, title, synopsis/premise, Fate Pressure, the Fate Survival switch, and Story Tags. It gives the Blueprint and HARNESS the creator’s initial direction; ARC holds the long-range destination and goals, while World holds the setting and cast. The author’s stated facts stay authoritative when the Blueprint adds detail.',
      },
      {
        ...topic('arc', 'Arc'),
        definition: 'A 100-chapter stretch of a novel with its own goals.',
        howItFits: 'Each arc has one to five sequential Arc Goals, with one active goal at a time and an allocated chapter range for each. The Story Seed ARC section collects the Destined Ending, optional Hard Pins, an initial Active Arc Goal, and Fun Settings; the World Blueprint plans the full Arc Roadmap. HARNESS tracks the live arc and its goals as chapters commit.',
      },
      {
        ...topic('world', 'World'),
        definition: 'The setting, people, powers, and rules of a story.',
        howItFits: 'The World part of Story Seed holds World Identity, characters, factions, abilities, and the power system. The creator can leave room for the Blueprint to add compatible detail. Reviewed facts move into the Story Foundation and later canonical developments are tracked by HARNESS, so background proposals are not mistaken for events that already happened.',
      },
      {
        ...topic('genre', 'Genre'),
        definition: 'The kind of story the creator wants to tell.',
        howItFits: 'Genre is a required Origin choice alongside premise and Style. It helps the Blueprint and chapter writer understand the intended experience, while Story Tags add more specific signals. We interpret it through the chosen storytelling tradition and the creator’s actual direction, not as a fixed plot formula.',
      },
      {
        ...topic('style', 'Style'),
        definition: 'The storytelling tradition shaping how the novel is written.',
        howItFits: 'Origin requires a Style choice; our current official choices are Chinese, Japanese, and Korean. The selection maps to the matching writing skill when HARNESS authors chapters. Style influences voice and storytelling conventions, while the creator’s premise, world, goals, and canon determine the particular story.',
      },
      {
        ...topic('story-tags', 'Story Tags'),
        definition: 'Focused signals about the experience a story should deliver.',
        howItFits: 'Tags sit with premise, Genre, and Style in Origin. The creator can choose them, and the Story Seed can infer suggestions from the other story inputs when tags are empty. They guide Blueprint and chapter generation without becoming mandatory plot events or replacing the creator’s own direction.',
      },
      {
        ...topic('world-identity', 'World Identity', ['Make It Work', 'Main Opposition']),
        definition: 'The story world’s defining facts and starting situation.',
        howItFits: 'In Story Seed, World Identity includes the world type, society, opening location, and the novel’s title. The World section also gathers Main Opposition and the creator’s Make It Work instruction for unusual or difficult ideas. Reviewed Blueprint edits to Seed-owned facts write back to the Seed; the Blueprint may add compatible detail, but it cannot quietly replace what the creator established.',
      },
      {
        ...topic('world-blueprint', 'World Blueprint', ['Blueprint']),
        definition: 'Our editable plan for a novel before it begins.',
        howItFits: 'The Blueprint is a sibling to the Story Seed, not a replacement for it. It expands the creator’s inputs into reviewable world background, cast and power-system detail, Style guidance, the Destined Ending, and an Arc Roadmap. Seed-owned facts stay in the Seed when reviewed; Blueprint-only elaboration remains editable. We validate the roadmap before manifesting the novel and carry the resolved plan into HARNESS.',
      },
      {
        ...topic('destined-ending', 'Destined Ending'),
        definition: 'The ending the creator sets for the novel to move toward.',
        howItFits: 'The creator can set it in Story Seed ARC or review it in the Blueprint; the roadmap’s final arc aims for it. HARNESS carries it as story direction, not as an event already in canon or a forced chapter deadline. In regular reading it remains the guaranteed destination even if a final goal is missed; in Fate Survival it is not guaranteed. Once the novel begins, this ending is fixed.',
      },
      {
        ...topic('hard-pin', 'Hard Pin'),
        definition: 'A creator-set rule the story must not break.',
        howItFits: 'A story can hold up to three Hard Pins, written and changed only by the creator. HARNESS keeps them with the Destined Ending as high-priority direction for every chapter. They have no weights, and neither the Blueprint model nor the chapter writer may invent or silently edit them.',
      },
      {
        ...topic('fun-settings', 'Fun Settings'),
        definition: 'Optional controls for a story’s playful dramatic flavor.',
        howItFits: 'Story Seed ARC lets the creator tune Face-Slaps, Plot Armor, and Recognition at low, medium, or high. These settings enter the chapter writer’s current story information as flavor. They do not outrank the Destined Ending, Hard Pins, the active goal, established canon, or the writing skills.',
      },
      {
        ...topic('arc-roadmap', 'Arc Roadmap'),
        definition: 'The reviewed plan connecting every arc to the novel’s ending.',
        howItFits: 'The World Blueprint plans an arc count and a goal plan for each arc, with the final arc aimed at the Destined Ending. The creator reviews and edits that route before the novel starts and can add arcs before the final arc or regenerate the plan. HARNESS copies the reviewed plans into the novel once; later edits follow each Fate mode’s rules rather than silently changing committed history.',
      },
      {
        ...topic('arc-goal', 'Arc Goal', ['Active Arc Goal', 'allocation', 'deadline']),
        definition: 'A concrete objective for one part of an arc.',
        howItFits: 'An arc has one to five sequential, weighted goals across its 100 chapters. Only its active goal and allocated deadline guide a given chapter; an early success does not start the next goal before its segment. If a deadline chapter does not achieve the goal, the chapter still commits and the goal is marked missed. Regular reading and Fate Survival give that miss different consequences.',
      },
      {
        ...topic('fate-pressure', 'Fate Pressure'),
        definition: 'The intensity setting for a novel’s automatic chapter rhythm.',
        howItFits: 'Origin offers Mortal, Immortal, and Heaven pressure. HARNESS uses the chosen tier with recent chapter functions to calculate the next automatic Rhythm recommendation. Pressure is independent of the Fate Survival switch: it does not choose who directs a chapter, set the Arc Goal deadline, or decide whether the story survives.',
      },
      {
        ...topic('chapter-rhythm', 'Chapter Rhythm'),
        definition: 'The story’s changing balance of progress, worldbuilding, and conflict.',
        howItFits: 'After a chapter commits, HARNESS records the function it served and uses recent functions with Fate Pressure to recommend what kind of chapter comes next. In regular reading, that recommendation informs the automatic path when the reader does not choose one. A reader’s one-chapter direction takes precedence; in Fate Survival, the reader directs every chapter.',
      },
      {
        ...topic('fate-survival', 'Fate Survival', ['Fate Outcome']),
        definition: 'A story mode where the reader directs every chapter and the ending is not guaranteed.',
        howItFits: 'The creator chooses this mode in Origin before the novel begins, and the choice is then fixed. The reader must give each chapter its own direction; HARNESS loads the Fate Survival writing skill on every call. Missed goals can break the route, requiring the next chapter to end the story. The story ends only when committed prose shows the ending—not merely because a goal or chapter count says so.',
      },
      {
        ...topic('alter-fate', 'Alter Fate'),
        definition: 'The reader’s way to choose the next chapter’s path.',
        howItFits: 'Alter Fate opens the Fate page in the Reader; it does not rewrite chapters that already happened. In regular reading, the reader can take one of three suggested directions or write their own instead of letting Rhythm choose. In Fate Survival, they must write their own direction before a chapter can begin. The choice belongs to that one chapter, survives a failed attempt, and is consumed when the chapter commits.',
      },
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
