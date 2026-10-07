import { useState, useEffect } from "react";
import { pickDefaultSideVoice } from "../../lib/voice/webSpeechCast";

export function useVoicePreferences() {
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [speechVolume, setSpeechVolume] = useState<number>(0.9);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>("");
  const [selectedDialogueVoiceURI, setSelectedDialogueVoiceURI] = useState<string>("");
  const [selectedSideVoiceURI, setSelectedSideVoiceURI] = useState<string>("");
  const [showVoiceDetail, setShowVoiceDetail] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          setAvailableVoices(voices);

          // Voice fallbacks
          // We look for Daniel as narrator, Rishi as dialogue. On macOS these are present;
          // platforms without "daniel"/"rishi" the fallback chains land on
          // other voices, and the side voice must not collide with those.
          const narratorDefault =
            voices.find((v) => v.name.toLowerCase().includes("daniel")) ||
            voices.find((v) => v.lang.includes("en-US") && v.name.toLowerCase().includes("google")) ||
            voices.find((v) => v.lang.includes("en-US")) ||
            voices.find((v) => v.lang.includes("en")) ||
            voices.find((v) => v.lang.includes("zh")) ||
            voices[0];
          const dialogueDefault =
            voices.find((v) => v.name.toLowerCase().includes("rishi")) ||
            voices.find((v) => v.voiceURI !== narratorDefault?.voiceURI && v.lang.includes("en")) ||
            voices[0];

          setSelectedVoiceURI((current) => {
            if (current && voices.some((v) => v.voiceURI === current)) {
              return current;
            }
            return narratorDefault?.voiceURI || "";
          });

          setSelectedDialogueVoiceURI((current) => {
            if (current && voices.some((v) => v.voiceURI === current)) {
              return current;
            }
            return dialogueDefault?.voiceURI || "";
          });

          setSelectedSideVoiceURI((current) => {
            if (current && voices.some((v) => v.voiceURI === current)) {
              return current;
            }
            return pickDefaultSideVoice(
              voices,
              narratorDefault?.voiceURI || "",
              dialogueDefault?.voiceURI || ""
            )?.voiceURI || "";
          });
        }
      };

      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }

      return () => {
        if (window.speechSynthesis.onvoiceschanged === loadVoices) {
          window.speechSynthesis.onvoiceschanged = undefined;
        }
      };
    }
  }, []);

  return {
    speechRate,
    setSpeechRate,
    speechPitch,
    setSpeechPitch,
    speechVolume,
    setSpeechVolume,
    availableVoices,
    selectedVoiceURI,
    setSelectedVoiceURI,
    selectedDialogueVoiceURI,
    setSelectedDialogueVoiceURI,
    selectedSideVoiceURI,
    setSelectedSideVoiceURI,
    showVoiceDetail,
    setShowVoiceDetail,
  };
}
