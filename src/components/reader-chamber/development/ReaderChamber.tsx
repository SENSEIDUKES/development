import { createAnchoredBookmark, resolveBookmarkIndex, type MindPalaceBlock } from '../shared/mindPalace';
import { generateId } from '../../../narrative/id';
import {
  normalizeSenLanguageCode,
  resolveReadingLanguageCode,
  type SenLanguageCode,
} from '../../../lib/language';
import {
  normalizeReaderLanguageChoice,
  resolveReaderLanguage,
  type ReaderLanguageChoice,
} from '../shared/readerLanguage';
import { mergeReaderTranslation } from '../shared/translation/readerFacing';
import { useChapterTranslation } from '../shared/translation/useChapterTranslation';
import type { HarnessSkillManifest } from '../../../narrative/generation';
import React, { useRef, useState, useEffect, useMemo } from "react";
import {
  ShieldAlert,
  Play,
} from "lucide-react";
import { ReaderChapter, StoryWorld, UpdateStoryFields, ReaderPreferences, Bookmark } from '../../../narrative/story';
import { motion, AnimatePresence } from "motion/react";
import { ParticleSystem } from "./ParticleSystem";
import { useReaderStore } from '../../../narrative/readerRuntime';
import { selectIsGenerating } from '../../../narrative/readerRuntime';
import { useReaderRuntime } from '../../../narrative/readerRuntime';
import { ReaderSettings } from "./ReaderSettings";
import { CosmicBookmarksPanel } from "./CosmicBookmarksPanel";
import { useReaderPlayback } from '../../../narrative/readerRuntime';
import { extractReaderVisibleAudioText as extractSFXCues } from '../../../audio/readerVisibleText';
import { useReaderVisuals } from '../../../narrative/readerRuntime';

import { ReaderHeader } from "./ReaderHeader";
import { ReaderViewport } from "./ReaderViewport";
import { ReaderControls } from "./ReaderControls";
import type { ReaderContinueAction } from "./ReaderControls/types";
import { useCinematicScroll } from '../../../narrative/readerRuntime';
import { cinematicEffectGovernor } from "../shared/effects/cinematicEffectGovernor";
import { useReadingPosition } from '../../../narrative/readerRuntime';
import { DEFAULT_READER_TYPOGRAPHY } from '../shared/readerTypography';
import { CodexHovercard } from '../../reader-codex/development/CodexHovercard';
import {
  createCodexHighlighter,
  splitByCodexTerms,
} from '../../../narrative/codexHighlighting';

interface ReaderChamberProps {
  chapters: ReaderChapter[];
  onGenerateChapter: (chapterNumber: number) => Promise<void>;
  onGenerateNextFiveChapters: (fromChapterNumber: number) => Promise<void>;
  isGenerating: boolean;
  selectedChapterNum: number;
  setSelectedChapterNum: (num: number) => void;
  onToggleRead: (chapterNumber: number) => void;
  arcTitle: string;
  onBack?: () => void;
  onSwitchTab?: (tab: "reader" | "codex" | "memory") => void;
  activeStory: StoryWorld;
  updateStoryFields: UpdateStoryFields;
  /**
   * Host-installed skills. The Reader resolves its own Translation skill from
   * this list and never reads a host inventory directly.
   */
  installedSkills?: HarnessSkillManifest[];
  /**
   * Opens the host's Fate page, where the reader sees where the story is headed
   * and chooses the next chapter's path. Absent when the host has none.
   */
  onOpenFate?: () => void;
  /**
   * What Next does at the newest chapter, such as writing the next chapter or
   * asking the reader to direct it first. Absent, Next stops at the newest chapter.
   */
  continueAfterLatest?: ReaderContinueAction;
  handleSealChapter?: (chapterNumber: number) => Promise<void>;
  handleCheckConsistency?: (chapterNumber: number) => Promise<string[]>;
}

/**
 * Shared by the full Development Reader Chamber and Workshop contextual
 * fixtures so card review uses the same Reader surface rather than a copied
 * approximation of its background, spacing, and visual treatment.
 */
