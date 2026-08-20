/**
 * The single text-normalization boundary shared by Reader rendering and
 * persisted inline-audio placement. Hidden generation/audio tags never count
 * toward a World Cue or dialogue occurrence.
 */
export function extractReaderVisibleAudioText(text: string) {
  const sfxList: string[] = [];

  let cleanText = text.replace(
    /\{[^{}]*?"(?:sceneType|intensity|tension|danger|mysticism|emotion|audioSignature|beastEvent|summary|statsChangeMessage|memoryUpdates)"[^{}]*?\}/gi,
    '',
  );

  cleanText = cleanText.replace(/\[\s*\{[\s\S]*?\}\s*\]/g, '');
  cleanText = cleanText.replace(/\[\s*\{[^{}]*?\}\s*\]/g, '');

  const hiddenSystemTagsRegex =
    /\[(?:SFX|Audio|Sound|Beat|Timing|Time|Duration|Trigger|SAP|Audio-Metadata|Metadata|Intensity|Tension|Danger|Mood|Emotion|Narrative):\s*([^\]]+)\]/gi;

  cleanText = cleanText.replace(hiddenSystemTagsRegex, (match, value: string) => {
    if (match.match(/\[(?:SFX|Audio|Sound):\s*/i)) {
      sfxList.push(value.trim().toLowerCase());
    }
    return '';
  });

  cleanText = cleanText.replace(/\[\s*\]/g, '');

  return { cleanText: cleanText.trim(), sfxList };
}
