import {
  DEFAULT_COVER_LOOK,
  STORY_COVER_ASPECT_RATIO,
  STORY_COVER_FIELD_LIMITS,
  TRADITION_LOOK,
  buildStoryCoverPrompt,
} from '../../../server/story-cover/prompt';
import { STORY_COVER_VISITOR_LIMIT } from '../../../server/story-cover/limits';

/**
 * Every image prompt SEIHouse has written, by kind of image, with its rules.
 * The app's own prompts are read from the live code, so this page can never
 * drift from what the image model receives. The old production app's prompts
 * (SENSEIDUKES/Light-Novels at 647165a, 2026-09-16) are quoted word for word,
 * with each variable shown in braces, so they can be refined and rebuilt on
 * the new path; nothing here calls them. A change to any prompt must be
 * recorded in the dated history (`imagePromptsHistory.ts`); a test fails until
 * it is.
 */

export type ImagePromptId =
  | 'cover'
  | 'old-cover'
  | 'old-cover-sage'
  | 'old-portrait-writer'
  | 'old-portrait-request'
  | 'old-portrait-fallback'
  | 'old-codex-character'
  | 'old-codex-beast'
  | 'old-codex-location'
  | 'old-codex-artifact'
  | 'old-codex-first-manifest'
  | 'old-chapter-memory'
  | 'old-style-wrapper'
  | 'familiar-style';

export type ImageStatus = 'in-the-app' | 'old-app' | 'outside-the-app';

export const IMAGE_STATUS_LABEL: Record<ImageStatus, string> = {
  'in-the-app': 'In the app',
  'old-app': 'Old app only: not built on the new path yet',
  'outside-the-app': 'Made outside the app',
};

export interface ImagePrompt {
  id: ImagePromptId;
  title: string;
  /** Where the words live: a live file, or the old app's file and commit. */
  source: string;
  /** When the model reads it, and what fills its braces. */
  when: string;
  /** The exact text; braces mark what is filled in. */
  text: string;
}

export interface ImageRule {
  title: string;
  text: string;
}

export interface ImageKind {
  id: string;
  title: string;
  status: ImageStatus;
  summary: string;
  prompts: ImagePrompt[];
  rules: ImageRule[];
}

const OLD_APP = 'Light-Novels';
const old = (path: string) => `${OLD_APP} ${path} @ 647165a`;

/** The cover prompt with every field shown as its brace, so its shape reads at a glance. */
export const COVER_PROMPT_SHAPE = buildStoryCoverPrompt({
  title: '{title}', genre: '{genre}', style: 'chinese', synopsis: '{logline, else premise}',
  mainCharacter: '{main character}', tone: '{tone}', world: '{world facts}', tags: ['{story tags}'],
});

const limitLine = Object.entries(STORY_COVER_FIELD_LIMITS)
  .map(([field, limit]) => `${field} ${limit.toLocaleString('en')}`).join(', ');

/**
 * The cover's default image model, as the Model Router names it. The router's
 * catalog is server-only, so a test keeps this in step with it.
 */
export const COVER_DEFAULT_MODEL_LABEL = 'Nano Banana 2 (Gemini 3.1 Flash Image)';

/** The old app's shared art direction, added to every image after its own prompt. */
const OLD_STYLE_WRAPPER = `{prompt}. Style: {style}. Solo subject, centered, no borders, no text.

The style, by kind of image:
- location: mystical landscape, fantasy environment concept art, high-energy light novel scenery, dramatic lighting, celestial aura, beautiful composition, vibrant colors
- chapterHero: Visual Memory: stark, stylized cinematic illustration, dramatic crucial moment frozen in time. SEIHouse canonical brand palette: #000000, #FAFAFA, #8B0000, #04ACFF. Emotional core, meaning-first creator artwork, high contrast, immersive mood piece.
- every other kind (character, beast, artifact, faction, cover, portrait): professional anime character portrait, fantasy webnovel cover design, intricate details, sharp focus, celestial backlighting, clean high contrast colors
- with the @preset/library-pictures model, every kind: highly-detailed fantasy illustration, premium light novel art style, vibrant and crisp book illustration, cinematic lighting, masterpiece`;

const OLD_STYLE_BIBLE_DEFAULT = 'Chinese light novel world aesthetic, xianxia / wuxia fantasy illustration, cinematic, mystical, premium webnovel art.';

