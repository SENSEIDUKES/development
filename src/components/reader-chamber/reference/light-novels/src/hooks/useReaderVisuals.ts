import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useImageManifest } from './useImageManifest';
import { ReaderChapter, StoryWorld } from '../types';
import { dispatchNarrativeCue, NarrativeCueEventType } from '../lib/narrativeCues';
import { cinematicEffectGovernor } from '../lib/effects/cinematicEffectGovernor';
import { isHighConfidenceAutoCue } from '../lib/audio/autoCuePolicy';
import { useAudioMix } from './audio/useAudioMix';
import { collectCodexTerms } from '../lib/codexHighlighting';
import { assessMomentousChapter, toMomentousChapterSignals } from '../lib/chapterMomentousness';

export function useReaderVisuals({
  selectedChapter,
  activeStory,
  readerMode,
}: {
  selectedChapter: ReaderChapter;
  activeStory: StoryWorld;
  readerMode: string;
}) {
  const [generatingRevealId, setGeneratingRevealId] = useState<string | null>(null);
  const immersion = useAppStore((state) => state.immersion);
  const { mix: audioMix } = useAudioMix();
  const { manifestImage, manifestChapterHero, generatingIds } = useImageManifest();

  // Which chapters deserve momentous treatment is a domain decision owned by
  // `lib/chapterMomentousness`. This hook coordinates visuals and effects; it
  // does not weight generation signals, so it reads no cue or block scoring
  // field here — only the arc structure needed to locate the chapter.
  const momentousAssessment = useMemo(() => {
    if (!activeStory || !selectedChapter || !Array.isArray(activeStory.arcs)) return null;

    // Legacy and partially hydrated stories can carry a missing or non-array
    // chapter collection. The contract itself tolerates that, so guarding the
    // lookup keeps the whole path graceful instead of throwing during render.
    const currentArc = activeStory.arcs.find(
      a => Array.isArray(a?.chapters) && a.chapters.some(c => c?.number === selectedChapter.number),
    );
    if (!currentArc) return null;

    return assessMomentousChapter(
      { chapters: currentArc.chapters.map(toMomentousChapterSignals) },
      selectedChapter.number,
    );
  }, [activeStory, selectedChapter]);

  const isMomentousChapter = momentousAssessment?.isMomentous ?? false;

  const triggerHeroGeneration = () => {
    if (!isMomentousChapter || !activeStory || !selectedChapter) return;
    if (
      selectedChapter.heroImageAssetId
      || selectedChapter.assetManifest?.heroImage
      || generatingIds.has(`chapter-hero-${selectedChapter.number}`)
    ) return;
    
    const currentArc = activeStory.arcs.find(a => a.chapters.some(c => c.number === selectedChapter.number));
    if (!currentArc) return;
    
    const existingHeroImagesCount = currentArc.chapters.filter(
      chapter => chapter.heroImageAssetId || chapter.assetManifest?.heroImage,
    ).length;
    if (existingHeroImagesCount >= 3) return;
    
    const promptText = `A cinematic visual memory of the defining moment that just happened: ${selectedChapter.summary || 'A critical climactic climax in the story.'} Render as a vivid frozen memory capturing the emotional core and exact action of the moment.`;
    manifestChapterHero(selectedChapter.number, promptText).catch(e => console.error("Hero generation failed:", e));
  };

  const handleManifestReveal = async (entry: any, type: string) => {
    if (generatingRevealId) return;
    setGeneratingRevealId(entry.id);
    try {
      await manifestImage(entry, type);
    } catch (err: any) {
      console.error("Failed to manifest reveal card auras:", err);
      useAppStore.getState().setAppError(err.message || "Celestial alignment gate failed to synchronize imagery.");
    } finally {
      setGeneratingRevealId(null);
    }
  };

  // IntersectionObserver for narrative cues
  useEffect(() => {
    if (readerMode === "sen") return;
    const targets = document.querySelectorAll(".narrative-trigger");
    const observer = new window.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const type = entry.target.getAttribute("data-cue-type") as NarrativeCueEventType;
            const cueId = entry.target.getAttribute("data-cue-id");
            if (type && cueId) {
              let parsedValue: unknown = entry.target.getAttribute("data-cue-value") || undefined;
              let parsedMeta: unknown = undefined;

              const metaRaw = entry.target.getAttribute("data-cue-metadata");
              if (metaRaw) {
                try {
                  parsedMeta = JSON.parse(metaRaw);
                  parsedValue = parsedValue || parsedMeta;
                } catch {}
              }

              if (typeof parsedValue === "string") {
                try {
                  parsedValue = JSON.parse(parsedValue);
                } catch {}
              }

              // Metadata cues feed the visual popups AND the continuous
              // audio layers (scene music, atmosphere bed), so they must
              // flow if any of those is on; each consumer applies its own
              // switch. They are deliberately NOT governed — atmosphere and
              // scene-score music keep working in every reader mode.
              const audioMetadataOn =
                audioMix.master.enabled && (audioMix.music.enabled || audioMix.atmosphere.enabled);
              const metadataConsumersOff = !immersion.imagePopups && !audioMetadataOn;
              if (type.startsWith("narrative.metadata") && metadataConsumersOff) return;

              // One-shot audio cues are cinematic punctuation: the governor
              // only grants them in TTS/listen or cinematic-scroll modes
              // (never plain manual reading) and enforces the per-chapter
              // count / zone-spread / cooldown budget.
              if (type.startsWith("narrative.fx")) {
                if (!audioMix.master.enabled || !audioMix.cues.enabled) return;
                // Only high-confidence canonical cues may spend governor
                // budget; anything else (stale spans, legacy footsteps
                // values) is suppressed before the request.
                if (typeof parsedValue !== "string" || !isHighConfidenceAutoCue(parsedValue)) {
                  return;
                }
                const blockIndexRaw = entry.target.getAttribute("data-cue-block-index");
                const blockIndex = blockIndexRaw != null ? parseInt(blockIndexRaw, 10) : NaN;
                const granted = cinematicEffectGovernor.requestAudioCue({
                  id: cueId,
                  chapterNumber: selectedChapter?.number ?? 0,
                  blockIndex: Number.isFinite(blockIndex) ? blockIndex : undefined,
                  totalBlocks:
                    selectedChapter?.blocks?.length ||
                    selectedChapter?.generatedContent?.split("\n\n").length ||
                    undefined,
                });
                if (!granted) return;
              }

              dispatchNarrativeCue({
                id: cueId,
                type,
                once: !!entry.target.getAttribute("data-cue-once"),
                value: parsedValue,
                metadata: parsedMeta,
              });
            }
          }
        });
      },
      { threshold: 0.5 },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [
    selectedChapter?.number,
    activeStory?.currentChapterNumber,
    selectedChapter?.generatedContent,
    selectedChapter?.blocks,
    readerMode,
    immersion.imagePopups,
    audioMix,
  ]);

  // Codex terms memo for semantic highlighting.
  //
  // Every named Codex entity — and every alias it was persisted with — is
  // highlighted and hovercard-linked. This used to be gated on
  // isManifestationEligible, which decides whether an entity deserves a
  // *generated portrait*: a far stricter, unrelated policy. Portrait
  // eligibility is enforced where portraits are actually offered, not here.
  const codexTerms = useMemo(
    () => collectCodexTerms(activeStory?.memory),
    [activeStory?.memory],
  );

  return {
    handleManifestReveal,
    generatingRevealId,
    codexTerms,
    manifestChapterHero,
    generatingIds,
    isMomentousChapter,
    triggerHeroGeneration
  };
}
