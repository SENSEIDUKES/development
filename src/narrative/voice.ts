/** The synthesized audio for one tap, ready for immediate client-side playback. */
export type CodexVoiceAudio = {
  base64: string;
  mimeType: string;
  source?: never;
} | {
  /** Host-authorized audio URL, object URL or audio data URI. */
  source: string;
  base64?: never;
  mimeType?: never;
};

export interface CodexVoiceResolution {
  characterId: string;
  voiceKey: string;
  audio: CodexVoiceAudio;
}
