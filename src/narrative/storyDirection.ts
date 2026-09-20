/**
 * Story-direction domain contract shared by Story Seed and HARNESS.
 *
 * These are stable, presentation-neutral values. Visible labels (for example
 * the current Story Seed "Survival Pressure" option or a future "Synopsis"
 * rename) are never data authority: consumers read these fields, not the
 * interface that happens to display them today.
 */

// ─── Fate Pressure ───────────────────────────────────────────────────────────

/** The canonical storyteller-intensity tiers. Separate from Fate Survival gameplay. */
export const FATE_PRESSURE_TIERS = ['mortal', 'immortal', 'heaven'] as const;
export type FatePressure = (typeof FATE_PRESSURE_TIERS)[number];

export const isFatePressure = (value: unknown): value is FatePressure =>
  typeof value === 'string' && (FATE_PRESSURE_TIERS as readonly string[]).includes(value);

// ─── Chapter function ────────────────────────────────────────────────────────

/** The primary function a completed chapter served, as reported by the writer. */
export const CHAPTER_FUNCTIONS = ['progression', 'worldBuilding', 'conflict'] as const;
export type ChapterFunction = (typeof CHAPTER_FUNCTIONS)[number];

export const isChapterFunction = (value: unknown): value is ChapterFunction =>
  typeof value === 'string' && (CHAPTER_FUNCTIONS as readonly string[]).includes(value);

/** One short next-chapter possibility per function. Gemini supplies possibilities; it never decides. */
export type NextChapterSuggestions = Partial<Record<ChapterFunction, string>>;

// ─── Hard Pins ───────────────────────────────────────────────────────────────

/** A story never holds more than this many user-created Hard Pins. */
export const HARD_PIN_LIMIT = 3 as const;
export const HARD_PIN_TEXT_LIMIT = 280 as const;

/**
 * A user-authored, story-wide intention that must hold for the entire story.
 * There is deliberately no weight, priority, or importance field: every Hard
 * Pin is absolute and only the user creates, edits, reorders, or removes one.
 */
export interface HardPin {
  id: string;
  text: string;
  createdAt: string;
  updatedAt: string;
}

/** What a user submits; identity and timestamps are assigned by the owner. */
export interface HardPinInput {
  id?: string;
  text: string;
}

const HARD_PIN_KEYS: ReadonlySet<string> = new Set(['id', 'text']);

/**
 * Validates an ordered Hard Pin list from the user. Rejects more than
 * `HARD_PIN_LIMIT` entries, empty or multi-line text, duplicate IDs, and any
 * extra field (so a weight can never sneak in through a loose caller).
 */
export const validateHardPinInputs = (value: unknown): HardPinInput[] => {
  if (!Array.isArray(value)) throw new Error('Hard Pins must be an ordered list.');
  if (value.length > HARD_PIN_LIMIT) throw new Error(`A story holds at most ${HARD_PIN_LIMIT} Hard Pins.`);
  const ids = new Set<string>();
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error(`Hard Pin ${index + 1} is not readable.`);
    const record = entry as Record<string, unknown>;
    const extra = Object.keys(record).find(key => !HARD_PIN_KEYS.has(key));
    if (extra) throw new Error(`Hard Pins carry only text; "${extra}" is not a Hard Pin field.`);
    const text = typeof record.text === 'string' ? record.text.trim() : '';
    if (!text) throw new Error(`Hard Pin ${index + 1} needs its intention written out.`);
    if (/[\r\n]/.test(text)) throw new Error(`Hard Pin ${index + 1} must be a single line.`);
    if (text.length > HARD_PIN_TEXT_LIMIT) throw new Error(`Hard Pin ${index + 1} must stay within ${HARD_PIN_TEXT_LIMIT} characters.`);
    if (record.id !== undefined && (typeof record.id !== 'string' || !record.id.trim())) throw new Error(`Hard Pin ${index + 1} has an invalid identity.`);
    if (typeof record.id === 'string') {
      if (ids.has(record.id)) throw new Error('Hard Pin identities must be unique.');
      ids.add(record.id);
    }
    return typeof record.id === 'string' ? { id: record.id, text } : { text };
  });
};

// ─── Recaps ──────────────────────────────────────────────────────────────────

/** A saved "Previously On" recap stays short enough to read at a glance. */
export const CHAPTER_RECAP_TEXT_LIMIT = 1_200 as const;

export interface ChapterRecap {
  text: string;
  /** Written by the chapter model during its own request, or edited by the author afterwards. */
  source: 'model' | 'author';
  updatedAt: string;
}
