import {
  COVER_PROMPT_TEMPLATE,
  COVER_TITLE_OFF,
  COVER_TITLE_ON,
  COVER_TRADITIONS,
  STORY_COVER_ASPECT_RATIO,
  STORY_COVER_FIELD_LIMITS,
} from '../../../server/story-cover/prompt';
import { STORY_COVER_VISITOR_LIMIT } from '../../../server/story-cover/limits';
import { PROFILE_PICTURE_ASPECT_RATIO, PROFILE_PICTURE_PROMPT, PROFILE_PICTURE_VARIATIONS } from '../../../server/profile-picture/prompt';
import { PROFILE_PICTURE_VISITOR_LIMIT } from '../../../server/profile-picture/limits';

export { COVER_PROMPT_TEMPLATE, COVER_TITLE_OFF, COVER_TITLE_ON, PROFILE_PICTURE_PROMPT };

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
  | 'cover-title-on'
  | 'cover-title-off'
  | 'cover-current'
  | 'profile-picture'
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
  /** Images made for each request: three to choose from, or one that is simply what the reader gets. */
  variations: 1 | 3;
}

const OLD_APP = 'Light-Novels';
const old = (path: string) => `${OLD_APP} ${path} @ 647165a`;

const limitLine = Object.entries(STORY_COVER_FIELD_LIMITS)
  .map(([field, limit]) => `${field} ${limit.toLocaleString('en')}`).join(', ');

/**
 * Prompts taken off the page, by the title they had, so the history still
 * names them. The old app's two-step profile picture was removed on
 * 2026-10-08: the photo now goes straight to the image model.
 */
export const RETIRED_IMAGE_PROMPTS: Record<string, string> = {
  'old-portrait-writer': 'The old app\'s profile prompt writer (removed)',
  'old-portrait-request': 'The old app\'s profile request with the photo (removed)',
  'old-portrait-fallback': 'The old app\'s profile prompt without a photo (removed)',
  'cover-current': 'What the app sends today (replaced by the approved template, 2026-10-09)',
};

/**
 * The cover's default image model, as the Model Router names it. The router's
 * catalog is server-only, so a test keeps this in step with it.
 */
