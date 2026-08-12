import { generateId } from '../shared/id';
import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  Play,
} from "lucide-react";
import {
  ReaderChapter,
  StoryWorld,
  UpdateStoryFields,
  ReaderPreferences,
  Bookmark,
} from "../shared/types";
import { motion, AnimatePresence } from "motion/react";
import { ParticleSystem } from "./ParticleSystem";
import { useChapterTranslation } from "../shared/stubs";
import { useAppStore } from "../shared/stubs";
import { selectIsGenerating } from "../shared/stubs";
import { LOCAL_ONLY_MODE } from "../shared/stubs";
import { AlterFatePanel } from "./AlterFatePanel";
import { ReaderPreferencesPanel } from "./ReaderPreferencesPanel";
import { CosmicBookmarksPanel } from "./CosmicBookmarksPanel";
import { useReaderPlayback, extractSFXCues } from "../shared/readerPlayback";
import { useReaderVisuals } from "../shared/stubs";

import { ReaderHeader } from "./ReaderHeader";
import { ReaderViewport } from "./ReaderViewport";
import { ReaderControls } from "./ReaderControls";
import { useCinematicScroll } from "../shared/stubs";
import { cinematicEffectGovernor } from "../shared/effects/cinematicEffectGovernor";
import { useReadingPosition } from "../shared/stubs";
import { getFateLockMessage } from '../shared/alterFateLock';
import { DEFAULT_READER_TYPOGRAPHY } from '../shared/readerTypography';
import { SYSTEM_LEGEND_DISMISSED_STORAGE_KEY } from '../shared/readerLegend';
import { CodexHovercard } from '../../reader-codex/shared/CodexHovercard';
import {
  createCodexHighlighter,
  splitByCodexTerms,
} from '../../reader-codex/shared/codexHighlighting';

interface ReaderChamberProps {
  chapters: ReaderChapter[];
  currentPowerStage: string;
  onGenerateChapter: (chapterNumber: number) => Promise<void>;
  onGenerateNextFiveChapters: (fromChapterNumber: number) => Promise<void>;
  isGenerating: boolean;
  selectedChapterNum: number;
  setSelectedChapterNum: (num: number) => void;
  onToggleRead: (chapterNumber: number) => void;
  arcTitle: string;
  onSwitchTab?: (tab: "reader" | "codex" | "memory") => void;
  activeStory: StoryWorld;
  updateStoryFields: UpdateStoryFields;
  handleAlterFate?: (
    chapterNumber: number,
    direction: string,
    customPrompt: string,
  ) => Promise<void>;
  handleSealChapter?: (chapterNumber: number) => Promise<void>;
  handleCheckConsistency?: (chapterNumber: number) => Promise<string[]>;
}