export function getReaderChamberSurfaceClass(
  themeOverride: string | undefined,
  dynamicShading = '',
  isShaking = false,
) {
  const theme = themeOverride || "void";
  const baseClasses = (() => {
    if (theme === "crimson")
      return "bg-[#0f0404] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0a0a] to-[#0a0202] text-[#e0cfcf] border-t border-[#8B0000]/30 selection:bg-[#8B0000]/40 selection:text-white";
    if (theme === "abyss")
      return "bg-[#05080f] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1222] to-[#020408] text-[#ccd4e0] border-t border-[#04ACFF]/20 selection:bg-[#04ACFF]/40 selection:text-white";
    if (theme === "sepia")
      return "bg-[#1a1614] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2a2420] to-[#14100e] text-[#d6c5b3] border-t border-[#8b5a2b]/30 selection:bg-[#8b5a2b]/40 selection:text-white";
    if (theme === "emerald")
      return "bg-[#050f0a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0a1c12] to-[#020805] text-[#b9d6c1] border-t border-[#0f5132]/40 selection:bg-[#0f5132]/40 selection:text-white";
    return "bg-[#0a0a0a] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#141414] to-[#050505] text-[#e8e8e8] border-t border-neutral-800/60 selection:bg-neutral-700 selection:text-white";
  })();

  const themeClasses = dynamicShading
    ? `${baseClasses} ${dynamicShading}`
    : theme === "crimson"
      ? `${baseClasses} shadow-[inset_0_0_120px_rgba(139,0,0,0.08)] ring-1 ring-[#8B0000]/10`
      : theme === "abyss"
        ? `${baseClasses} shadow-[inset_0_0_120px_rgba(4,172,255,0.06)] ring-1 ring-[#04ACFF]/10`
        : theme === "sepia"
          ? `${baseClasses} shadow-[inset_0_0_120px_rgba(139,90,43,0.08)] ring-1 ring-[#8b5a2b]/10`
          : theme === "emerald"
            ? `${baseClasses} shadow-[inset_0_0_120px_rgba(15,81,50,0.1)] ring-1 ring-[#0f5132]/20`
            : `${baseClasses} shadow-[inset_0_0_120px_rgba(255,255,255,0.02)] ring-1 ring-white/5`;

  return `flex flex-col min-h-[85dvh] rounded-t-xl transition-colors duration-500 relative overflow-clip ${themeClasses} ${isShaking ? "animate-screen-shake" : ""}`;
}

