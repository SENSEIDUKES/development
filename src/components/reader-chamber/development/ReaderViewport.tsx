import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LoaderCircle as Loader2, Plus, Trash2, Bookmark as BookmarkIcon, Lock, ArrowLeft, ArrowRight, Sparkles, Zap, Play, ShieldAlert, Info } from 'lucide-react';
import { ReaderChapter, StoryWorld, Bookmark } from '../shared/types';
import { extractSFXCues } from '../shared/readerPlayback';
import { collectBlockAutoCues } from '../shared/autoCuePolicy';
import { SystemBlock } from './SystemBlock';
import { SYSTEM_COLORS_LEGEND } from '../shared/systemColors';
import { WorldCard } from './WorldCard';
import { useAppStore } from '../shared/stubs';
import { ReaderFateAlerts } from './ReaderFateAlerts';
import { SystemColorLegend } from './SystemColorLegend';
import { anchorAttributes } from '../shared/cinematicScroll/anchors';
import { ContextInspector } from './ContextInspector';
import { getReaderTypography, getReadingDirection } from '../shared/readerTypography';
import { createCodexHighlighter } from '../../reader-codex/shared/codexHighlighting';
import { CodexCard, FALLBACK_BACKDROPS } from './CodexCard';
import type { WorldCardAudioAdapter } from './WorldCard';
import { InlineAudioText } from './InlineAudio';
import type { InlineAudioHighlight } from '../../../audio/inlineAudio';

interface ReaderViewportProps {
  readerRef: React.RefObject<HTMLDivElement | null>;
  isReaderFullscreen: boolean;
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  handleTextClick: (e: React.MouseEvent | React.TouchEvent) => void;

  isTranslating: boolean;
  preferredLang: string;
  selectedChapter: ReaderChapter;
  activeStory: StoryWorld;
  currentPowerStage: string;
  selectedChapterNum: number;
  maxChapterNum: number;
  
  codexTerms: any[];
  generatingRevealId: string | null;
  handleManifestReveal: (entry: any, type: string) => void;
  
  readerMode: string;
  immersion: any;
  isPlayingText: boolean;
  isPausedText: boolean;
  currentNarratedBlockIndex: number | null;
  
  currentPrefs: any;
  handleUpdatePreference: (key: string, value: any) => void;
  activeBookmarks: Bookmark[];
  editingBookmarkParagraphIndex: number | null;
  setEditingBookmarkParagraphIndex: (idx: number | null) => void;
  bookmarkNoteText: string;
  setBookmarkNoteText: (text: string) => void;
  handleRemoveBookmark: (chapterNum: number, paraIdx: number) => void;
  handleSaveBookmark: (paraIdx: number, excerpt: string, noteText: string) => void;
  
  activeTranslationContent: string | null;
  renderHighlightedText: (text: string, paragraphIndex: number) => React.ReactNode;
  getFocusClass: (paraIdx: number) => string;
  
  navigatePrev: () => void;
  navigateNext: () => void;
  
  handleSealChapter?: (chapterNumber: number) => Promise<void>;
  handleSealClick: () => void;
  isCheckingConsistency: boolean;
  
  isGenerating: boolean;
  handleGenerate: () => void;
  handleGenerateNextFive: () => void;
  activeAgentId: string | null;
  
  showFateCodex: boolean;
  setShowFateCodex: (show: boolean) => void;
  showLegend: boolean;
  setShowLegend: (show: boolean) => void;
  hasSystemBlocks: boolean;

  chapters: ReaderChapter[];
  /**
   * Development-only dependency seam used by the Card Workshop contextual
   * fixture. Omitting it preserves the Reader's normal World Card lifecycle.
   */
  worldCardAudioAdapter?: WorldCardAudioAdapter;
  /** Resets a Workshop-simulated card when its local audio state changes. */
  worldCardPresentationKey?: string;
  /**
   * Development-only prose annotations. They are separate from StoryBlock so
   * this phase cannot change generated or persisted chapter payloads.
   */
  inlineAudioHighlights?: readonly InlineAudioHighlight[];
}

