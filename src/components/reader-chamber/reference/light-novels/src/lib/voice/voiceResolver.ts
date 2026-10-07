import {
  KOKORO_VOICE_PRESETS,
  KOKORO_VOICE_PRESET_BY_ID,
  KokoroVoicePreset,
} from './kokoroVoiceRegistry';

export type CharacterProfileShort = {
  name?: string;
  role?: string;
  gender?: "male" | "female";
  age?: "child" | "young" | "middle" | "older";
};

export function resolveKokoroVoicePreset({
  language = "en",
  mode,
  speakerName,
  speakerRole,
  characterProfile,
  savedVoicePresetId,
}: {
  language?: "en" | "es";
  mode: "narration" | "dialogue";
  speakerName?: string;
  speakerRole?: string;
  characterProfile?: CharacterProfileShort;
  savedVoicePresetId?: string;
}): KokoroVoicePreset {
  if (savedVoicePresetId) {
    const savedPreset = KOKORO_VOICE_PRESET_BY_ID[savedVoicePresetId];
    if (savedPreset) {
      return savedPreset;
    }
  }

  if (mode === "narration") {
    if (language === "es") {
      return KOKORO_VOICE_PRESET_BY_ID["es_male_old_1"] || KOKORO_VOICE_PRESETS[0];
    }
    return KOKORO_VOICE_PRESET_BY_ID["en_male_older_narrator_1"] || KOKORO_VOICE_PRESETS[0];
  }

  // mode === "dialogue"
  const isFemale = characterProfile?.gender === "female" || 
    (speakerRole && /(female|mother|sister|girl|woman|heiress|queen|princess)/i.test(speakerRole));
    
  const r = (speakerRole || "").toLowerCase();
  
  if (language === "es") {
    if (isFemale) return KOKORO_VOICE_PRESET_BY_ID["es_female_young_1"];
    else return KOKORO_VOICE_PRESET_BY_ID["es_male_young_1"];
  }

  // Known role mappings from requirements
  if (r.includes("villain") || r.includes("overseer") || r.includes("cruel authority")) {
    if (!isFemale) return KOKORO_VOICE_PRESET_BY_ID["en_male_middle_villain_1"];
  }
  
  if (r === "main_character" || r.includes("main male") || r.includes("hero")) {
    if (!isFemale) return KOKORO_VOICE_PRESET_BY_ID["en_male_young_mc_1"];
  }
  
  if (r.includes("main female") || r.includes("romance") || r.includes("female lead")) {
    return KOKORO_VOICE_PRESET_BY_ID["en_female_young_romance_1"];
  }
  
  if (r.includes("face-slap") || r.includes("face_slap") || r.includes("arrogant")) {
    if (isFemale) {
      if (characterProfile?.age === "older" || r.includes("matriarch") || r.includes("queen")) {
         return KOKORO_VOICE_PRESET_BY_ID["en_female_older_evilqueen_1"];
      }
      return KOKORO_VOICE_PRESET_BY_ID["en_female_young_faceslap_1"];
    } else {
      // Rotate between am_adam and am_echo based on hash of name
      const nameHash = (speakerName || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return nameHash % 2 === 0
        ? KOKORO_VOICE_PRESET_BY_ID["en_male_young_faceslap_1"]
        : KOKORO_VOICE_PRESET_BY_ID["en_male_young_faceslap_2"];
    }
  }

  if (r.includes("sect leader") || r.includes("clan head") || r.includes("father") || characterProfile?.age === "older") {
    if (!isFemale) return KOKORO_VOICE_PRESET_BY_ID["en_male_older_authority_1"];
  }

  // Fallbacks
  if (isFemale) {
    if (characterProfile?.age === "middle" || r.includes("teacher") || r.includes("mother")) return KOKORO_VOICE_PRESET_BY_ID["en_female_middle_teacher_1"];
    return KOKORO_VOICE_PRESET_BY_ID["en_female_young_friend_1"];
  } else {
    if (characterProfile?.age === "middle" || r.includes("mentor") || r.includes("teacher")) return KOKORO_VOICE_PRESET_BY_ID["en_male_middle_mentor_2"];
    if (characterProfile?.age === "older") return KOKORO_VOICE_PRESET_BY_ID["en_male_older_authority_1"];
    if (!r) return KOKORO_VOICE_PRESET_BY_ID["en_male_young_friend_1"]; // unknown young male fallback
    return KOKORO_VOICE_PRESET_BY_ID["en_male_young_friend_1"];
  }
}