export default function ReaderChamber({
  chapters,
  currentPowerStage,
  onGenerateChapter,
  onGenerateNextFiveChapters,
  isGenerating,
  selectedChapterNum,
  setSelectedChapterNum,
  onToggleRead,
  arcTitle,
  onSwitchTab,
  activeStory,
  updateStoryFields,
  handleAlterFate,
  handleSealChapter,
  handleCheckConsistency,
}: ReaderChamberProps) {
  const selectedChapter =
    chapters.find((c) => c.number === selectedChapterNum) || chapters[0];

  const [showLegend, setShowLegend] = useState(() => {
    return localStorage.getItem(SYSTEM_LEGEND_DISMISSED_STORAGE_KEY) !== "true";
  });

  const hasSystemBlocks = useMemo(() => {
    if (selectedChapter.blocks && selectedChapter.blocks.length > 0) {
      return selectedChapter.blocks.some(
        (b) => !!b.system || (b.text && b.text.trim().startsWith("[") && b.text.trim().endsWith("]"))
      );
    }
    if (selectedChapter.generatedContent) {
      const paragraphs = selectedChapter.generatedContent.split("\n\n");
      return paragraphs.some(
        (p) => p.trim().startsWith("[") && p.trim().endsWith("]")
      );
    }
    return false;
  }, [selectedChapter.blocks, selectedChapter.generatedContent]);

  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");
  // WORKSHOP: dropped unused production selectors (stories, activeStoryId,
  // saveStories, routingConfig) — nothing in the chamber reads them.

  const [isAlterFateOpen, setIsAlterFateOpen] = useState(false);
  const [showFateCodex, setShowFateCodex] = useState(false);
  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);
  const [consistencyWarnings, setConsistencyWarnings] = useState<string[] | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const readerMode = useAppStore((state) => state.readerMode);
  const immersion = useAppStore((state) => state.immersion);
  const setReaderMode = useAppStore((state) => state.setReaderMode);
  const setImmersion = useAppStore((state) => state.setImmersion);

  const { 
    handleManifestReveal, 
    generatingRevealId, 
    codexTerms,
    manifestChapterHero,
    generatingIds,
    isMomentousChapter,
    triggerHeroGeneration
  } = useReaderVisuals({
    selectedChapter,
    activeStory,
    readerMode });

  const codexHighlighter = useMemo(
    () => createCodexHighlighter(
      (codexTerms ?? []).filter(term => (
        typeof term?.term === 'string' && term.term.trim() !== ''
      )),
    ),
    [codexTerms],
  );
  const highlightRegex = codexHighlighter.regex;


  // --- Translation States ---
  const maxChapterNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.number)) : 0;
  const { translateChapter, isTranslating, translationError } =
    useChapterTranslation();
  const userProfile = useAppStore((state) => state.userProfile);

  const getLocaleFromLanguageName = (lang: string | undefined): string => {
    if (!lang) return "en";
    const normalized = lang.toLowerCase();
    if (normalized.includes("spanish")) return "es";
    if (normalized.includes("simplified chinese") || normalized.includes("简体中文") || normalized.includes("chinese") && !normalized.includes("traditional")) return "zh-CN";
    if (normalized.includes("traditional chinese") || normalized.includes("繁體中文")) return "zh-TW";
    if (normalized.includes("japanese") || normalized.includes("日本語")) return "ja";
    if (normalized.includes("french")) return "fr";
    if (normalized.includes("portuguese")) return "pt-BR";
    if (normalized.includes("german")) return "de";
    if (normalized.includes("italian")) return "it";
    if (normalized.includes("korean") || normalized.includes("한국어")) return "ko";
    if (normalized.includes("russian")) return "ru";
    if (normalized.includes("vietnamese") || normalized.includes("tiếng việt")) return "vi";
    if (normalized.includes("indonesian") || normalized.includes("bahasa indonesia")) return "id";
    if (normalized.includes("thai") || normalized.includes("ภาษาไทย")) return "th";
    if (normalized.includes("tagalog") || normalized.includes("filipino")) return "tl";
    if (normalized.includes("malay") || normalized.includes("bahasa melayu")) return "ms";
    if (normalized.includes("arabic")) return "ar";
    if (normalized.includes("hindi")) return "hi";
    return "en";
  };

  const [preferredLang, setPreferredLang] = useState(() => {
    return getLocaleFromLanguageName(userProfile?.defaultTranslationLanguage || userProfile?.preferredLanguage);
  });

  useEffect(() => {
    const langCode = getLocaleFromLanguageName(userProfile?.defaultTranslationLanguage || userProfile?.preferredLanguage);
    setPreferredLang(langCode);
  }, [userProfile?.defaultTranslationLanguage, userProfile?.preferredLanguage]);

  const [activeTranslationContent, setActiveTranslationContent] = useState<
    string | null
  >(null);

  const {
    isPlayingText,
    isPausedText,
    speechRate,
    speechPitch,
    speechVolume,
    availableVoices,
    selectedVoiceURI,
    selectedDialogueVoiceURI,
    selectedSideVoiceURI,
    activeChunks,
    currentChunkIndex,
    setSpeechRate,
    setSpeechPitch,
    setSpeechVolume,
    setSelectedVoiceURI,
    setSelectedDialogueVoiceURI,
    setSelectedSideVoiceURI,
    handleTogglePlayback,
    handleStopSpeaking,
    currentNarratedBlockIndex
  } = useReaderPlayback({
    selectedChapter,
    activeTranslationContent,
  });

  // The single cinematic scroll controller. It listens to narration events,
  // runs the user-intent state machine, and drives the document scroll
  // surface with a spring following the narration timeline. Manual input
  // yields permanently; only the explicit Resume Reading action (resume)
  // restores automated movement.
  const {
    state: cinematicScrollState,
    resume: resumeAutoScroll,
    intervene: interveneAutoScroll,
  } = useCinematicScroll(readerRef);

  // Semantic reading-position persistence: saves the paragraph nearest the
  // focus line on debounced document scrolling and restores it after render
  // (with a one-time migration of legacy raw pixel offsets).
  useReadingPosition({
    contentRef: readerRef,
    activeStory,
    selectedChapterNum,
    updateStoryFields,
    hasRenderableContent: !!(
      selectedChapter.generatedContent ||
      (selectedChapter.blocks && selectedChapter.blocks.length > 0)
    ),
  });

  const setCanShowRelicInReader = useAppStore(state => state.setCanShowRelicInReader);

  useEffect(() => {
    // Narration always wins over scroll position, and a chapter change resets the gate.
    setCanShowRelicInReader?.(!isPlayingText);
    return () => {
      setCanShowRelicInReader?.(true);
    };
  }, [selectedChapterNum, isPlayingText, setCanShowRelicInReader]);

  useEffect(() => {
    const el = readerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const currentAllowed = useAppStore.getState().canShowRelicInReader;
      let nextAllowed = true;

      if (isPlayingText) {
        nextAllowed = false;
      } else if (scrollTop + clientHeight >= scrollHeight - 150) {
        // Reached end of chapter
        nextAllowed = true;
      } else if (scrollTop > 200) {
        // Actively reading middle prose
        nextAllowed = false;
      }

      if (currentAllowed !== nextAllowed) {
        setCanShowRelicInReader?.(nextAllowed);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, [selectedChapterNum, isPlayingText, setCanShowRelicInReader]);

  // --- atmospheric audio (just reference, no actual addition needed here)
  const isReaderFullscreen = useAppStore((state) => state.isReaderFullscreen);
  const setIsReaderFullscreen = useAppStore(
    (state) => state.setIsReaderFullscreen,
  );
  const activeAgentId = useAppStore((state) => state.activeAgentId);

  useEffect(() => {
    if (preferredLang === "en") {
      setActiveTranslationContent(null);
      return;
    }

    const doTranslation = async () => {
      let textToTranslate = selectedChapter.generatedContent || "";
      if (!textToTranslate && selectedChapter.blocks) {
        textToTranslate = selectedChapter.blocks.map(b => b.text).join('\n\n');
      }
      if (!textToTranslate) return;
      
      if (selectedChapter.translations?.[preferredLang]) {
        setActiveTranslationContent(
          selectedChapter.translations[preferredLang].content,
        );
        return;
      }
      const result = await translateChapter(
        activeStory.id,
        selectedChapter.number,
        textToTranslate,
        preferredLang,
      );
      if (result) {
        setActiveTranslationContent(result);
      }
    };
    doTranslation();
  }, [
    preferredLang,
    selectedChapter.number,
    selectedChapter.generatedContent,
    selectedChapter.blocks,
    selectedChapter.translations,
    activeStory.id,
    translateChapter
  ]);

  // --- Theme & Reader Typography Customizer States ---
  const [showReaderPreferences, setShowReaderPreferences] = useState(false);

  const defaultPrefs: ReaderPreferences = {
    fontSize: "lg",
    fontFamily: "serif",
    lineHeight: "relaxed",
    paragraphSpacing: "normal",
    themeOverride: "void",
    ...DEFAULT_READER_TYPOGRAPHY,
  };

  const currentPrefs = { ...defaultPrefs, ...activeStory.readerPreferences };
  
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-palette', currentPrefs.colorPaletteId || 'default');
    
    return () => {
      root.removeAttribute('data-palette');
    };
  }, [currentPrefs.colorPaletteId]);

  const handleUpdatePreference = <K extends keyof ReaderPreferences>(
    key: K,
    value: ReaderPreferences[K],
  ) => {
    void updateStoryFields(activeStory.id, (current) => ({
      readerPreferences: {
        ...defaultPrefs,
        ...current.readerPreferences,
        [key]: value,
      },
    }));
  };

  const handleResetTypography = () => {
    void updateStoryFields(activeStory.id, (current) => ({
      readerPreferences: {
        ...defaultPrefs,
        ...current.readerPreferences,
        lineHeight: defaultPrefs.lineHeight,
        paragraphSpacing: defaultPrefs.paragraphSpacing,
        ...DEFAULT_READER_TYPOGRAPHY,
      },
    }));
  };

  const isDeathOrCriticalHealthScene = useMemo(() => {
    const textToMatch = `${selectedChapter.title || ""} ${selectedChapter.summary || ""}`.toLowerCase();
    const deathKeywords = [
      "death", "die", "dying", "killed", "fatal", "perish", 
      "critical health", "near-death", "near death", "slain", "demise", 
      "sacrificed", "mortal wound", "critical damage", "heart stops", 
      "breathes last", "breath last"
    ];
    const hasKeyword = deathKeywords.some(keyword => textToMatch.includes(keyword));

    const hasDeathOrCriticalBlock = selectedChapter.blocks?.some(b => {
      const blockText = (b.text || "").toLowerCase();
      const systemTitle = (b.system?.title || "").toLowerCase();
      const systemKind = (b.system?.kind || "").toLowerCase();
      
      return blockText.includes("death flag") || 
             blockText.includes("critical health") ||
             blockText.includes("near death") ||
             systemTitle.includes("death flag") ||
             systemTitle.includes("critical health") ||
             systemKind.includes("death flag") ||
             systemKind.includes("critical health") ||
             b.system?.promptType === "corruption";
    });

    const cue = selectedChapter.cuePayload;
    // WORKSHOP: `?? 0` added — the Workshop tsconfig enforces strict null
    // checks on the optional cuePayload.danger field.
    const isCriticalDangerCue = cue && (
      (cue.danger ?? 0) >= 9.5 ||
      ((cue.danger ?? 0) >= 8 && (cue.emotion === "sorrow" || cue.emotion === "grief" || cue.emotion === "fear"))
    );

    return hasKeyword || hasDeathOrCriticalBlock || isCriticalDangerCue || false;
  }, [selectedChapter.title, selectedChapter.summary, selectedChapter.blocks, selectedChapter.cuePayload]);

  const getDynamicShadingClasses = () => {
    if (isDeathOrCriticalHealthScene) {
      return "shadow-[inset_0_0_180px_rgba(139,0,0,0.35)] ring-1 ring-red-900/50 animate-[pulse_3.5s_ease-in-out_infinite]";
    }
    return "";
  };

  const getThemeClasses = () => {
    const t = currentPrefs.themeOverride || "void";
    const baseClasses = (() => {
      if (t === "crimson")
        return "bg-[#0f0404] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0a0a] to-[#0a0202] text-[#e0cfcf] border-t border-[#8B0000]/30 selection:bg-[#8B0000]/40 selection:text-white";
      if (t === "abyss")
        return "bg-[#05080f] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1222] to-[#020408] text-[#ccd4e0] border-t border-[#04ACFF]/20 selection:bg-[#04ACFF]/40 selection:text-white";
      if (t === "sepia")
        return "bg-[#1a1614] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2a2420] to-[#14100e] text-[#d6c5b3] border-t border-[#8b5a2b]/30 selection:bg-[#8b5a2b]/40 selection:text-white";
      if (t === "emerald")
        return "bg-[#050f0a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1c12] to-[#020805] text-[#b9d6c1] border-t border-[#0f5132]/40 selection:bg-[#0f5132]/40 selection:text-white";
      return "bg-[#0a0a0a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#141414] to-[#050505] text-[#e8e8e8] border-t border-neutral-800/60 selection:bg-neutral-700 selection:text-white"; // default void style
    })();
    
    const dynamicShading = getDynamicShadingClasses();
    if (dynamicShading) {
      return `${baseClasses} ${dynamicShading}`;
    }
    
    // Add default static shadow if no dynamic shading
    if (t === "crimson") return `${baseClasses} shadow-[inset_0_0_120px_rgba(139,0,0,0.08)] ring-1 ring-[#8B0000]/10`;
    if (t === "abyss") return `${baseClasses} shadow-[inset_0_0_120px_rgba(4,172,255,0.06)] ring-1 ring-[#04ACFF]/10`;
    if (t === "sepia") return `${baseClasses} shadow-[inset_0_0_120px_rgba(139,90,43,0.08)] ring-1 ring-[#8b5a2b]/10`;
    if (t === "emerald") return `${baseClasses} shadow-[inset_0_0_120px_rgba(15,81,50,0.1)] ring-1 ring-[#0f5132]/20`;
    return `${baseClasses} shadow-[inset_0_0_120px_rgba(255,255,255,0.02)] ring-1 ring-white/5`;
  };

  // --- Rendering UI States ---
  const [showImmersionPopover, setShowImmersionPopover] = useState<boolean>(false);
  const [showVoiceDetail, setShowVoiceDetail] = useState<boolean>(false);

  // --- Climax Screen Shake State ---
  const [isShaking, setIsShaking] = useState(false);

  // The governor lazily resets when it sees a new chapter number, but chapter
  // numbers collide across stories — reset explicitly on chapter/story change
  // and clear the anchor when the chamber unmounts so no stale budget leaks
  // into the next reader session.
  useEffect(() => {
    cinematicEffectGovernor.resetChapter(selectedChapterNum);
    return () => {
      cinematicEffectGovernor.resetChapter(null);
    };
  }, [selectedChapterNum, activeStory.id]);

  useEffect(() => {
    const handleCue = (e: any) => {
      const cue = e.detail;
      if (cue.type === 'narrative.metadata.signature') {
        // Metadata cues now also flow for scene music alone; the shake is
        // a visual effect and stays tied to the Holographic Visions toggle.
        if (!useAppStore.getState().immersion.imagePopups) return;
        const meta = cue.metadata || cue.value;
        if (meta) {
          const isIntense =
            (meta.danger && meta.danger >= 0.8 && meta.intensity && meta.intensity >= 0.8) ||
            (meta.powerShift && meta.powerShift >= 0.8) ||
            (meta.tension && meta.tension >= 0.8) ||
            (meta.beastEvent?.profile?.threatTier === 'boss');

          const isIntenseScale10 =
            (meta.danger && meta.danger >= 8 && meta.intensity && meta.intensity >= 8) ||
            (meta.powerShift && meta.powerShift >= 8) ||
            (meta.tension && meta.tension >= 8);

          if (isIntense || isIntenseScale10) {
            // The effect governor only grants the shake in cinematic modes
            // (TTS/listen or automated cinematic scroll) and at most once per
            // chapter. Manual reading never shakes the chamber.
            if (cinematicEffectGovernor.requestCameraShake(selectedChapterNum)) {
              setIsShaking(true);
              setTimeout(() => {
                setIsShaking(false);
              }, 600);
            }
          }
        }
      }
    };
    
    window.addEventListener('narrative-cue', handleCue);
    return () => window.removeEventListener('narrative-cue', handleCue);
  }, [selectedChapterNum]);

  // --- Cosmic Bookmarking System States & Handlers ---
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [editingBookmarkParagraphIndex, setEditingBookmarkParagraphIndex] =
    useState<number | null>(null);
  const [bookmarkNoteText, setBookmarkNoteText] = useState("");
  const [pendingScrollToParagraph, setPendingScrollToParagraph] = useState<
    number | null
  >(null);

  const renderHighlightedText = React.useCallback((text: string, paragraphIndex: number) => {
    const isPlaying = isPlayingText || isPausedText;
    let ttsHighlight = "";

    if (isPlaying) {
      const currentChunk = activeChunks[currentChunkIndex];
      if (currentChunk && currentChunk.paragraphIndex === paragraphIndex) {
        ttsHighlight = currentChunk.text;
      }
    }

    if (!highlightRegex || codexTerms.length === 0) {
      if (!ttsHighlight || !text.includes(ttsHighlight)) return <>{text}</>;
      const parts = text.split(ttsHighlight);
      return (
        <>
          {parts.map((part, i) => (
            <React.Fragment key={i}>
              {part}
              {i < parts.length - 1 && (
                <span className="bg-portal/20 text-portal font-medium rounded-sm px-1 py-0.5 transition-all duration-300 shadow-[0_0_8px_rgba(4,172,255,0.15)]">
                  {ttsHighlight}
                </span>
              )}
            </React.Fragment>
          ))}
        </>
      );
    }

    if (ttsHighlight && text.includes(ttsHighlight)) {
      const parts = text.split(ttsHighlight);
      return (
        <>
          {parts.map((part, i) => (
            <React.Fragment key={i}>
              {part}
              {i < parts.length - 1 && (
                <span className="bg-portal/20 text-portal font-medium rounded-sm px-1 py-0.5 transition-all duration-300 shadow-[0_0_8px_rgba(4,172,255,0.15)]">
                  {ttsHighlight}
                </span>
              )}
            </React.Fragment>
          ))}
        </>
      );
    }

    const segments = splitByCodexTerms(text, codexHighlighter);
    if (segments.length === 1) return <>{text}</>;

    return (
      <>
        {segments.map((segment, index) => (
          segment.match ? (
            <CodexHovercard
              key={index}
              term={segment.text}
              type={segment.match.type}
              entry={segment.match.entry}
            >
              {segment.text}
            </CodexHovercard>
          ) : (
            <React.Fragment key={index}>{segment.text}</React.Fragment>
          )
        ))}
      </>
    );
  }, [activeChunks, codexHighlighter, codexTerms.length, currentChunkIndex, highlightRegex, isPausedText, isPlayingText]);


  // --- Swipe Navigation States ---
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [touchEndY, setTouchEndY] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchEndY(null);
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
    setTouchEndY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchStartY) return;
    const currentEndX = touchEndX !== null ? touchEndX : touchStartX;
    const currentEndY = touchEndY !== null ? touchEndY : touchStartY;

    const distanceX = touchStartX - currentEndX;
    const distanceY = touchStartY - currentEndY;
    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;

    // Trigger horizontal swipe only if distanceX is significantly larger than distanceY
    // This prevents accidental chapter navigation while scrolling down
    if (
      Math.abs(distanceX) > Math.abs(distanceY) * 2 &&
      Math.abs(distanceX) > minSwipeDistance
    ) {
      if (isLeftSwipe) {
        if (selectedChapterNum < maxChapterNum) navigateNext();
      } else if (isRightSwipe) {
        if (selectedChapterNum > 1) navigatePrev();
      }
    }
  };

  const handleTextClick = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button, select, input, a")) return;
    if (window.getSelection()?.toString().length) return; // Prevent toggle when user is just selecting text
    setIsReaderFullscreen(!isReaderFullscreen);
  };

  // Scroll to paragraph effect
  useEffect(() => {
    if (
      pendingScrollToParagraph !== null &&
      (selectedChapter.generatedContent || selectedChapter.blocks)
    ) {
      const timer = setTimeout(() => {
        const element = document.getElementById(
          `para-${pendingScrollToParagraph}`,
        );
        if (element) {
          // Programmatic scrollIntoView does NOT fire wheel/touchstart events,
          // so explicitly yield the cinematic scroll controller.
          interveneAutoScroll();
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.classList.add(
            "bg-portal/10",
            "border-l-2",
            "border-portal",
            "p-2",
            "rounded",
          );
          setTimeout(() => {
            element.classList.remove(
              "bg-portal/10",
              "border-l-2",
              "border-portal",
              "p-2",
              "rounded",
            );
          }, 3000);
        }
        setPendingScrollToParagraph(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [
    pendingScrollToParagraph,
    selectedChapterNum,
    selectedChapter.generatedContent,
    selectedChapter.blocks,
    interveneAutoScroll,
  ]);

  const handleSealClick = async () => {
    if (!handleSealChapter) return;
    if (!handleCheckConsistency) {
      handleSealChapter(selectedChapter.number);
      return;
    }
    setIsCheckingConsistency(true);
    setConsistencyWarnings(null);
    try {
      const warnings = await handleCheckConsistency(selectedChapter.number);
      if (warnings.length > 0) {
        setConsistencyWarnings(warnings);
      } else {
        await handleSealChapter(selectedChapter.number);
      }
    } catch (e) {
      await handleSealChapter(selectedChapter.number);
    } finally {
      setIsCheckingConsistency(false);
    }
  };

  const activeBookmarks = activeStory.bookmarks || [];

  const handleSaveBookmark = (
    paraIdx: number,
    excerpt: string,
    noteText: string,
  ) => {
    const bookmark: Bookmark = {
      id: generateId(7),
      chapterNumber: selectedChapter.number,
      paragraphIndex: paraIdx,
      paragraphExcerpt: excerpt.substring(0, 150),
      note: noteText,
      createdAt: new Date().toISOString(),
    };
    void updateStoryFields(activeStory.id, (current) => {
      const bookmarks = Array.isArray(current.bookmarks) ? current.bookmarks : [];
      const hasExistingBookmark = bookmarks.some((candidate) => (
        candidate.chapterNumber === bookmark.chapterNumber
        && candidate.paragraphIndex === bookmark.paragraphIndex
      ));
      return {
        bookmarks: hasExistingBookmark
          ? bookmarks.map((candidate) => (
            candidate.chapterNumber === bookmark.chapterNumber
            && candidate.paragraphIndex === bookmark.paragraphIndex
              ? { ...candidate, note: noteText }
              : candidate
          ))
          : [...bookmarks, bookmark],
      };
    });
    setEditingBookmarkParagraphIndex(null);
    setBookmarkNoteText("");
  };

  const handleRemoveBookmark = (chapterNum: number, paraIdx: number) => {
    void updateStoryFields(activeStory.id, (current) => ({
      bookmarks: (Array.isArray(current.bookmarks) ? current.bookmarks : []).filter(
        (bookmark) => !(bookmark.chapterNumber === chapterNum && bookmark.paragraphIndex === paraIdx),
      ),
    }));
  };

  const handleJumpToBookmark = (b: Bookmark) => {
    setSelectedChapterNum(b.chapterNumber);
    setPendingScrollToParagraph(b.paragraphIndex);
    setShowBookmarksPanel(false);
  };

  const handleGenerate = () => {
    if (isGenerating || selectIsGenerating(useAppStore.getState())) return;
    const { currentUser } = useAppStore.getState();
    if (!currentUser && !LOCAL_ONLY_MODE) {
      alert("You must sync your spirit (sign in) to forge new chapters.");
      return;
    }
    onGenerateChapter(selectedChapter.number);
  };

  const handleGenerateNextFive = () => {
    if (isGenerating || selectIsGenerating(useAppStore.getState())) return;
    const { currentUser } = useAppStore.getState();
    if (!currentUser && !LOCAL_ONLY_MODE) {
      alert("You must sync your spirit (sign in) to forge new chapters.");
      return;
    }
    onGenerateNextFiveChapters(selectedChapter.number);
  };

  const alterFateLockMessage = getFateLockMessage(activeStory, selectedChapterNum);

  const handleExportText = () => {
    let textToExport = selectedChapter.generatedContent || "";
    if (!textToExport && selectedChapter.blocks) {
      textToExport = selectedChapter.blocks.map(b => b.text).join('\n\n');
    }
    if (!textToExport) return;

    // Clean each paragraph separately to remove metadata and keep prose pure
    const paragraphs = textToExport.split("\n\n");
    const cleanedParagraphs = paragraphs
      .map((p) => extractSFXCues(p).cleanText)
      .filter((p) => !!p); // Filter out lines that were purely metadata

    const cleanedContent = cleanedParagraphs.join("\n\n");

    const blob = new Blob(
      [
        `Chapter ${selectedChapter.number}: ${selectedChapter.title}\n`,
        `========================\n`,
        `Summary: ${selectedChapter.summary || "None"}\n`,
        `System Alerts: ${selectedChapter.statsChangeMessage || "None"}\n\n`,
        cleanedContent,
      ],
      { type: "text/plain;charset=utf-8" },
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Chapter_${selectedChapter.number}_${selectedChapter.title.replace(/\s+/g, "_")}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const navigatePrev = () => {
    if (selectedChapterNum > 1) {
      setSelectedChapterNum(selectedChapterNum - 1);
      // Programmatic scroll — does not fire wheel events, so explicitly yield.
      interveneAutoScroll();
      readerRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const navigateNext = () => {
    const nextChapter = chapters.find(
      (c) => c.number === selectedChapterNum + 1,
    );
    if (nextChapter) {
      setSelectedChapterNum(selectedChapterNum + 1);
      // Programmatic scroll — does not fire wheel events, so explicitly yield.
      interveneAutoScroll();
      readerRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const filteredChapters = chapters.filter((c) => {
    const isUnlocked =
      !!c.generatedContent ||
      !!c.hasContent ||
      (c.blocks && c.blocks.length > 0);
    if (filter === "unlocked") return isUnlocked;
    if (filter === "locked") return !isUnlocked;
    return true;
  });

  const getParticleColor = () => {
    const t = currentPrefs.themeOverride || "void";
    if (t === "crimson") return "bg-[#ff4444]";
    if (t === "abyss") return "bg-[#04ACFF]";
    if (t === "sepia") return "bg-[#d2a679]";
    if (t === "emerald") return "bg-[#10b981]";
    return "bg-[#d4af37]"; // default gold for void
  };

  const getHeaderThemeClasses = () => {
    const t = currentPrefs.themeOverride || "void";
    if (t === "crimson") return "bg-[#1a0808]/80 border-[#8B0000]/30";
    if (t === "abyss") return "bg-[#0a1222]/80 border-[#04ACFF]/20";
    if (t === "sepia") return "bg-[#2a2420]/80 border-[#8b5a2b]/30";
    if (t === "emerald") return "bg-[#0a1c12]/80 border-[#0f5132]/30";
    return "bg-[#111111]/80 border-neutral-800/60";
  };

  const isUserPlaying = isPlayingText || isPausedText;
  const getFocusClass = (paraIdx: number) => {
    if (!isUserPlaying || readerMode !== "sen") return "";
    return currentNarratedBlockIndex === paraIdx
      ? "reading-focus-active"
      : "reading-focus-dimmed";
  };

  const getParticleCount = () => {
    switch (currentPrefs.particleIntensity) {
      case 'off': return 0;
      case 'low': return 15;
      case 'high': return 80;
      default: return 40; // 'default' or undefined
    }
  };
  const particleCount = getParticleCount();

  return (
    <div
      className={`flex flex-col min-h-[85dvh] rounded-t-xl transition-colors duration-500 relative overflow-hidden ${getThemeClasses()} ${isShaking ? "animate-screen-shake" : ""}`}
      id="reader-chamber-root"
    >
      {particleCount > 0 && (
        <ParticleSystem
          count={particleCount}
          className="opacity-20 pointer-events-none mix-blend-screen z-0 transition-colors duration-500"
          color={getParticleColor()}
        />
      )}

      {/* HEADER: Readability & Chapter Title */}
      {!isReaderFullscreen && (
        <ReaderHeader
          arcTitle={arcTitle}
          selectedChapter={selectedChapter}
          chapters={chapters}
          selectedChapterNum={selectedChapterNum}
          setSelectedChapterNum={setSelectedChapterNum}
          onToggleRead={onToggleRead}
          showReaderPreferences={showReaderPreferences}
          setShowReaderPreferences={setShowReaderPreferences}
          showBookmarksPanel={showBookmarksPanel}
          setShowBookmarksPanel={setShowBookmarksPanel}
          activeBookmarks={activeBookmarks}
          getHeaderThemeClasses={getHeaderThemeClasses}
        />
      )}

      {/* Dynamic Collapsible Reader Preferences Panel */}
      <AnimatePresence>
        {showReaderPreferences && (
          <ReaderPreferencesPanel 
            currentPrefs={currentPrefs}
            handleUpdatePreference={handleUpdatePreference}
            onResetTypography={handleResetTypography}
            showLegend={showLegend}
            onToggleLegend={() => {
              const nextState = !showLegend;
              setShowLegend(nextState);
              if (!nextState) {
                localStorage.setItem(SYSTEM_LEGEND_DISMISSED_STORAGE_KEY, "true");
              } else {
                localStorage.removeItem(SYSTEM_LEGEND_DISMISSED_STORAGE_KEY);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* READING VIEWPORT */}
      <ReaderViewport
        readerRef={readerRef as any}
        isReaderFullscreen={isReaderFullscreen}
        handleTouchStart={handleTouchStart}
        handleTouchMove={handleTouchMove}
        handleTouchEnd={handleTouchEnd}
        handleTextClick={handleTextClick}

        isTranslating={isTranslating}
        preferredLang={preferredLang}
        selectedChapter={selectedChapter}
        activeStory={activeStory}
        currentPowerStage={currentPowerStage}
        selectedChapterNum={selectedChapterNum}
        maxChapterNum={maxChapterNum}
        
        codexTerms={codexTerms}
        generatingRevealId={generatingRevealId}
        handleManifestReveal={handleManifestReveal}
        manifestChapterHero={manifestChapterHero}
        generatingIds={generatingIds}
        isMomentousChapter={isMomentousChapter}
        triggerHeroGeneration={triggerHeroGeneration}
        
        readerMode={readerMode}
        immersion={immersion}
        isPlayingText={isPlayingText}
        isPausedText={isPausedText}
        currentNarratedBlockIndex={currentNarratedBlockIndex}
        
        currentPrefs={currentPrefs}
        handleUpdatePreference={handleUpdatePreference as unknown as (key: string, value: any) => void}
        activeBookmarks={activeBookmarks}
        editingBookmarkParagraphIndex={editingBookmarkParagraphIndex}
        setEditingBookmarkParagraphIndex={setEditingBookmarkParagraphIndex}
        bookmarkNoteText={bookmarkNoteText}
        setBookmarkNoteText={setBookmarkNoteText}
        handleRemoveBookmark={handleRemoveBookmark}
        handleSaveBookmark={handleSaveBookmark}
        
        activeTranslationContent={activeTranslationContent}
        renderHighlightedText={renderHighlightedText}
        getFocusClass={getFocusClass}
        
        navigatePrev={navigatePrev}
        navigateNext={navigateNext}
        
        handleSealChapter={handleSealChapter}
        handleSealClick={handleSealClick}
        isCheckingConsistency={isCheckingConsistency}
        
        isGenerating={isGenerating}
        handleGenerate={handleGenerate}
        handleGenerateNextFive={handleGenerateNextFive}
        activeAgentId={activeAgentId}
        
        showFateCodex={showFateCodex}
        setShowFateCodex={setShowFateCodex}
        showLegend={showLegend}
        setShowLegend={setShowLegend}
        hasSystemBlocks={hasSystemBlocks}
        chapters={chapters}
      />

      <ReaderControls
        selectedChapter={selectedChapter}
        navigation={{
          selectedChapterNum,
          maxChapterNum,
          navigatePrev,
          navigateNext,
          onSwitchTab,
        }}
        playback={{
          isPlayingText,
          isPausedText,
          handleTogglePlayback,
          readerMode,
          playerStyle: currentPrefs.playerStyle,
        }}
        audio={{
          speechRate,
          setSpeechRate,
          availableVoices,
          selectedVoiceURI,
          setSelectedVoiceURI,
          selectedDialogueVoiceURI,
          setSelectedDialogueVoiceURI,
          selectedSideVoiceURI,
          setSelectedSideVoiceURI,
        }}
        immersion={{
          immersion,
          setImmersion,
        }}
        actions={{
          handleAlterFate: handleAlterFate as ((chapterNum: number, direction: string, customPrompt?: string) => Promise<void>) | undefined,
          setIsAlterFateOpen,
          handleExportText,
          alterFateLockMessage,
        }}
      />

      {/* THE CHRONICLE ANCHORS (BOOKMARKS DRAW PANEL) */}
      <CosmicBookmarksPanel
        showBookmarksPanel={showBookmarksPanel}
        setShowBookmarksPanel={setShowBookmarksPanel}
        activeBookmarks={activeBookmarks}
        chapters={chapters}
        handleRemoveBookmark={handleRemoveBookmark}
        handleJumpToBookmark={handleJumpToBookmark}
      />

      {handleAlterFate && (
        <AlterFatePanel
          isOpen={isAlterFateOpen}
          onClose={() => setIsAlterFateOpen(false)}
          chapterNumber={selectedChapterNum}
          onConfirmFork={(direction, prompt) => {
            setIsAlterFateOpen(false);
            handleAlterFate(selectedChapterNum, direction, prompt);
          }}
        />
      )}

      {/* Small Resume Affordance — shown when narration is playing but the
          user took manual control, so automated movement has yielded. */}
      <AnimatePresence>
        {cinematicScrollState === 'yielded' && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.3 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 bg-black/95 border border-portal/40 hover:border-portal shadow-[0_0_20px_rgba(4,172,255,0.25)] rounded-full px-6 py-3 flex items-center gap-3 backdrop-blur-md"
          >
            <span className="text-signal text-xs font-sans tracking-wide">
              Auto-scroll paused
            </span>
            <button
              type="button"
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                // Narration is already playing; the user took manual control.
                // resume() re-measures the narration target, returns the state
                // machine to `following`, and re-locks: the scroll glides back
                // to the narrated block on the focus line even if the reader
                // scrolled ahead, so following resumes centered.
                resumeAutoScroll();
              }}
              className="bg-portal hover:bg-[#00c0ff] text-void text-xs font-sans font-medium px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(4,172,255,0.4)]"
            >
              <Play size={12} className="fill-current" />
              Resume Reading
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {consistencyWarnings && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-void border border-portal/50 rounded-lg p-6 max-w-lg w-full shadow-[0_0_50px_rgba(4,172,255,0.15)] relative">
            <h3 className="text-xl font-display text-portal flex items-center gap-2 mb-4">
              <ShieldAlert size={20} /> Continuity Guard Warning
            </h3>
            <p className="text-signal text-sm mb-6">
              The Heavenly Dao sensors have detected potential logic fractures in this chapter. It is recommended to alter fate or manually edit before sealing.
            </p>
            <ul className="space-y-3 mb-8">
              {consistencyWarnings.map((warning, idx) => (
                <li key={idx} className="bg-portal/10 border-l-[3px] border-portal text-portal p-3 text-sm rounded-r flex items-start gap-2">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-4 justify-end">
              <button
                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setConsistencyWarnings(null)}
                className="px-4 py-2 border border-neutral-700 text-neutral-400 hover:text-signal rounded font-sc text-xs tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                   setConsistencyWarnings(null);
                   if (handleSealChapter) await handleSealChapter(selectedChapter.number);
                }}
                className="px-4 py-2 bg-portal/20 hover:bg-portal hover:text-void border border-portal text-portal rounded font-sc text-xs tracking-wider transition-colors flex items-center gap-2"
              >
                Seal Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