export const IMAGE_KINDS: ImageKind[] = [
  {
    id: 'cover',
    title: 'Cover art',
    status: 'in-the-app',
    summary: 'Story View\'s Manifest cover: one cover from the story\'s own words, behind the media reveal, worn on World Info and Home.',
    prompts: [
      {
        id: 'cover',
        title: 'Cover art prompt',
        source: 'src/server/story-cover/prompt.ts (buildStoryCoverPrompt)',
        when: 'Each Manifest cover or New cover. The braces are filled from the story: its title, genre, Story Seed tradition, Blueprint logline (else its premise), main character, tone, world facts and story tags; never its chapters. A field the story lacks is left out.',
        text: COVER_PROMPT_SHAPE,
      },
      {
        id: 'old-cover',
        title: 'The old app\'s cover prompt (for comparison)',
        source: old('src/hooks/useVisualAssets.ts:61'),
        when: 'Forge Cover. Its "main character visual description" was the Blueprint\'s mcProfile (name, personality, flaws, cheats), not a visual description, and its shared visual style was the Blueprint\'s styleBible (else the default below). Then the old shared style was added (the portrait style, at 1:1).',
        text: `Cover image for a story titled "{title}". Genre: {genre}. Core Premise: {premise}. Main character visual description: {mcProfile, else main character's name}. Main visual conflict: {firstArcPromise, else premise}. World aesthetic: {worldOverview, else genre}. Shared visual style: {styleBible, else "${OLD_STYLE_BIBLE_DEFAULT}"}. Epic fantasy webnovel book cover, digital painting, textless.`,
      },
      {
        id: 'old-cover-sage',
        title: 'The old app\'s Sage cover upgrade',
        source: old('src/hooks/useVisualAssets.ts:64'),
        when: 'Only for a reader with 12,000+ Qi who had reached the story\'s ending; they typed the theme themselves.',
        text: `Ascended Sage custom Cover image. Story: "{title}". Genre: {genre}. Ultimate theme: {the reader's theme}. Core Premise: {premise}. Main character visual description: {mcProfile, else main character's name}. Main visual conflict: {firstArcPromise, else premise}. World aesthetic: {worldOverview, else genre}. Shared visual style: {styleBible, else "${OLD_STYLE_BIBLE_DEFAULT}"}. Epic fantasy webnovel book cover, divine sage of branching paths, majestic cosmic aura, digital painting, textless.`,
      },
    ],
    rules: [
      { title: 'Look by tradition', text: [...Object.entries(TRADITION_LOOK).map(([style, look]) => `${style}: ${look}`), `no tradition: ${DEFAULT_COVER_LOOK}`].join('\n') },
      { title: 'Shape', text: `Portrait, ${STORY_COVER_ASPECT_RATIO}, like a book cover (the World Card's own shape). The old app made every image square (1:1).` },
      { title: 'No lettering', text: 'The cover carries no text of any kind: World Info and Home show the title beside the art.' },
      { title: 'Field limits', text: `Each field is clipped on the server, so a request can never carry a long prompt of its own: ${limitLine} (at most ${STORY_COVER_FIELD_LIMITS.tags} tags).` },
      { title: 'Model', text: `The Model Router's Images choice (the Router lists every image model it offers); ${COVER_DEFAULT_MODEL_LABEL} when none is chosen.` },
      { title: 'Who may make one', text: `Visitors may make ${STORY_COVER_VISITOR_LIMIT.limit} every ${STORY_COVER_VISITOR_LIMIT.windowMs / 60_000} minutes; the owner's access token lifts the limit. A cover is kept on the device until the database keeps it.` },
      { title: 'The old app\'s cover evolution', text: 'The old app had an "Awaken Evolution" button for covers, but nothing ever set the story ready for it, so only the Sage upgrade could replace a cover. Every past cover was kept and could be chosen again.' },
    ],
  },
  {
    id: 'profile-picture',
    title: 'Profile picture (the Divine Mirror)',
    status: 'old-app',
    summary: 'The reader\'s own cultivator portrait in the Cave. In the app the Divine Mirror shows "Not in the app yet." The old app wrote it in two steps: a text model wrote the image prompt from the reader\'s photo and progress, then the image model painted it.',
    prompts: [
      {
        id: 'old-portrait-writer',
        title: 'Step 1: the prompt writer\'s instructions',
        source: old('src/server/routes/mediaRouter.ts:69-92'),
        when: 'When the reader uploaded a photo (gemini-2.5-flash read the photo and wrote the image prompt). The braces are the reader\'s current novel realm and equipped Cosmic Artifact, read once, when they pressed Generate.',
        text: `You are a mystical portrait artist of the immortal realms.
Your task is to analyze the user's uploaded portrait photo, their custom preferences, and their spiritual progression metrics to forge a stunning, anime/light novel-style "Cultivator Portrait" that is deeply attuned to their achievements.

SPIRITUAL PROGRESSION RULES (Incorporate these elements into the prompt based on the user's details):
- DAO RANK ATTUNEMENT (Dresses, robes, and environmental grandeur):
  * "Mortal Reader" -> Simple, humble coarse linen apprentice garments, a simple wooden hairpin, basic mountain landscape.
  * "Wandering Disciple" -> Light blue and white flowing silk robes, soft radiant blue aura, holding a simple steel cultivator sword or wooden talisman.
  * "Outer Sect Scribe" -> Cyan-tinted scholarly robes, surrounded by drifting scrolls, glowing ink droplets, holding an elegant calligraphy brush.
  * "Inner Sect Scholar" -> Deep emerald-green research silk robes, glowing jade ornaments, floating ancient texts with green spiritual scripture.
  * "Dao Adept" -> Royal violet star robes, crackles of violet lightning or spiritual flame, a crown of celestial quartz.
  * "Spirit Author" -> Imperial gold-threaded robes, a divine brush of pure amber light tracing glowing sigils in the sky, surrounded by mythical qi phantoms.
  * "Heavenly Chronicler" -> Brilliant gold-leaf vestments, a celestial halo behind their head, constellations, gold particle sparks and starry nebulae in the background.
  * "Sage of Branching Paths" -> Shifting translucent prism or rainbow-gradient silk, holding a faceted glass lotus/mirror, standing amidst branching pathways of light and parallel reality portals.
  * "Dao Master" -> Primordial nebulae/void dark robes, a dual yin-yang cosmic matrix spinning in their background, shattering glass-like reality patterns, eyes glowing with pure, unmitigated divine consciousness.

- CULTIVATION POWER STAGE (Aura and visual power level):
  * Reflect the user's current novel power stage "{power stage, else None}" in their energy lines (e.g., if it mentions "Qi Condensation", show delicate visible wisps of Qi; if "Foundation Establishment", show a solid glowing core; if "Nascent Soul", show a mini radiant projection of their soul; if "Core Formation", a spinning golden sphere at the dantian).

- EQUIPPED COSMIC ARTIFACT (To be actively held or floating beside them):
  * If an artifact is equipped ({"artifact name": description (rarity rarity), else None}), you MUST seamlessly paint this artifact into the scene. For example, if it's a sword, they are wielding it; if it's a mirror/gourd/talisman, it is floating near their hand, glowing with power proportional to its rarity.

GENERAL CONSTRAINTS:
1. The prompt MUST retain the user's apparent gender, facial structure, expression, hair style (adapted elegantly to Xianxia style), and overall physical vibe from their uploaded photo, but ascended into an immortal form.
2. The response must be ONLY the raw prompt string for the image generator (no introduction, explanation, or markdown quotes). Keep it under 200 words.`,
      },
      {
        id: 'old-portrait-request',
        title: 'Step 1: the request with the photo',
        source: old('src/server/routes/mediaRouter.ts:106'),
        when: 'Sent with the photo. The description is the reader\'s own (up to 2,000 characters); the rank and XP are their Dao Rank.',
        text: 'Analyze this image, my description: "{description, else None}", Dao Rank: "{Dao Rank, else Mortal Reader}" (XP: {Dao XP, else 0}), Power Stage: "{power stage, else None}", Equipped Artifact: {artifact name, else None}, and write a detailed progression-attuned anime-style image generator prompt.',
      },
      {
        id: 'old-portrait-fallback',
        title: 'Without a photo',
        source: old('src/server/routes/mediaRouter.ts:123'),
        when: 'When no photo was given, or Step 1 failed: this is the image prompt itself. The old shared style was then added (the portrait style, at 1:1).',
        text: 'A majestic celestial cultivator matching rank "{Dao Rank, else Mortal Reader}" and power stage "{power stage, else None}", professional anime character portrait, fantasy webnovel style, intricate details, sharp focus, celestial backlighting, clean high contrast colors. User traits: {description, else "mystical eyes, elegant robes, swirling Qi aura, starry background"}{, holding or floating with {artifact name}, when one is equipped}',
      },
    ],
    rules: [
      { title: 'It grows with the reader', text: 'Robes, aura and scene follow the 9 Dao Ranks (Mortal Reader 0 Qi, Wandering Disciple 100, Outer Sect Scribe 300, Inner Sect Scholar 750, Dao Adept 1,500, Spirit Author 3,000, Heavenly Chronicler 6,000, Sage of Branching Paths 12,000, Dao Master 25,000), the realm the reader\'s story has reached, and the Cosmic Artifact they carry. But only when the reader made a new one: nothing changed it on a rank-up or breakthrough.' },
      { title: 'The photo is a guide only', text: 'The photo was read to write the prompt (keeping the reader\'s apparent gender, face, expression, hair and presence) and never given to the image model or kept.' },
      { title: 'Each portrait remembers its moment', text: 'A kept portrait recorded the rank, XP, realm and artifact it was made at, so a timeline of portraits by rank was possible; no page ever showed one.' },
      { title: 'Shape', text: 'Square (1:1), shown in a circle.' },
    ],
  },
  {
    id: 'codex-portraits',
    title: 'Codex portraits (characters and beasts)',
    status: 'old-app',
    summary: 'A character\'s or beast\'s image in the Codex. The new Codex waits (NOVEL_EXPANDED.md), so nothing makes these now; the Workshop\'s Codex shows stand-in art.',
    prompts: [
      {
        id: 'old-codex-character',
        title: 'Character portrait',
        source: old('src/hooks/useCodexImageEvolution.ts:205'),
        when: 'Awaken Portrait, and again at an evolution milestone. The braces come from the Codex entry the chapter writer kept; the arc events line appears only after a milestone. Then the old shared style was added (the portrait style, at 1:1).',
        text: `Character image. Name: {name}. Visual description: {description}. Role: {role}. Current state/status: {status}. Power level / aura: {power level, else Unknown}.{ Recent arc events affecting their aura: {the arc's summary}.} Shared visual style: {styleBible, else "${OLD_STYLE_BIBLE_DEFAULT}"}.`,
      },
      {
        id: 'old-codex-beast',
        title: 'Beast portrait',
        source: old('src/hooks/useCodexImageEvolution.ts:207'),
        when: 'As for a character, from the beast\'s Codex entry.',
        text: `Beast image. Name: {name}. Species/Type: {body type, else Unknown Beast}. Visual description: {description}. Evolution state/Threat Tier: {threat tier, else Unknown}. Aura / element style: {element, else Unknown}.{ Recent arc events affecting their aura: {the arc's summary}.} Shared visual style: {styleBible, else "${OLD_STYLE_BIBLE_DEFAULT}"}.`,
      },
    ],
    rules: [
      { title: 'Evolution at milestones', text: 'A character\'s power level or status changing (a breakthrough, a major status change), or a beast\'s, marked it "pending evolution". When the arc ended, it became ready: the reader could make one new image, with the arc\'s summary added as "recent arc events affecting their aura". One image per entry, and a new one only after a milestone.' },
      { title: 'Every version kept', text: 'Each image was kept in the entry\'s history with the chapter it was made at and its prompt, and the reader could go back to any of them.' },
      { title: 'No likeness carried over', text: 'Each new image was made from words alone, with no earlier image given to the model, so a character\'s face and look could change from one version to the next. This is the consistency problem to solve before portraits evolve again.' },
      { title: 'Who earns an image', text: 'Only a named entry that matters: a central or major one with 2 or more signals, or a supporting one with 4 or more (it recurs, is owned, drives the plot, carries emotion or power, or will matter later). "A named entity is not automatically visual material." An entry with an image always keeps it.' },
      { title: 'Looks and safety (the text side)', text: 'The old chapter writer\'s rule, which shaped every description these prompts used: "CHARACTER LOOKS & SAFETY: You may describe the physical appearance, attire, and general features of any character under the age of 16 in full detail, but you MUST NEVER sexualize them or use suggestive descriptions. Do not overly describe the beauty of minors under 16 in any evocative or suggestive manner." No such rule was added at the image call itself.' },
    ],
  },
  {
    id: 'codex-places',
    title: 'Codex places, artifacts and factions',
    status: 'old-app',
    summary: 'Images for the Codex\'s locations and artifacts, and a first image from a reveal card for any entry, factions included.',
    prompts: [
      {
        id: 'old-codex-location',
        title: 'Location image',
        source: old('src/hooks/useCodexImageEvolution.ts:209'),
        when: 'As for a character. Locations had their own landscape style.',
        text: `Location image. Name: {name}. Visual description: {description}. Realm/Zone type: {realm, else Unknown}. Atmosphere/Safety: {safety level, else Unknown}.{ Recent arc events affecting their aura: {the arc's summary}.} Shared visual style: {styleBible, else "${OLD_STYLE_BIBLE_DEFAULT}"}.`,
      },
      {
        id: 'old-codex-artifact',
        title: 'Artifact image',
        source: old('src/hooks/useCodexImageEvolution.ts:211'),
        when: 'As for a character; artifacts used the portrait style.',
        text: `Artifact image. Name: {name}. Visual description: {description}. Tier/Rarity: {tier, else Unknown}. Aura/Energy style: visually striking.{ Recent arc events affecting their aura: {the arc's summary}.} Shared visual style: {styleBible, else "${OLD_STYLE_BIBLE_DEFAULT}"}.`,
      },
      {
        id: 'old-codex-first-manifest',
        title: 'First image from a reveal card',
        source: old('src/hooks/useImageManifest.ts:64'),
        when: 'Manifest portrait on a Codex hovercard or the Reader\'s reveal card, for any kind of entry (the only way a faction got an image). Saved at once, with no preview.',
        text: '{name}. {description}',
      },
    ],
    rules: [
      { title: 'Evolution at milestones', text: 'A location\'s atmosphere or safety changing, or an artifact changing owner or condition, unlocked one new image at the arc\'s end, as for characters.' },
      { title: 'Not every noun', text: 'The old writer was told: "The Codex is a durable visual canon, not a record of every noun in the chapter." One-scene props, generic weapons, temporary rooms, unnamed guards and passing disciples were never added.' },
    ],
  },
  {
    id: 'chapter-scene',
    title: 'Chapter scene art (Visual Memory)',
    status: 'old-app',
    summary: 'An image of a momentous chapter\'s defining moment, made automatically. The Aura Veil\'s media reveal is ready to show such an image.',
    prompts: [
      {
        id: 'old-chapter-memory',
        title: 'Visual Memory prompt',
        source: old('src/hooks/useReaderVisuals.ts:65'),
        when: 'After a momentous chapter. The brace is the chapter\'s summary. Then the old shared style was added (the Visual Memory style with SEIHouse\'s palette, at 1:1).',
        text: 'A cinematic visual memory of the defining moment that just happened: {chapter summary, else "A critical climactic climax in the story."} Render as a vivid frozen memory capturing the emotional core and exact action of the moment.',
      },
    ],
    rules: [
      { title: 'Only momentous chapters', text: 'A chapter had to score as momentous (a breakthrough, turning point, evolution, betrayal, ascension, conquest, destruction, calamity, rival battle, romance or first kiss), and at most 3 chapters in an arc got one. These did not count against the reader\'s daily images.' },
      { title: 'Brand palette', text: 'Its style named SEIHouse\'s palette: #000000, #FAFAFA, #8B0000, #04ACFF.' },
    ],
  },
  {
    id: 'old-shared',
    title: 'The old app\'s shared art direction',
    status: 'old-app',
    summary: 'Added by the old app\'s image router to every image after its own prompt. The new cover prompt carries its own direction instead.',
    prompts: [
      {
        id: 'old-style-wrapper',
        title: 'Style added to every image',
        source: old('src/aiRouter.ts:652-660'),
        when: 'Every old image, after its own prompt ({prompt}), with the style for its kind.',
        text: OLD_STYLE_WRAPPER,
      },
    ],
    rules: [
      { title: 'Shape and model', text: 'Every image square (1:1). The default model was Gemini 3.1 Flash Lite Image; a failed image fell back to Pollinations at 512×512.' },
      { title: 'Daily images', text: 'A reader on the free (Mortal) tier could make 4 images a day; other tiers had no limit. Automatic images (chapter scenes) never counted.' },
    ],
  },
  {
    id: 'familiar-art',
    title: 'Familiar art',
    status: 'outside-the-app',
    summary: 'The Familiars\' animation sheets were made outside the app from a reference image of each, then kept as art. Their rules were removed from the repository on 2026-09-22 ("Secure Familiar renderer metadata"); they are quoted from the commit before.',
    prompts: [
      {
        id: 'familiar-style',
        title: 'Familiar style contract',
        source: 'public/familiars/<id>/pet-request.json, removed in 27e89a1',
        when: 'Each Familiar\'s sheet, with its reference image as the sole visual authority (prompt-only generation was not allowed). Then its own style notes.',
        text: `Pet-safe sprite: compact full-body mascot, readable in a 192x208 cell, clear silhouette, simple face, stable palette/materials, and crisp edges for chroma-key extraction.

Style auto: Infer the most appropriate pet-safe style from the user request and reference images, then keep that exact style consistent across every row. User style notes: {the Familiar's style notes}
Style 3d-toy: Stylized 3D toy mascot with smooth rounded forms, simple materials, clear silhouette, and no photoreal complexity.`,
      },
    ],
    rules: [
      { title: 'Each Familiar\'s style notes', text: `celestial-guardian (3d-toy): Elegant polished fantasy creature with readable chunky shapes, softly shaded pearl white and pale blue, restrained pale gold timepiece details, dignified and friendly.
celestial-moon-moth: Polished soft 3D fantasy familiar matching the sole reference. Simplify only microscopic star texture and fine tracery as needed for 60px readability; never change the main wing shapes, crescent marks, eyes, ruff, antennae, pendant, or palette.
galaxy-octopus: Preserve the attached image as sole visual authority: polished luminous storybook 3D-painterly rendering, deep cobalt/indigo/violet skin with cyan highlights, sparse embedded pink-cyan-gold star specks, large green irises, gold accents, clean compact silhouette, transparent-ready sprite construction; simplify only tiny surface speckles when needed for 60px readability.
judgmental-jiangshi: Faithful stylized 3D chibi toy rendering from the reference, simplified only for 60px readability; compact full-body proportions, soft fabric and aged-metal materials, restrained motion, clean flat chroma background.
lady-bug: Polished 3D toy-like mascot rendering matching the reference; compact full-body sprite, transparent chroma background for deterministic cleanup, no text or scenery.
little-monkey-king (3d-toy): Grounded compact transparent pet production art: no scenery, text, glow, shadows, particles, motion lines, or opaque background; clean removable chroma background only.
living-grimoire: Match original polished high-end 3D fantasy illustration: tactile cobalt leather, dimensional luminous cyan eyes, warm gilded metal, violet gems and cream layered pages. Clear face and full book at 60px.
lucky-bake-danuki: Warm premium painterly mascot rendering from the reference, clean separable full-body sprite, preserve material hierarchy of plush fur, woven straw, parchment, ceramic, purple cord and polished gold. Simplify surface detail only where needed for 60px recognition. No text, logos, detached particles, shadows, scenery, floor marks, or glow.
nine-tailed-fox: Match the polished soft painterly dimensional illustration of the supplied image, compact full-body readable sprite with clean silhouette and generous safe padding; transparent final background.
phoenix: Match the supplied premium richly shaded fantasy character render. Crisp layered sculpted feathers, luminous amber irises, dimensional polished gold, rich scarlet shadows and warm pale gold face. Not pixel art, not flat cartoon, not muddy low resolution. Keep face large and readable at 60px.
quill: none.` },
    ],
  },
];

