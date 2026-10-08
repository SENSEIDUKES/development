import type { ImagePromptId } from './imagePrompts';

export interface ImagePromptsChange {
  /** The day the change was made (YYYY-MM-DD). */
  date: string;
  /** What changed and why, in plain words. */
  summary: string;
  /** Each prompt this change touched, with the fingerprint of its words afterwards. */
  changed: Partial<Record<ImagePromptId, string>>;
}

/**
 * Every change to an image prompt, newest first. A test compares each prompt
 * on the page with its latest entry here, so no change can skip this history.
 */
export const IMAGE_PROMPTS_HISTORY: ImagePromptsChange[] = [
  {
    date: '2026-10-08',
    summary: 'The owner rewrote the profile picture: the reader\'s photo now goes straight to the image model with one prompt, turning them into a donghua-style cultivator that keeps their likeness and skin tone. The old app\'s extra step (a text model reading the photo to write the prompt, so the image model never saw the photo) is removed, with its prompt writer, its request and its no-photo prompt, and so is the portrait evolving with Dao Rank, realm and artifacts.',
    changed: {
      'profile-picture': '1c2f7d57c03bef',
    },
  },
  {
    date: '2026-10-08',
    summary: 'The owner approved a new cover art prompt: professional Eastern fantasy cover art drawing on Chinese webnovel, Japanese light novel or Korean webnovel illustration, led by the story\'s own details, vertical 2:3 and readable at thumbnail size, with no logos, signatures or watermarks. Its {title instruction} is one of two new instructions: with the title, the exact title drawn once in readable lettering and nothing else; without it, no lettering. The prompt the app sends today stays beside it, as "What the app sends today", until the template is connected with World Cards.',
    changed: {
      cover: '07aee0fcffbf50',
      'cover-title-on': '0e13d762ba1769',
      'cover-title-off': '12b68d253252a5',
      'cover-current': '0e2f5b666ea8bc',
    },
  },
  {
    date: '2026-10-08',
    summary: 'The Image Prompts page begins, at the owner\'s request, so every image prompt can be refined in one place. The cover prompt is the app\'s own (Manifest cover, Nano Banana 2 by default). The old app\'s prompts are quoted word for word from SENSEIDUKES/Light-Novels at 647165a: the Divine Mirror profile picture (its prompt writer, its request and its fallback), the Codex character, beast, location and artifact images and the first image from a reveal card, the chapter Visual Memory, its old covers, and the style it added to every image. The Familiar art rules are quoted from the commit before they were removed (27e89a1). The owner\'s idea of the main character across the ages is recorded with the evolution ideas: never built before.',
    changed: {
      cover: '0e2f5b666ea8bc',
      'old-cover': '0d1cef0666bbce',
      'old-cover-sage': '0f43972f542cb2',
      'old-portrait-writer': '06bdf8b4f26ef6',
      'old-portrait-request': '16d50725bb5cd1',
      'old-portrait-fallback': '1c08fb1faf4c0f',
      'old-codex-character': '1b30d9f2e20ff7',
      'old-codex-beast': '0c13b15bdb62a6',
      'old-codex-location': '19fbf83e21e937',
      'old-codex-artifact': '180aa58ffefff8',
      'old-codex-first-manifest': '1139e7439f1998',
      'old-chapter-memory': '046e72b56e7d3d',
      'old-style-wrapper': '007be674b8640a',
      'familiar-style': '1ce89e01d8ec63',
    },
  },
];

/** The latest change to a prompt, if it has one. */
export const lastChange = (id: ImagePromptId) => IMAGE_PROMPTS_HISTORY.find(change => id in change.changed);