export default function ReaderChamber({
  chapters,
  onGenerateChapter,
  onGenerateNextFiveChapters,
  isGenerating,
  selectedChapterNum,
  setSelectedChapterNum,
  onToggleRead,
  arcTitle,
  onBack,
  onSwitchTab,
  activeStory,
  updateStoryFields,
  installedSkills,
  onOpenFate,
  continueAfterLatest,
  handleSealChapter,
  handleCheckConsistency,
}: ReaderChamberProps) {
  const selectedChapter =
    chapters.find((c) => c.number === selectedChapterNum) || chapters[0];

  const runtime = useReaderRuntime();
  const [showLegend, setShowLegend] = useState(() => {
    return runtime.preferences?.read("legend-dismissed") !== "true";
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

  const [isCheckingConsistency, setIsCheckingConsistency] = useState(false);
  const [consistencyWarnings, setConsistencyWarnings] = useState<string[] | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const readerMode = useReaderStore((state) => state.readerMode);
  const immersion = useReaderStore((state) => state.immersion);
  const setReaderMode = useReaderStore((state) => state.setReaderMode);
  const setImmersion = useReaderStore((state) => state.setImmersion);

  const { 
    handleManifestReveal, 
    generatingRevealId, 
    codexTerms,
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


  // --- Reading language and the derived translation layer ---
  const maxChapterNum = chapters.length > 0 ? Math.max(...chapters.map(c => c.number)) : 0;
  const userProfile = useReaderStore((state) => state.languagePreferences);

  /**
   * The story's permanent Original Language. Canon is always in this language;
   * everything below is a reversible display layer over it.
   */
  const storyOriginalLanguage = normalizeSenLanguageCode(activeStory.originalLanguage);

  /**
   * The reader's per-story choice: Original, Account Default, or one specific
   * language. Only Account Default follows the account, so changing the
   * account default leaves an Original or overridden story exactly as it was.
   */
  const readingLanguageChoice = normalizeReaderLanguageChoice(
    activeStory.readerPreferences?.readingLanguage,
  );
  const account = {
    defaultReadingLanguage: userProfile?.defaultReadingLanguage,
    interfaceLanguage: userProfile?.interfaceLanguage,
  };
  const accountReadingLanguage: SenLanguageCode = resolveReadingLanguageCode(account);
  const resolvedReading = resolveReaderLanguage(readingLanguageChoice, {
    originalLanguage: storyOriginalLanguage,
    account,
  });
  const preferredLang = resolvedReading.language;

  const chapterTranslation = useChapterTranslation({
    story: { id: activeStory.id, originalLanguage: storyOriginalLanguage },
    chapter: selectedChapter,
    targetLanguage: preferredLang,
    installedSkills,
  });
  const isTranslating = chapterTranslation.status === 'translating';
  const translationError = chapterTranslation.message;
  const activeTranslation = chapterTranslation.status === 'ready'
    ? chapterTranslation.translation
    : null;

  /**
   * Canonical blocks with the reader-facing overlay applied for display only.
   * The stored chapter is never written back, so switching to Original is a
   * pure render change.
   */
  const displayBlocks = useMemo(() => (
    activeTranslation
      ? mergeReaderTranslation(selectedChapter.blocks ?? [], activeTranslation.blocks)
      : selectedChapter.blocks
  ), [activeTranslation, selectedChapter.blocks]);
  const displayTitle = activeTranslation?.title ?? selectedChapter.title;
  // The language actually on screen — never inferred from whether a
  // translation happens to exist, and never assumed to be English.
  const displayLanguage = activeTranslation ? activeTranslation.targetLanguage : storyOriginalLanguage;

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
    // Narration speaks what is displayed. Block identity survives translation,
    // so block-level alignment stays valid; phrase-anchored cues do not and
    // are suppressed in the viewport.
    activeTranslationContent: activeTranslation
      ? displayBlocks?.map(block => block.text).filter(Boolean).join('\n\n') ?? null
      : null,
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

  const setCanShowOverlays = useReaderStore(state => state.setCanShowOverlays);

  useEffect(() => {
    // Narration always wins over scroll position, and a chapter change resets the gate.
    setCanShowOverlays?.(!isPlayingText);
    return () => {
      setCanShowOverlays?.(true);
    };
  }, [selectedChapterNum, isPlayingText, setCanShowOverlays]);

  useEffect(() => {
    const el = readerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const currentAllowed = runtime.store.getSnapshot().canShowOverlays;
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
        setCanShowOverlays?.(nextAllowed);
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
    };
  }, [selectedChapterNum, isPlayingText, setCanShowOverlays]);

  // --- atmospheric audio (just reference, no actual addition needed here)
  const isReaderFullscreen = useReaderStore((state) => state.isReaderFullscreen);
  const setIsReaderFullscreen = useReaderStore(
    (state) => state.setIsReaderFullscreen,
  );
  const activeAgentId = useReaderStore((state) => state.activeAgentId);

  // --- Theme & Reader Typography Customizer States ---
  const [showReaderSettings, setShowReaderSettings] = useState(false);

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

  /**
   * Saves the reading-language choice for this story alone. It is a reader
   * preference: no canonical field, no chapter, and no memory is touched, and
   * the reading position is untouched because only rendering changes.
   */
  const handleReadingLanguageChange = (choice: ReaderLanguageChoice) => {
    handleUpdatePreference('readingLanguage', choice);
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

  // Header Audio button: the audio/narration controls live in the Audio
  // section of the single Reader Settings panel — open it and bring that
  // section into view once the panel's open animation completes (no fixed
  // delay: scrolling mid-animation lands at the wrong offset). When the
  // panel is already open, scroll immediately.
  const [audioScrollPending, setAudioScrollPending] = useState(false);

  const handleOpenAudioControls = () => {
    if (showReaderSettings) {
      document
        .getElementById("reader-settings-audio")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    interveneAutoScroll();
    readerRef.current?.scrollIntoView({ behavior: "smooth" });
    setAudioScrollPending(true);
    setShowReaderSettings(true);
  };

  const handleSettingsReveal = () => {
    if (!audioScrollPending) return;
    setAudioScrollPending(false);
    document
      .getElementById("reader-settings-audio")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  // --- Rendering UI States ---
  // (The old immersion popover states lived here; all settings now open the
  // single Reader Settings panel via showReaderSettings.)

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
        if (!runtime.store.getSnapshot().immersion.imagePopups) return;
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

  // --- Scroll-direction header visibility ---
  // The chamber root uses `overflow-clip` (not `overflow-hidden`), so the
  // sticky header sticks to the actual scroll surface again. This effect
  // hides the header on intentional downward scroll and reveals it on
  // intentional upward scroll; it stays visible near the chapter top and
  // while the Reader Settings panel (anchored directly under the header, and
  // toggled from inside it) is open.
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  useEffect(() => {
    setIsHeaderVisible(true);
    if (showReaderSettings) return;

    const startEl = readerRef.current;
    if (!startEl) return;

    // The Reader Chamber's actual scroll container: the nearest ancestor that
    // genuinely scrolls — never an assumed global page scroll. Falls back to
    // the document when no inner scroller exists (Workshop + production).
    let scroller: HTMLElement | Window = window;
    let node: HTMLElement | null = startEl.parentElement;
    while (node) {
      const overflowY = window.getComputedStyle(node).overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll") &&
        node.scrollHeight > node.clientHeight
      ) {
        scroller = node;
        break;
      }
      node = node.parentElement;
    }

    const getScrollTop = () =>
      scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop;

    let lastY = getScrollTop();
    let direction: -1 | 0 | 1 = 0;
    let accrued = 0;

    const handleScroll = () => {
      const y = getScrollTop();
      const delta = y - lastY;
      lastY = y;

      // Near the top of the chapter the header always stays visible.
      if (y <= 80) {
        direction = 0;
        accrued = 0;
        setIsHeaderVisible(true);
        return;
      }
      if (delta === 0) return;

      const nextDirection = delta > 0 ? 1 : -1;
      if (nextDirection !== direction) {
        direction = nextDirection;
        accrued = 0;
      }
      accrued += Math.abs(delta);

      // Require 8px of accumulated one-direction travel before flipping, so
      // touch bounce and sub-pixel jitter never flicker the header.
      if (accrued < 8) return;
      setIsHeaderVisible(direction === -1);
    };

    const target: HTMLElement | Window = scroller;
    target.addEventListener("scroll", handleScroll, { passive: true });
    return () => target.removeEventListener("scroll", handleScroll);
  }, [showReaderSettings, selectedChapterNum, activeStory.id]);

  // --- Mind Palace (anchored passage bookmarks): states & handlers ---
  const [showBookmarksPanel, setShowBookmarksPanel] = useState(false);
  const [editingBookmarkParagraphIndex, setEditingBookmarkParagraphIndex] =
    useState<number | null>(null);
  const [bookmarkNoteText, setBookmarkNoteText] = useState("");
  const [pendingBookmark, setPendingBookmark] = useState<Bookmark | null>(null);
  const [mindPalaceNotice, setMindPalaceNotice] = useState<string | null>(null);
  // The canonical blocks of the open chapter, in the same order the Reader
  // shows them (a translation overlays text but never reorders blocks).
  const mindPalaceBlocks = useMemo<MindPalaceBlock[]>(() => selectedChapter.blocks
    ?? (selectedChapter.generatedContent || '').split('\n\n').map(text => ({ text })),
  [selectedChapter.blocks, selectedChapter.generatedContent]);


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
              activeStory={activeStory}
            >
              {segment.text}
            </CodexHovercard>
          ) : (
            <React.Fragment key={index}>{segment.text}</React.Fragment>
          )
        ))}
      </>
    );
  }, [activeChunks, activeStory, codexHighlighter, codexTerms.length, currentChunkIndex, highlightRegex, isPausedText, isPlayingText]);


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

  // Mind Palace jump: go only to the block that still holds the saved
  // passage. When the chapter no longer has it, say so instead of guessing.
  useEffect(() => {
    if (
      pendingBookmark !== null &&
      pendingBookmark.chapterNumber === selectedChapter.number &&
      (selectedChapter.generatedContent || selectedChapter.blocks)
    ) {
      const target = resolveBookmarkIndex(pendingBookmark, selectedChapter.number, mindPalaceBlocks);
      if (target === undefined) {
        setMindPalaceNotice(`This passage is no longer in Chapter ${pendingBookmark.chapterNumber}, so the Mind Palace cannot take you to it.`);
        setPendingBookmark(null);
        return;
      }
      const timer = setTimeout(() => {
        const element = document.getElementById(`para-${target}`);
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
        setPendingBookmark(null);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [
    pendingBookmark,
    mindPalaceBlocks,
    selectedChapter.number,
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

  /** Keeps the passage at this block in the Mind Palace, or updates the note of the one already kept there. */
  const handleSaveBookmark = (paraIdx: number, noteText: string) => {
    const block = mindPalaceBlocks[paraIdx];
    if (!block?.text.trim()) return;
    const chapterNumber = selectedChapter.number;
    void updateStoryFields(activeStory.id, (current) => {
      const bookmarks = Array.isArray(current.bookmarks) ? current.bookmarks : [];
      const existing = bookmarks.find(candidate => resolveBookmarkIndex(candidate, chapterNumber, mindPalaceBlocks) === paraIdx);
      return {
        bookmarks: existing
          ? bookmarks.map(candidate => candidate.id === existing.id ? { ...candidate, note: noteText.trim() || undefined } : candidate)
          : [...bookmarks, createAnchoredBookmark({
            id: generateId(7), chapterNumber, index: paraIdx, block, note: noteText, createdAt: new Date().toISOString(),
          })],
      };
    });
    setEditingBookmarkParagraphIndex(null);
    setBookmarkNoteText("");
  };

  const handleRemoveBookmark = (bookmarkId: string) => {
    void updateStoryFields(activeStory.id, (current) => ({
      bookmarks: (Array.isArray(current.bookmarks) ? current.bookmarks : []).filter(bookmark => bookmark.id !== bookmarkId),
    }));
  };

  const handleJumpToBookmark = (b: Bookmark) => {
    setMindPalaceNotice(null);
    setSelectedChapterNum(b.chapterNumber);
    setPendingBookmark(b);
    setShowBookmarksPanel(false);
  };

  const handleGenerate = () => {
    if (isGenerating || selectIsGenerating(runtime.store.getSnapshot()) || !runtime.canGenerate(activeStory.id)) return;
    onGenerateChapter(selectedChapter.number);
  };

  const handleGenerateNextFive = () => {
    if (isGenerating || selectIsGenerating(runtime.store.getSnapshot()) || !runtime.canGenerate(activeStory.id)) return;
    onGenerateNextFiveChapters(selectedChapter.number);
  };

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

  const openChapter = (chapterNumber: number) => {
    setSelectedChapterNum(chapterNumber);
    // Programmatic scroll — does not fire wheel events, so explicitly yield.
    interveneAutoScroll();
    readerRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const navigateNext = () => {
    const nextChapter = chapters.find(
      (c) => c.number === selectedChapterNum + 1,
    );
    if (nextChapter) {
      openChapter(selectedChapterNum + 1);
      return;
    }
    // At the newest chapter, Next runs the host's action there and opens what it produced.
    if (selectedChapterNum !== maxChapterNum || !continueAfterLatest || continueAfterLatest.busy) return;
    void Promise.resolve(continueAfterLatest.onContinue()).then(opened => {
      if (opened !== undefined) openChapter(opened);
    });
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
      className={getReaderChamberSurfaceClass(
        currentPrefs.themeOverride,
        getDynamicShadingClasses(),
        isShaking,
      )}
      id="reader-chamber-root"
    >
      {particleCount > 0 && (
        <ParticleSystem
          count={particleCount}
          className="opacity-20 pointer-events-none mix-blend-screen z-0 transition-colors duration-500"
          color={getParticleColor()}
        />
      )}

      {/* HEADER: Navigation & controls only (Back, title, Audio, Settings,
          Quick Action) */}
      {!isReaderFullscreen && (
        <ReaderHeader
          arcTitle={arcTitle}
          selectedChapter={selectedChapter}
          onBack={onBack}
          onOpenAudioControls={handleOpenAudioControls}
          showReaderSettings={showReaderSettings}
          setShowReaderSettings={setShowReaderSettings}
          onOpenFate={onOpenFate}
          getHeaderThemeClasses={getHeaderThemeClasses}
          isVisible={isHeaderVisible}
        />
      )}

      {/* Dynamic Collapsible Reader Settings Panel — the single settings
          entry point for Chapter, Reader, Audio, and Immersion controls */}
      <AnimatePresence>
        {showReaderSettings && (
          <ReaderSettings
            currentPrefs={currentPrefs}
            handleUpdatePreference={handleUpdatePreference}
            readingLanguage={{
              choice: readingLanguageChoice,
              onChange: handleReadingLanguageChange,
              originalLanguage: storyOriginalLanguage,
              accountLanguage: accountReadingLanguage,
              resolvedLanguage: displayLanguage,
              requestedLanguage: preferredLang,
              notice: chapterTranslation.status === 'unavailable' || chapterTranslation.status === 'failed'
                ? translationError
                : null,
              isTranslating,
            }}
            onResetTypography={handleResetTypography}
            showLegend={showLegend}
            onToggleLegend={() => {
              const nextState = !showLegend;
              setShowLegend(nextState);
              if (!nextState) {
                runtime.preferences?.write("legend-dismissed", "true");
              } else {
                runtime.preferences?.remove("legend-dismissed");
              }
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
            onExportText={handleExportText}
            chapters={chapters}
            selectedChapter={selectedChapter}
            selectedChapterNum={selectedChapterNum}
            onSelectChapter={setSelectedChapterNum}
            onToggleRead={onToggleRead}
            onReveal={handleSettingsReveal}
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
        selectedChapterNum={selectedChapterNum}
        maxChapterNum={maxChapterNum}
        
        codexTerms={codexTerms}
        generatingRevealId={generatingRevealId}
        handleManifestReveal={handleManifestReveal}
        
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
        
        displayBlocks={displayBlocks}
        displayTitle={displayTitle}
        displayLanguage={displayLanguage}
        isShowingTranslation={Boolean(activeTranslation)}
        translationNotice={
          chapterTranslation.status === 'unavailable' || chapterTranslation.status === 'failed'
            ? translationError
            : null
        }
        renderHighlightedText={renderHighlightedText}
        getFocusClass={getFocusClass}
        
        navigatePrev={navigatePrev}
        navigateNext={navigateNext}
        continueAfterLatest={continueAfterLatest}
        
        handleSealChapter={handleSealChapter}
        handleSealClick={handleSealClick}
        isCheckingConsistency={isCheckingConsistency}
        
        isGenerating={isGenerating}
        handleGenerate={handleGenerate}
        handleGenerateNextFive={handleGenerateNextFive}
        activeAgentId={activeAgentId}
        
        showLegend={showLegend}
        setShowLegend={(show) => {
          setShowLegend(show);
          if (!show) runtime.preferences?.write("legend-dismissed", "true");
          else runtime.preferences?.remove("legend-dismissed");
        }}
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
          continueAfterLatest,
          onSwitchTab,
        }}
        playback={{
          isPlayingText,
          isPausedText,
          handleTogglePlayback,
          readerMode,
          playerStyle: currentPrefs.playerStyle,
        }}
        comments={{
          open: showBookmarksPanel,
          count: activeBookmarks.length,
          onToggle: () => setShowBookmarksPanel(!showBookmarksPanel),
        }}
      />

      {mindPalaceNotice && (
        <div role="status" className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-start gap-3 rounded-lg border border-amber-300/40 bg-neutral-950/95 p-3 text-xs text-amber-100 shadow-xl sm:inset-x-auto sm:right-6">
          <span className="min-w-0 flex-1">{mindPalaceNotice}</span>
          <button type="button" onClick={() => setMindPalaceNotice(null)} className="min-h-11 shrink-0 px-2 text-neutral-300 hover:text-signal" aria-label="Dismiss Mind Palace notice">Dismiss</button>
        </div>
      )}

      {/* MIND PALACE (passage drawer) */}
      <CosmicBookmarksPanel
        showBookmarksPanel={showBookmarksPanel}
        setShowBookmarksPanel={setShowBookmarksPanel}
        activeBookmarks={activeBookmarks}
        chapters={chapters}
        handleRemoveBookmark={handleRemoveBookmark}
        handleJumpToBookmark={handleJumpToBookmark}
      />

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
              The Heavenly Dao sensors have detected potential logic fractures in this chapter. Review or edit the chapter before sealing it.
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
