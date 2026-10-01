import type { ReadAloudVoicePicks } from '@seihouse/sen/reader-runtime';

/**
 * SEIHouse's narration voices, best first, across Apple, Edge/Windows and
 * Chrome. On Apple devices the Narrator is Daniel and the Protagonist Rishi,
 * the prototype's own picks, with a female Side voice; elsewhere the closest
 * voice the device has. A reader's own choice always wins, and a device
 * without these voices still gets three distinct ones.
 */
export const LIBRARY_READ_ALOUD_VOICES: ReadAloudVoicePicks = {
  en: {
    narrator: ['Daniel', 'Google UK English Male', 'Microsoft Ryan', 'Google US English'],
    protagonist: ['Rishi', 'Microsoft Guy', 'Microsoft David'],
    side: ['Samantha', 'Karen', 'Moira', 'Tessa', 'Serena', 'Google UK English Female', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Zira'],
  },
};
