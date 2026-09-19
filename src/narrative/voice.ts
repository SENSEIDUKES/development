/** The synthesized audio for one tap, ready for immediate client-side playback. */
export interface CodexVoiceAudio {
  base64: string;
  mimeType: string;
}

export interface CodexVoiceResolution {
  characterId: string;
  voiceKey: string;
  audio: CodexVoiceAudio;
}