export function ReaderViewport({
  readerRef,
  isReaderFullscreen,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleTextClick,
  isTranslating,
  preferredLang,
  selectedChapter,
  activeStory,
  currentPowerStage,
  selectedChapterNum,
  maxChapterNum,
  codexTerms,
  generatingRevealId,
  handleManifestReveal,
  readerMode,
  immersion,
  isPlayingText,
  isPausedText,
  currentNarratedBlockIndex,
  currentPrefs,
  handleUpdatePreference,
  activeBookmarks,
  editingBookmarkParagraphIndex,
  setEditingBookmarkParagraphIndex,
  bookmarkNoteText,
  setBookmarkNoteText,
  handleRemoveBookmark,
  handleSaveBookmark,
  activeTranslationContent,
  renderHighlightedText,
  getFocusClass,
  navigatePrev,
  navigateNext,
  handleSealChapter,
  handleSealClick,
  isCheckingConsistency,
  isGenerating,
  handleGenerate,
  handleGenerateNextFive,
  activeAgentId,
  showFateCodex,
  setShowFateCodex,
  showLegend,
  setShowLegend,
  hasSystemBlocks,
  chapters,
  worldCardAudioAdapter,
  worldCardPresentationKey,
  inlineAudioHighlights = [],
}: ReaderViewportProps) {
  const readingLanguage = activeTranslationContent ? preferredLang : 'en';
  const typography = getReaderTypography(currentPrefs);
  const renderProseText = (text: string, paragraphIndex: number) => (
    inlineAudioHighlights.length > 0
      ? (
          <InlineAudioText
            highlights={inlineAudioHighlights}
            renderText={segment => renderHighlightedText(segment, paragraphIndex)}
            text={text}
          />
        )
      : renderHighlightedText(text, paragraphIndex)
  );

  const getThemeAccentColor = (theme: string) => {
    switch (theme) {
      case "crimson": return "#8B0000"; // Deep crimson
      case "abyss": return "#04ACFF";   // Celestial blue
      case "sepia": return "#8b5a2b";   // Warm brown/gold
      case "emerald": return "#10B981"; // Serene green
      default: return "#04ACFF";        // Default void/portal cyan
    }
  };

  const getThemeTextClass = (theme: string) => {
    switch (theme) {
      case "crimson": return "text-human";
      case "abyss": return "text-[#04ACFF]";
      case "sepia": return "text-[#8b5a2b]";
      case "emerald": return "text-jade-accent";
      default: return "text-portal";
    }
  };

  const renderChapterDivider = () => {
    const divider = currentPrefs.dividerStyle || "default";
    if (divider === "default") {
      // Classic simple line divider to preserve exactly the standard default look
      return (
        <div className="w-24 h-[1px] bg-neutral-800/60 mx-auto my-8 animate-fadeIn motion-reduce:animate-none" />
      );
    }

    const theme = currentPrefs.themeOverride || "void";
    const accentColor = getThemeAccentColor(theme);

    if (divider === "celestial") {
      return (
        <div className="flex items-center justify-center gap-4 my-8 opacity-85 select-none animate-fadeIn motion-reduce:animate-none" aria-hidden="true">
          {/* Left fading gradient line */}
          <div className="h-[1px] w-20 sm:w-32 bg-gradient-to-r from-transparent to-current opacity-40" style={{ color: accentColor }} />

          {/* Flanking diamond dots */}
          <div className="flex items-center gap-1.5" style={{ color: accentColor }}>
            <div className="w-1.5 h-1.5 rotate-45 border border-current opacity-60" />
            <div className="w-1 h-1 rotate-45 bg-current opacity-40" />
          </div>

          {/* Center 8-pointed celestial star or dual diamond */}
          <div className="relative w-5 h-5 flex items-center justify-center" style={{ color: accentColor }}>
            <div className="absolute w-4 h-4 rotate-45 border border-current animate-pulse motion-reduce:animate-none" />
            <div className="absolute w-2.5 h-2.5 bg-current shadow-[0_0_10px_rgba(4,172,255,0.5)]" />
          </div>

          {/* Flanking diamond dots */}
          <div className="flex items-center gap-1.5" style={{ color: accentColor }}>
            <div className="w-1 h-1 rotate-45 bg-current opacity-40" />
            <div className="w-1.5 h-1.5 rotate-45 border border-current opacity-60" />
          </div>

          {/* Right fading gradient line */}
          <div className="h-[1px] w-20 sm:w-32 bg-gradient-to-l from-transparent to-current opacity-40" style={{ color: accentColor }} />
        </div>
      );
    }

    if (divider === "sword_qi") {
      return (
        <div className="flex flex-col items-center justify-center my-8 opacity-90 select-none animate-fadeIn motion-reduce:animate-none" aria-hidden="true">
          <div className="relative flex items-center justify-center w-full max-w-[200px] sm:max-w-[320px]">
            {/* Horizontal line with sharp central focus */}
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-current to-transparent opacity-50" style={{ color: accentColor }} />

            {/* Sharp pulsing central diamond marker */}
            <div className="absolute w-2.5 h-2.5 rotate-45 bg-current border border-black shadow-[0_0_8px_currentColor] animate-pulse motion-reduce:animate-none" style={{ color: accentColor }} />
          </div>
          {/* Secondary parallel micro-lines */}
          <div className="flex items-center justify-center gap-8 mt-1.5 w-full max-w-[120px] sm:max-w-[180px]">
            <div className="h-[1px] w-full bg-gradient-to-r from-transparent to-current opacity-25" style={{ color: accentColor }} />
            <div className="h-[1px] w-full bg-gradient-to-l from-transparent to-current opacity-25" style={{ color: accentColor }} />
          </div>
        </div>
      );
    }

    if (divider === "lotus_path") {
      return (
        <div className="flex items-center justify-center gap-3 my-8 opacity-80 select-none animate-fadeIn motion-reduce:animate-none" aria-hidden="true">
          {/* Soft curving arch left */}
          <div className="hidden sm:block w-12 h-3 border-b border-r rounded-br-full border-current opacity-20 -translate-y-1.5" style={{ color: accentColor }} />

          <div className="flex items-center gap-1.5" style={{ color: accentColor }}>
            {/* Droplet dots */}
            <div className="w-1 h-1 rounded-full bg-current opacity-25" />
            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />

            {/* Center lotus blossom (represented by triple petal curves) */}
            <div className="flex items-end gap-0.5 px-0.5">
              <div className="w-1 h-2.5 rounded-t-full border-l border-t border-current opacity-50 transform -rotate-12" />
              <div className="w-2 h-3.5 rounded-t-full bg-current opacity-70 shadow-[0_0_6px_rgba(16,185,129,0.3)]" />
              <div className="w-1 h-2.5 rounded-t-full border-r border-t border-current opacity-50 transform rotate-12" />
            </div>

            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
            <div className="w-1 h-1 rounded-full bg-current opacity-25" />
          </div>

          {/* Soft curving arch right */}
          <div className="hidden sm:block w-12 h-3 border-b border-l rounded-bl-full border-current opacity-20 -translate-y-1.5" style={{ color: accentColor }} />
        </div>
      );
    }

    return null;
  };
  const readerProseStyle = {
    '--reader-line-height': typography.lineHeightScale,
    '--reader-letter-spacing': `${typography.letterSpacing}em`,
    '--reader-word-spacing': typography.wordSpacing === 0 ? 'normal' : `${typography.wordSpacing}em`,
    '--reader-paragraph-spacing': `${typography.paragraphSpacingScale}em`,
    maxInlineSize: `${typography.readingWidth}ch`,
    textAlign: typography.textAlignment,
  } as React.CSSProperties;
  const { updateStory } = useAppStore();
  const isCompletedBatchEndpoint = activeStory.chapterGenerationBatch?.status === 'completed'
    // WORKSHOP: `.at(-1)` rewritten as index access — the Workshop tsconfig
    // targets ES2020, which has no `Array.prototype.at` typings.
    && activeStory.chapterGenerationBatch.chapterNumbers[activeStory.chapterGenerationBatch.chapterNumbers.length - 1] === selectedChapter.number;
  const resumableBatch = activeStory.chapterGenerationBatch;
  const isResumingAtSelectedChapter = Boolean(
    resumableBatch
    && (resumableBatch.status === 'paused' || resumableBatch.status === 'failed')
    && resumableBatch.chapterNumbers.find(number => !resumableBatch.completedChapterNumbers.includes(number)) === selectedChapter.number,
  );
  // Reveal cards resolve the same term index the inline highlighting uses, so
  // an entity named by an alias reaches its own card and colour.
  const codexHighlighter = React.useMemo(
    () => createCodexHighlighter(codexTerms ?? []),
    [codexTerms],
  );

  const bookmarkMap = React.useMemo(() => {
    const map = new Map<number, Bookmark>();
    if (!activeBookmarks) return map;
    activeBookmarks.forEach(b => {
      if (b && b.chapterNumber === selectedChapter.number && !map.has(b.paragraphIndex)) {
        map.set(b.paragraphIndex, b);
      }
    });
    return map;
  }, [activeBookmarks, selectedChapter.number]);
  React.useEffect(() => {
    if (!selectedChapter?.blocks || !activeStory) return;
    let hasChanges = false;
    const newAssignments: Record<string, string> = {};
    let lastUsedUrl = "";

    const existingAssignments = activeStory.assignedRevealBackdrops || {};
    const existingValues = Object.values(existingAssignments);
    if (existingValues.length > 0) {
      lastUsedUrl = existingValues[existingValues.length - 1];
    }

    selectedChapter.blocks.forEach((block) => {
      const revealEntity = block.metadata?.entities?.find(
        (ent) => ent.mention === "reveal"
      );
      if (revealEntity) {
        const matched = codexHighlighter.resolve(revealEntity.name);
        if (matched && matched.entry) {
          const id = matched.entry.id;
          const currentAssign = existingAssignments[id] || newAssignments[id];
          if (!currentAssign) {
            let available = FALLBACK_BACKDROPS.filter(
              (url) => url !== lastUsedUrl
            );
            if (available.length === 0) available = FALLBACK_BACKDROPS;
            const picked =
              available[Math.floor(Math.random() * available.length)];
            newAssignments[id] = picked;
            lastUsedUrl = picked;
            hasChanges = true;
          } else {
            lastUsedUrl = currentAssign;
          }
        }
      }
    });

    if (hasChanges) {
      void updateStory(activeStory.id, (current) => ({
        assignedRevealBackdrops: {
          ...(current.assignedRevealBackdrops || {}),
          ...newAssignments,
        },
      }));
    }
  }, [selectedChapter?.blocks, activeStory, codexHighlighter, updateStory]);

  return (
    // Vertical scrolling is owned by the document — this container only lays
    // out padding; it must never become a scroll container of its own.
    // Tapping the prose toggles fullscreen (a convenience, not the element's
    // semantic role), so no button semantics or key interception here: text
    // selection, links, keyboard scrolling, and screen-reader navigation all
    // keep their native behavior. Fullscreen also has a real keyboard path
    // (Alt+F) and a dedicated control, so the tap shortcut carries no
    // accessibility obligation of its own.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div
      ref={readerRef as any}
      className={`flex-1 px-4 sm:px-12 md:px-24 py-8 relative ${isReaderFullscreen ? "mb-4" : "mb-24"}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleTextClick}
    >
      <article>
      {isTranslating ? (
        <div className="flex flex-col items-center justify-center h-full py-32 space-y-4">
          <Loader2 className="animate-spin text-portal w-10 h-10" />
          <p className="text-signal font-serif italic text-lg opacity-80 mt-4">
            Translating the Heavenly Dao...
          </p>
        </div>
      ) : selectedChapter.generatedContent || (selectedChapter.blocks && selectedChapter.blocks.length > 0) ? (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${selectedChapter.number}-${preferredLang}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full max-w-5xl mx-auto"
            >
              <ReaderFateAlerts 
                activeStory={activeStory}
                currentPowerStage={currentPowerStage}
                selectedChapterNum={selectedChapterNum}
                showFateCodex={showFateCodex}
                setShowFateCodex={setShowFateCodex}
              />

              {selectedChapter.hasContinuityFaults && (
                <div className="mb-6 p-5 border border-rose-500/30 bg-rose-950/20 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="text-rose-400 shrink-0 mt-0.5" size={20} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-display font-medium text-rose-300 uppercase tracking-wider mb-1">
                        Timeline Divergence Note
                      </h4>
                      <p className="text-xs text-rose-400/80 font-sans mb-3 leading-relaxed">
                        This chapter is fully readable. The Continuity Guard confirmed a hard contradiction against a Codex entity your lore marks as gone — usually the sign of a dramatic fate shift (someone the Codex records as dead or a place it records as destroyed is active again). Regenerate or update the Codex only if you want it smoothed over.
                      </p>
                      <ul className="space-y-1.5 mb-4">
                        {(selectedChapter.continuityWarnings || []).map((warning, idx) => (
                          <li key={idx} className="text-xs text-rose-200/90 bg-rose-500/10 border-l border-rose-500 rounded-r px-2.5 py-1.5 font-sans flex items-start gap-1.5">
                            <span className="text-rose-400 font-mono select-none">•</span>
                            <span>{warning}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="text-[10px] text-rose-400/60 font-serif italic mb-3">
                        Tip: You can regenerate this chapter with new directives, manually edit the text, or update your living Codex to reconcile the lore.
                      </div>
                      {handleGenerate && (
                        <div className="flex items-center gap-3">
                          <button
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                e.currentTarget.click();
                              }
                            }}
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 hover:border-rose-400 text-rose-200 text-xs font-sc font-bold uppercase tracking-wider rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 size={12} className="animate-spin text-rose-400" />
                                <span>Regenerating...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} className="text-rose-400" />
                                <span>Regenerate Chapter</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!selectedChapter.hasContinuityFaults && (selectedChapter.continuitySoftNotes || []).length > 0 && (
                <div className="mb-6 p-4 border border-slate-500/20 bg-slate-800/20 rounded-lg">
                  <div className="flex items-start gap-2.5">
                    <Info className="text-slate-400/70 shrink-0 mt-0.5" size={16} />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-display font-medium text-slate-300/80 uppercase tracking-wider mb-1">
                        Continuity Note
                      </h4>
                      <p className="text-[11px] text-slate-400/70 font-sans mb-2 leading-relaxed">
                        Just for your awareness — nothing is broken and nothing needs fixing. The Guard noticed a few soft details worth a glance.
                      </p>
                      <ul className="space-y-1">
                        {(selectedChapter.continuitySoftNotes || []).map((note, idx) => (
                          <li key={idx} className="text-[11px] text-slate-400/80 font-sans flex items-start gap-1.5">
                            <span className="text-slate-500 font-mono select-none">•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {showLegend && hasSystemBlocks && (
                <SystemColorLegend 
                  currentPrefs={currentPrefs}
                  handleUpdatePreference={handleUpdatePreference}
                  setShowLegend={setShowLegend}
                />
              )}

              {/* Premium Customizable Chapter Header */}
              <div
                className={`${
                  currentPrefs.fontFamily === "serif"
                    ? "font-serif"
                    : currentPrefs.fontFamily === "sans"
                      ? "font-sans"
                      : "font-mono"
                } text-center mb-12 mt-6`}
              >
                <span className={`font-sc font-semibold text-[10px] tracking-[0.25em] uppercase opacity-70 ${getThemeTextClass(currentPrefs.themeOverride || "void")}`}>
                  {activeStory.title} • Chapter {selectedChapter.number}
                </span>
                <h1 className="font-display font-medium text-2xl sm:text-3xl text-signal mt-2 max-w-2xl mx-auto leading-snug">
                  {selectedChapter.title}
                </h1>

                {renderChapterDivider()}
              </div>

              <div
                className={`${
                  currentPrefs.fontSize === "xs"
                    ? "text-xs"
                    : currentPrefs.fontSize === "sm"
                      ? "text-sm"
                      : currentPrefs.fontSize === "base"
                        ? "text-base"
                        : currentPrefs.fontSize === "lg"
                          ? "text-[17px] sm:text-lg"
                          : "text-lg sm:text-xl"
                } ${
                  currentPrefs.fontFamily === "serif"
                    ? "font-serif"
                    : currentPrefs.fontFamily === "sans"
                      ? "font-sans"
                      : "font-mono"
                } reader-prose w-full mx-auto select-text`}
                lang={readingLanguage}
                dir={getReadingDirection(readingLanguage)}
                style={readerProseStyle}
              >
                {activeTranslationContent
                  ? activeTranslationContent
                      .split("\n\n")
                      .map((paragraph, index) => {
                        if (!paragraph.trim()) return null;
                        const { cleanText, sfxList } =
                          extractSFXCues(paragraph);
                        const autoCueList = collectBlockAutoCues(sfxList);
                        if (!cleanText) return null;
                        const isSystemLine =
                          cleanText.startsWith("[") &&
                          cleanText.endsWith("]");
                        if (isSystemLine) {
                          return (
                            <SystemBlock
                              key={index}
                              id={`para-${index}`}
                              {...anchorAttributes(selectedChapter.number, index, undefined, cleanText)}
                              content={cleanText}
                            />
                          );
                        }

                        return (
                          <div
                            key={index}
                            id={`para-${index}`}
                            {...anchorAttributes(selectedChapter.number, index, undefined, cleanText)}
                            className="group relative transition-all duration-300 border border-transparent rounded-lg p-2.5 -mx-2.5"
                          >
                            <div className="flex items-start">
                              <div className="flex-1 min-w-0">
                                {autoCueList.map((sfx, i) => (
                                  <span
                                    key={`sfx-${index}-${i}`}
                                    className="narrative-trigger hidden"
                                    aria-hidden="true"
                                    data-cue-type="narrative.fx.play"
                                    data-cue-id={`sfx-trans-${selectedChapter.number}-${index}-${i}`}
                                    data-cue-block-index={index}
                                    data-cue-value={sfx}
                                    data-cue-once="true"
                                  />
                                ))}
                                <div
                                  className={`reader-paragraph ${getFocusClass(index)}`}
                                >
                                  {renderProseText(cleanText, index)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  : selectedChapter.blocks
                    ? selectedChapter.blocks.map((block, index) => {
                        const hasStructuredVisual = !!block.system || !!block.worldCard;
                        if (!(block.text || '').trim() && !hasStructuredVisual) return null;
                        const { cleanText, sfxList } = extractSFXCues(
                          block.text || '',
                        );
                        // High-confidence [SFX] tags plus structured
                        // system/beast events; footsteps and environment
                        // Foley never render a trigger span at all.
                        const autoCueList = collectBlockAutoCues(sfxList, block);
                        if (!cleanText && !hasStructuredVisual) return null;

                        const visualCodexTerm = block.metadata?.entities
                          ?.filter(entity => entity.mention === 'reveal')
                          .map(entity => codexHighlighter.resolve(entity.name))
                          .find(matched => Boolean(
                            matched?.entry
                            && (
                              matched.type === 'character'
                              || matched.type === 'artifact'
                              || matched.type === 'location'
                            )
                          ));
                        // Characters cover both Human and Non-Human Portraits.
                        // Bestiary species are not Codex terms here, while
                        // Factions remain highlightable informational records.
                        const resolvedWorldCardTerm = block.worldCard
                          ? codexHighlighter.resolve(block.worldCard.entityName)
                          : undefined;
                        const duplicateVisualSignal = Boolean(
                          visualCodexTerm
                          && block.worldCard
                          && (
                            block.worldCard.codexEntryId === visualCodexTerm.entry.id
                            || resolvedWorldCardTerm?.entry?.id === visualCodexTerm.entry.id
                          )
                        );
                        const systemWorldCard = block.worldCard?.entityType === 'system'
                          || block.worldCard?.entityType === 'fate_event';

                        const isSenMode = readerMode === "sen";
                        const currentParaIdx = currentNarratedBlockIndex;
                        const isPlayerPlaying = isPlayingText || isPausedText;
                        const isRevealed = !isSenMode || !immersion.imagePopups || (!isPlayerPlaying) || index <= (currentParaIdx || 0);

                        let revealCard = null;
                        if (
                          block.worldCard
                          && !duplicateVisualSignal
                          && !systemWorldCard
                          && (!isSenMode || immersion.imagePopups)
                        ) {
                          revealCard = isRevealed ? (
                            <WorldCard
                              key={worldCardPresentationKey}
                              card={block.worldCard}
                              audioAdapter={worldCardAudioAdapter}
                            />
                          ) : null;
                        } else if (visualCodexTerm && (!isSenMode || immersion.imagePopups)) {
                          revealCard = (
                            <CodexCard
                              revealTerm={visualCodexTerm}
                              activeStory={activeStory}
                              isSenMode={isSenMode}
                              isRevealed={isRevealed}
                              generatingRevealId={generatingRevealId}
                              onManifestReveal={handleManifestReveal}
                            />
                          );
                        }

                        const isSystemLine =
                          cleanText.startsWith("[") &&
                          cleanText.endsWith("]");

                        if (isSystemLine || block.system) {
                          return (
                            <React.Fragment key={block.id || `para-${index}`}>
                              {revealCard}
                              <SystemBlock
                                content={cleanText}
                                system={block.system}
                                data-cue-type="narrative.metadata.signature"
                                data-cue-id={
                                  block.id ||
                                  `system-line-${selectedChapter.number}-${index}`
                                }
                                data-cue-metadata={
                                  block.metadata
                                    ? JSON.stringify(block.metadata)
                                    : undefined
                                }
                                data-cue-once="true"
                                {...anchorAttributes(selectedChapter.number, index, block.id, cleanText)}
                                className={`narrative-trigger ${block.metadata ? "metadata-block" : ""}`}
                              />
                            </React.Fragment>
                          );
                        }

                        // Standalone worldCard block with no prose: render only the
                        // card, not an empty paragraph container beneath it.
                        if (!cleanText) {
                          return revealCard ? (
                            <React.Fragment key={block.id || `para-${index}`}>
                              {revealCard}
                            </React.Fragment>
                          ) : null;
                        }

                        const existingBookmark = bookmarkMap.get(index);
                        const isEditingThisBookmark =
                          editingBookmarkParagraphIndex === index;

                        return (
                          <React.Fragment key={block.id || `para-${index}`}>
                            {revealCard}
                            <div
                              id={`para-${index}`}
                              {...anchorAttributes(selectedChapter.number, index, block.id, cleanText)}
                            data-cue-type={
                              block.metadata
                                ? "narrative.metadata.signature"
                                : undefined
                            }
                            data-cue-id={
                              block.id ||
                              `para-${selectedChapter.number}-${index}`
                            }
                            data-cue-metadata={
                              block.metadata
                                ? JSON.stringify(block.metadata)
                                : undefined
                            }
                            data-cue-once="true"
                            className={`relative group paragraph-block transition-colors duration-200 ${existingBookmark ? "custom-bookmark-bg" : ""} ${block.metadata ? "narrative-trigger metadata-block" : ""}`}
                          >
                            {autoCueList.map((sfx, i) => (
                              <span
                                key={`sfx-${index}-${i}`}
                                className="narrative-trigger hidden"
                                aria-hidden="true"
                                data-cue-type="narrative.fx.play"
                                data-cue-id={`sfx-block-${selectedChapter.number}-${index}-${i}`}
                                data-cue-block-index={index}
                                data-cue-value={sfx}
                                data-cue-once="true"
                              />
                            ))}
                            <div className={`reader-paragraph relative ${getFocusClass(index)}`}>
                              {renderProseText(cleanText, index)}
                              <button
                                 tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                                  if (existingBookmark) {
                                    handleRemoveBookmark(
                                      selectedChapter.number,
                                      index,
                                    );
                                  } else {
                                    setEditingBookmarkParagraphIndex(index);
                                    // WORKSHOP: this branch always has no bookmark; the
                                    // source ternary on `existingBookmark` trips
                                    // strict-null narrowing, so set the empty note
                                    // directly (identical runtime behavior).
                                    setBookmarkNoteText("");
                                  }
                                }}
                                className={`inline-block ml-3 align-baseline transition-opacity ${existingBookmark ? "text-gold-accent opacity-100" : "text-neutral-500 opacity-20 md:opacity-0 hover:opacity-100 group-hover:opacity-100"}`}
                                title={
                                  existingBookmark
                                    ? "Remove bookmark"
                                    : "Bookmark this position"
                                }
                              >
                                <BookmarkIcon
                                  size={14}
                                  className={
                                    existingBookmark ? "fill-current" : ""
                                  }
                                />
                              </button>
                            </div>

                            {/* Inline Bookmark Editor */}
                            {isEditingThisBookmark && (
                              <div className="mt-4 p-4 bg-void border border-neutral-800 rounded-lg shadow-xl relative z-20">
                                <textarea
                                  value={bookmarkNoteText}
                                  onChange={(e) =>
                                    setBookmarkNoteText(e.target.value)
                                  }
                                  placeholder="Add a contemplation or heavenly mechanic note here..."
                                  className="w-full bg-neutral-900 border border-neutral-800 rounded p-3 text-sm text-signal placeholder-neutral-600 focus:outline-none focus:border-portal mb-3 min-h-[80px]"
                                />
                                <div className="flex justify-end space-x-2">
                                  <button
                                     tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() =>
                                      setEditingBookmarkParagraphIndex(null)
                                    }
                                    className="px-4 py-1.5 text-xs text-neutral-400 hover:text-signal transition-colors font-mono"
                                    aria-label="Cancel bookmark editing"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleSaveBookmark(
                                        index,
                                        block.text.substring(0, 100) + "...",
                                        bookmarkNoteText,
                                      )
                                    }
                                    className="px-4 py-1.5 text-xs bg-human text-signal rounded hover:bg-void transition-colors font-sans"
                                    aria-label="Save bookmark"
                                  >
                                    Save Bookmark
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Display Saved Bookmark Note (if active) */}
                            {existingBookmark &&
                              existingBookmark.note &&
                              !isEditingThisBookmark && (
                                <div className="mt-2 text-xs font-mono text-gold-accent flex items-start space-x-2 bg-neutral-900/50 p-2 border-l border-gold-accent/50 ml-8">
                                  <span className="opacity-70">Note:</span>
                                  <span className="break-words font-sans italic opacity-90">
                                    {existingBookmark.note}
                                  </span>
                                </div>
                              )}
                          </div>
                        </React.Fragment>
                        );
                      })
                    : (selectedChapter.generatedContent || "")
                        .split("\n\n")
                        .map((paragraph, index) => {
                          if (!paragraph.trim()) return null;
                          const { cleanText, sfxList } =
                            extractSFXCues(paragraph);
                          const autoCueList = collectBlockAutoCues(sfxList);
                          if (!cleanText) return null;
                          const isSystemLine =
                            cleanText.startsWith("[") &&
                            cleanText.endsWith("]");
                          if (isSystemLine) {
                            return (
                              <SystemBlock
                                key={index}
                                id={`para-${index}`}
                                {...anchorAttributes(selectedChapter.number, index, undefined, cleanText)}
                                content={cleanText}
                                data-cue-type="narrative.metadata.signature"
                                data-cue-id={`system-line-${selectedChapter.number}-${index}`}
                                className="narrative-trigger"
                              />
                            );
                          }

                          const existingBookmark = bookmarkMap.get(index);
                          const isEditingThis =
                            editingBookmarkParagraphIndex === index;

                          return (
                            <div
                              key={index}
                              id={`para-${index}`}
                              {...anchorAttributes(selectedChapter.number, index, undefined, cleanText)}
                              data-cue-type="narrative.paragraph.enter"
                              data-cue-id={`para-${selectedChapter.number}-${index}`}
                              data-cue-once="true"
                              className="narrative-trigger group relative transition-all duration-300 border border-transparent hover:bg-neutral-900/5 hover:border-neutral-900/10 rounded-lg p-2.5 -mx-2.5"
                            >
                              <div className="flex items-start">
                                {/* Interactive Left Margin Anchor Rail */}
                                <div className="flex-shrink-0 w-6 flex flex-col items-center justify-start pt-1 mr-2 bg-transparent select-none">
                                  {existingBookmark ? (
                                    <button
                                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => {
                                        setEditingBookmarkParagraphIndex(
                                          index,
                                        );
                                        setBookmarkNoteText(
                                          existingBookmark.note || "",
                                        );
                                      }}
                                      className="text-portal hover:text-gold-accent transition-colors p-1"
                                      title="Engraved Anchor - Edit Note"
                                    >
                                      <BookmarkIcon
                                        size={12}
                                        fill="currentColor"
                                      />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setEditingBookmarkParagraphIndex(
                                          index,
                                        );
                                        setBookmarkNoteText("");
                                      }}
                                      className="opacity-20 md:opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-portal transition-all p-1"
                                      title="Affix Anchor"
                                    >
                                      <Plus size={12} />
                                    </button>
                                  )}
                                </div>

                                {/* Paragraph text */}
                                <div className="flex-1 min-w-0">
                                  {autoCueList.map((sfx, i) => (
                                    <span
                                      key={`sfx-${index}-${i}`}
                                      className="narrative-trigger hidden"
                                      aria-hidden="true"
                                      data-cue-type="narrative.fx.play"
                                      data-cue-id={`sfx-text-${selectedChapter.number}-${index}-${i}`}
                                      data-cue-block-index={index}
                                      data-cue-value={sfx}
                                      data-cue-once="true"
                                    />
                                  ))}
                                  <div
                                    className="reader-paragraph"
                                  >
                                    {renderProseText(cleanText, index)}
                                  </div>
                                </div>
                              </div>

                              {/* Display saved Note under anchored paragraph */}
                              {existingBookmark &&
                                !isEditingThis &&
                                existingBookmark.note && (
                                  <div className="mt-2 ml-8 pl-3 border-l-2 border-portal bg-portal/5 p-2 rounded text-xs text-neutral-350 font-sans italic flex items-start justify-between">
                                    <span>
                                      <span className="font-sc font-semibold text-portal uppercase tracking-wider text-[9px] block not-italic">
                                        Resonance Note:
                                      </span>
                                      {existingBookmark.note}
                                    </span>
                                    <button
                                       tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={() =>
                                        handleRemoveBookmark(
                                          selectedChapter.number,
                                          index,
                                        )
                                      }
                                      className="text-neutral-550 hover:text-red-500 p-1 opacity-40 md:opacity-0 group-hover:opacity-100 transition-opacity"
                                      title="Release Anchor"
                                      aria-label="Release Anchor"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                )}

                              {/* Editing Panel (Inline) */}
                              {isEditingThis && (
                                <div className="mt-3 ml-8 p-3 bg-neutral-950 border border-neutral-900 rounded space-y-2">
                                  <span className="text-[10px] font-sc text-portal uppercase tracking-wider block font-bold">
                                    {existingBookmark
                                      ? "Edit Aetherial Resonance"
                                      : "Engrave Aetherial Resonance"}
                                  </span>
                                  <input
                                    type="text"
                                    value={bookmarkNoteText}
                                    onChange={(e) =>
                                      setBookmarkNoteText(e.target.value)
                                    }
                                    placeholder="Type an insightful note, prediction, or timeline event..."
                                    className="w-full bg-void text-xs text-signal border border-neutral-850 focus:border-portal p-2 rounded focus:outline-none"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleSaveBookmark(
                                          index,
                                          paragraph,
                                          bookmarkNoteText,
                                        );
                                      }
                                    }}
                                  />
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] text-neutral-500 font-mono">
                                      Press Enter to engrave
                                    </span>
                                    <div className="flex space-x-2">
                                      {existingBookmark && (
                                        <button
                                          onClick={() => {
                                            handleRemoveBookmark(
                                              selectedChapter.number,
                                              index,
                                            );
                                            setEditingBookmarkParagraphIndex(
                                              null,
                                            );
                                          }}
                                          className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest text-red-500 hover:bg-neutral-900"
                                          aria-label="Release bookmark"
                                        >
                                          Release
                                        </button>
                                      )}
                                      <button
                                        onClick={() =>
                                          setEditingBookmarkParagraphIndex(
                                            null,
                                          )
                                        }
                                        className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest text-neutral-550 hover:bg-neutral-900"
                                        aria-label="Cancel bookmark editing"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        onClick={() =>
                                          handleSaveBookmark(
                                            index,
                                            paragraph,
                                            bookmarkNoteText,
                                          )
                                        }
                                        className="px-3 py-1 text-[10px] uppercase font-bold tracking-widest bg-portal text-void font-sc rounded hover:brightness-110"
                                        aria-label="Save bookmark"
                                      >
                                        Save
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
              </div>
              
            </motion.div>
          </AnimatePresence>

          <ContextInspector manifest={selectedChapter.contextManifest} />

          {/* Navigation links at bottom of chapter */}
          <div className="flex items-center justify-between border-t border-neutral-900 pt-8 mt-16 pb-8">
            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={navigatePrev}
              disabled={selectedChapterNum === 1}
              className="px-6 py-2 rounded-full border border-neutral-800 hover:border-gold-accent text-neutral-400 hover:text-gold-accent disabled:opacity-20 transition-all font-sc uppercase text-[10px] tracking-wider flex items-center space-x-2"
            >
              <ArrowLeft size={14} />
              <span>Previous</span>
            </button>

            {handleSealChapter &&
              !selectedChapter.isSealed &&
              (!!selectedChapter.generatedContent || !!(selectedChapter.blocks && selectedChapter.blocks.length > 0)) && (
                <button
                   tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleSealClick}
                  disabled={isCheckingConsistency}
                  className="px-6 py-2 rounded-full border border-portal bg-portal/10 hover:bg-portal hover:text-void text-portal transition-all font-sc uppercase text-[10px] tracking-wider flex items-center space-x-2 shadow-[0_0_10px_rgba(4,172,255,0.15)] mx-auto disabled:opacity-50"
                >
                  {isCheckingConsistency ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  <span className="hidden sm:inline">
                    {isCheckingConsistency ? "Guarding Continuity..." : "Seal Chapter (Publish)"}
                  </span>
                  <span className="sm:hidden">{isCheckingConsistency ? "..." : "Publish"}</span>
                </button>
              )}

            <button
               tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={navigateNext}
              disabled={selectedChapterNum === maxChapterNum}
              className="px-6 py-2 rounded-full border border-neutral-800 hover:border-gold-accent text-neutral-400 hover:text-gold-accent disabled:opacity-20 transition-all font-sc uppercase text-[10px] tracking-wider flex items-center space-x-2"
            >
              <span>Next</span>
              <ArrowRight size={14} />
            </button>
          </div>
          {isCompletedBatchEndpoint && (
            <div className="pb-8 flex flex-col items-center gap-2">
              <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider">Batch complete — choose the next fate.</p>
              <button
                type="button"
                onClick={handleGenerateNextFive}
                disabled={isGenerating}
                className="px-6 py-3 rounded border border-human text-human hover:bg-human/10 disabled:opacity-50 font-sc font-bold uppercase tracking-widest text-xs transition-colors"
              >
                Manifest Next 5 Chapters
              </button>
            </div>
          )}
        </>
      ) : isGenerating || selectedChapter.hasContent ? (
        <div className="max-w-2xl mx-auto py-12 animate-pulse space-y-6">
          <div className="space-y-4">
            <div className="h-3 bg-neutral-800/50 rounded w-[85%]"></div>
            <div className="h-3 bg-neutral-800/50 rounded w-full"></div>
            <div className="h-3 bg-neutral-800/50 rounded w-full"></div>
            <div className="h-3 bg-neutral-800/50 rounded w-[60%]"></div>
          </div>

          <div className="pt-8 space-y-4">
            <div className="h-3 bg-neutral-800/50 rounded w-full"></div>
            <div className="h-3 bg-neutral-800/50 rounded w-[90%]"></div>
            <div className="h-3 bg-neutral-800/50 rounded w-full"></div>
            <div className="h-3 bg-neutral-800/50 rounded w-[75%]"></div>
          </div>

          <div className="pt-8 space-y-4">
            <div className="h-3 bg-neutral-800/50 rounded w-[80%]"></div>
            <div className="h-3 bg-neutral-800/50 rounded w-full"></div>
            <div className="h-3 bg-neutral-800/50 rounded w-[70%]"></div>
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-24">
          <div className="p-4 bg-void rounded-full border border-gold-accent/30 text-gold-accent mb-4 animate-pulse">
            <Sparkles size={32} />
          </div>
          <h3 className="font-sc font-bold text-signal text-lg uppercase tracking-widest mb-2">
            Unmanifested Segment
          </h3>
          <p className="font-serif italic text-neutral-500 mb-8 max-w-sm ml-auto mr-auto text-center px-4">
            "{selectedChapter.premise}"
          </p>
          <button
             tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.currentTarget.click(); } }} onClick={handleGenerate}
            disabled={isGenerating}
            className={`group relative w-full px-6 py-3.5 bg-void border border-human text-human text-xs sm:text-sm font-sc font-bold uppercase tracking-widest rounded shadow-[0_0_20px_rgba(139,0,0,0.4),inset_0_0_15px_rgba(139,0,0,0.2)] hover:shadow-[0_0_30px_rgba(139,0,0,0.6),inset_0_0_25px_rgba(139,0,0,0.4)] hover:bg-human/10 hover:text-signal transition-all duration-500 overflow-hidden flex items-center justify-center space-x-2 ${
              isGenerating ? "opacity-65 cursor-not-allowed" : ""
            }`}
          >
            {!isGenerating && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-human/10 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-1000 ease-in-out" />
            )}
            {isGenerating ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear",
                  }}
                  className="w-4 h-4 border-2 border-human border-t-transparent rounded-full shrink-0"
                />
                <span>
                  {activeAgentId === "versa"
                    ? "VERSA is shaping..."
                    : activeAgentId === "scout"
                      ? "SCOUT is scanning..."
                      : "Condensing Narrative..."}
                </span>
              </>
            ) : (
              <>
                <Sparkles
                  size={14}
                  className="relative z-10 group-hover:animate-pulse"
                />
                <span className="relative z-10 drop-shadow-[0_0_8px_rgba(139,0,0,0.6)]">
                  Manifest
                </span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleGenerateNextFive}
            disabled={isGenerating}
            className="mt-3 w-full px-6 py-3 rounded border border-portal text-portal hover:bg-portal/10 disabled:opacity-50 font-sc font-bold uppercase tracking-widest text-xs transition-colors"
          >
            {isResumingAtSelectedChapter ? 'Resume 5-Chapter Batch' : 'Manifest Next 5 Chapters'}
          </button>
        </div>
      )}
      </article>
    </div>
  );
}
