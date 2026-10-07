import { useAtmosphericAudio } from '../hooks/audio/useAtmosphericAudio';

export function AtmosphericAudio() {
  useAtmosphericAudio();

  // Headless rendering to prevent blocking menu options
  return null;
}