/**
 * Ideas for images that change over time: the owner's, and what the old app
 * did toward them. None is built; they are kept here so they are designed on
 * purpose when images are rebuilt.
 */
export const IMAGE_IDEAS: ImageRule[] = [
  { title: 'The main character across the ages (the owner\'s idea)', text: 'Codex portraits that update at milestones, showing the main character at 16 beside his 100-year self, and beside his 10,000-year self. Never built: the old app had no age-progression or side-by-side portrait. It needs the same face carried from image to image, which means giving the model the earlier portrait as a reference image (the Nano Banana models accept one), not words alone.' },
  { title: 'A profile picture that evolves', text: 'The old Divine Mirror dressed the reader by Dao Rank, realm and artifact, but only when they made a new one. An evolving portrait would offer a new one at each rank, keeping the reader\'s likeness from their current portrait, and keep the earlier ones as a timeline (each old portrait already recorded its rank).' },
  { title: 'Codex evolution, with consistency', text: 'The old Codex unlocked a new image after a breakthrough, a status change, or an artifact changing hands, at the arc\'s end. To keep a character recognizable, each new version should be made from the previous one (as a reference image) plus what changed.' },
];

export const IMAGE_PROMPTS: ImagePrompt[] = IMAGE_KINDS.flatMap(kind => kind.prompts);

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
