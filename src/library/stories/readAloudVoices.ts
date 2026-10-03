import type { ReadAloudVoicePicks } from '@seihouse/sen/reader-runtime';

/**
 * SEIHouse's narration voices, best first: production's own cast. The Narrator
 * is Daniel, or Chrome's Google US English; the Protagonist is Rishi, or else
 * the device's next voice; the Side voice is a female voice, by the names
 * production looked for. SEN takes a voice on the device before an online one,
 * so on Windows the Protagonist and Side voices are Microsoft David (or Mark)
 * and Zira, as in production. A reader's own choice always wins.
 */
export const LIBRARY_READ_ALOUD_VOICES: ReadAloudVoicePicks = {
  en: {
    narrator: ['Daniel', 'Google US English'],
    protagonist: ['Rishi'],
    side: ['Samantha', 'Zira', 'Victoria', 'Karen', 'Moira', 'Tessa', 'Fiona', 'Serena', 'Allison', 'Ava', 'Susan', 'Kate', 'Female'],
  },
};