export const COVER_DEFAULT_MODEL_LABEL = 'Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)';

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
    variations: 3,
    summary: 'World Info\'s cover says Manifest: the reader makes one cover (5 Energy) or three to choose from (15), from the story\'s own words, and the one they keep is worn on World Info and Home.',
    prompts: [
      {
        id: 'cover',
        title: 'Cover art prompt',
        source: 'src/server/story-cover/prompt.ts (COVER_PROMPT_TEMPLATE), the owner\'s approved template (2026-10-08)',
        when: 'Each cover made, once per cover. A line whose field the story does not have is left out. The braces are filled from the story: its title, Story Seed tradition, genre, Blueprint logline (else its premise), main character, tone, world facts and story tags; never its chapters. {title instruction} is one of the two title instructions below.',
        text: COVER_PROMPT_TEMPLATE,
      },
      {
        id: 'cover-title-on',
        title: 'Title instruction: title enabled',
        source: 'src/server/story-cover/prompt.ts (COVER_TITLE_ON)',
        when: 'Fills {title instruction}: the app draws the title on every cover today.',
        text: COVER_TITLE_ON,
      },
      {
        id: 'cover-title-off',
        title: 'Title instruction: title disabled',
        source: 'src/server/story-cover/prompt.ts (COVER_TITLE_OFF)',
        when: 'Fills {title instruction} when the title is shown beneath the artwork instead (not offered yet).',
        text: COVER_TITLE_OFF,
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
      { title: 'Tradition', text: [...Object.entries(COVER_TRADITIONS).map(([style, name]) => `${style}: ${name}`), 'no tradition: the Tradition line is left out'].join('\n') },
      { title: 'One or three', text: 'The reader chooses: one cover (5 Energy), kept as soon as it is made, or three to choose from (15 Energy), each its own request; the one they keep becomes the cover and the others are let go.' },
      { title: 'Shape', text: `Portrait, ${STORY_COVER_ASPECT_RATIO}, like a book cover (the World Card's own shape). The old app made every image square (1:1).` },
      { title: 'The title on the cover', text: 'The exact title is drawn once on every cover (title enabled is the default). Title disabled, with no lettering, is ready for when the reader is offered the choice.' },
      { title: 'Field limits', text: `Each field is clipped on the server, so a request can never carry a long prompt of its own: ${limitLine} (at most ${STORY_COVER_FIELD_LIMITS.tags} tags).` },
      { title: 'Model', text: `The Model Router's Images choice (the Router lists every image model it offers); ${COVER_DEFAULT_MODEL_LABEL} when none is chosen.` },
      { title: 'Who may make one', text: `Visitors may make ${STORY_COVER_VISITOR_LIMIT.limit} every ${STORY_COVER_VISITOR_LIMIT.windowMs / 60_000} minutes; the owner's access token lifts the limit. A cover is kept on the device until the database keeps it.` },
      { title: 'The old app\'s cover evolution', text: 'The old app had an "Awaken Evolution" button for covers, but nothing ever set the story ready for it, so only the Sage upgrade could replace a cover. Every past cover was kept and could be chosen again.' },
    ],
  },
  {
    id: 'profile-picture',
    title: 'Profile picture',
    status: 'in-the-app',
    variations: 3,
    summary: 'The reader\'s portrait as a cultivator, made from their photo in the Profile page\'s portrait builder. The photo goes straight to the image model with this prompt.',
    prompts: [
      {
        id: 'profile-picture',
        title: 'Profile picture prompt',
        source: 'src/server/profile-picture/prompt.ts (PROFILE_PICTURE_PROMPT)',
        when: 'When the reader makes their portrait: sent to the image model together with their photo.',
        text: PROFILE_PICTURE_PROMPT,
      },
    ],
    rules: [
      { title: 'The photo goes to the image model', text: 'The reader\'s photo is given to the image model with the prompt, so it paints from the photo itself and keeps their likeness and skin tone.' },
      { title: 'One portrait, no evolving', text: 'The portrait does not change with Dao Rank, realm or artifacts, and keeps no timeline of past portraits. A reader makes a new one only when they choose to.' },
      { title: 'Three to choose from', text: `Each request makes ${PROFILE_PICTURE_VARIATIONS} portraits and the reader chooses the one they want; Make three more starts again.` },
      { title: 'Shape', text: `Square (${PROFILE_PICTURE_ASPECT_RATIO}), shown in a circle.` },
      { title: 'Model', text: `The Model Router's Images choice; ${COVER_DEFAULT_MODEL_LABEL} when none is chosen.` },
      { title: 'Who may make one', text: `Visitors may make ${PROFILE_PICTURE_VISITOR_LIMIT.limit / PROFILE_PICTURE_VARIATIONS} sets of ${PROFILE_PICTURE_VARIATIONS} every ${PROFILE_PICTURE_VISITOR_LIMIT.windowMs / 60_000} minutes; the owner's access token lifts the limit. The photo is never kept; the chosen portrait is kept on the device until the database keeps it.` },
      { title: 'Trying it in the Image Lab', text: 'Try this prompt, then Attach an image with a photo: the Lab sends both to the image model and makes three to choose from.' },
    ],
  },
  {
    id: 'codex-portraits',
    title: 'Codex portraits (characters and beasts)',
    status: 'old-app',
    variations: 1,
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
      { title: 'One image, no choosing', text: 'One image is made and it is what the reader gets, like fate: no variations to choose from.' },
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
    variations: 1,
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
      { title: 'One image, no choosing', text: 'One image is made and it is what the reader gets, like fate: no variations to choose from.' },
      { title: 'Evolution at milestones', text: 'A location\'s atmosphere or safety changing, or an artifact changing owner or condition, unlocked one new image at the arc\'s end, as for characters.' },
      { title: 'Not every noun', text: 'The old writer was told: "The Codex is a durable visual canon, not a record of every noun in the chapter." One-scene props, generic weapons, temporary rooms, unnamed guards and passing disciples were never added.' },
    ],
  },
  {
    id: 'chapter-scene',
    title: 'Chapter scene art (Visual Memory)',
    status: 'old-app',
    variations: 1,
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
      { title: 'One image, no choosing', text: 'One image is made and it is what the reader gets, like fate: no variations to choose from.' },
      { title: 'Only momentous chapters', text: 'A chapter had to score as momentous (a breakthrough, turning point, evolution, betrayal, ascension, conquest, destruction, calamity, rival battle, romance or first kiss), and at most 3 chapters in an arc got one. These did not count against the reader\'s daily images.' },
      { title: 'Brand palette', text: 'Its style named SEIHouse\'s palette: #000000, #FAFAFA, #8B0000, #04ACFF.' },
    ],
  },
  {
    id: 'old-shared',
    title: 'The old app\'s shared art direction',
    status: 'old-app',
    variations: 1,
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
    variations: 1,
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
  { title: 'Codex evolution, with consistency', text: 'The old Codex unlocked a new image after a breakthrough, a status change, or an artifact changing hands, at the arc\'s end. To keep a character recognizable, each new version should be made from the previous one (as a reference image) plus what changed.' },
];

export const IMAGE_PROMPTS: ImagePrompt[] = IMAGE_KINDS.flatMap(kind => kind.prompts);

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
