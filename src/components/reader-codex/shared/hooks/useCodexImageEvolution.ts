import { useState } from 'react';
import type {
  Artifact,
  Character,
  Faction,
  GeneratedImage,
  Location,
  MultiModelRouting,
  StoryMemory,
  StoryWorld,
  UpdateStoryFields,
} from '../types';

export type CodexImageEntityType = 'character' | 'location' | 'artifact' | 'beast';
export type CodexImageHistoryEntityType = CodexImageEntityType | 'faction';

export interface CodexImagePreview {
  urls: string[];
  prompt: string;
  selectedIndex: number;
  type: CodexImageEntityType;
}

type EvolvableEntry = Character | Location | Artifact | Faction;

const xmlEscape = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}[character] || character));

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const makeWorkshopManifestation = (
  id: string,
  name: string,
  type: CodexImageEntityType,
  variant: number,
): string => {
  const hue = (hashText(`${id}:${type}`) + variant * 47) % 360;
  const safeName = xmlEscape(name || 'Unknown Entry');
  const safeType = xmlEscape(type.toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024"><defs><radialGradient id="a" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="hsl(${hue} 76% 34%)"/><stop offset="0.55" stop-color="hsl(${(hue + 38) % 360} 60% 13%)"/><stop offset="1" stop-color="#050507"/></radialGradient><filter id="g"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="768" height="1024" fill="url(#a)"/><circle cx="384" cy="380" r="190" fill="none" stroke="hsla(${hue} 90% 72% / .35)" stroke-width="3"/><circle cx="384" cy="380" r="145" fill="hsla(${(hue + 45) % 360} 85% 70% / .08)" filter="url(#g)"/><path d="M190 770 Q384 530 578 770" fill="hsla(${hue} 35% 8% / .72)" stroke="hsla(${hue} 80% 70% / .2)"/><text x="384" y="850" text-anchor="middle" fill="#f4f4f5" font-family="serif" font-size="36" letter-spacing="3">${safeName}</text><text x="384" y="895" text-anchor="middle" fill="hsl(${hue} 75% 72%)" font-family="monospace" font-size="16" letter-spacing="7">${safeType} · FORM ${variant + 1}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const readCollection = (
  memory: StoryMemory,
  type: CodexImageHistoryEntityType,
): EvolvableEntry[] => {
  if (type === 'location') return memory.locations || [];
  if (type === 'artifact') return memory.artifacts || [];
  if (type === 'faction') return memory.factions || [];
  return memory.characters || [];
};

/**
 * Generated Reader sessions start from intentionally sparse chapter snapshots.
 * ReaderCodex supplies stable view-time IDs for those records; prefer the
 * current story memory when it already contains the rendered ID, otherwise
 * apply the local edit to that normalized view so the first write can persist.
 */
const writableMemoryForEntry = (
  currentMemory: StoryMemory,
  normalizedMemory: StoryMemory,
  id: string,
  type: CodexImageHistoryEntityType,
): StoryMemory | null => {
  if (readCollection(currentMemory, type).some((entry) => entry.id === id)) {
    return currentMemory;
  }
  if (readCollection(normalizedMemory, type).some((entry) => entry.id === id)) {
    return normalizedMemory;
  }
  return null;
};

const updateEntry = (
  memory: StoryMemory,
  id: string,
  type: CodexImageHistoryEntityType,
  updater: (entry: EvolvableEntry) => EvolvableEntry,
): StoryMemory => {
  if (type === 'location') {
    return { ...memory, locations: (memory.locations || []).map((entry) => (
      entry.id === id ? updater(entry) as Location : entry
    )) };
  }
  if (type === 'artifact') {
    return { ...memory, artifacts: (memory.artifacts || []).map((entry) => (
      entry.id === id ? updater(entry) as Artifact : entry
    )) };
  }
  if (type === 'faction') {
    return { ...memory, factions: (memory.factions || []).map((entry) => (
      entry.id === id ? updater(entry) as Faction : entry
    )) };
  }
  return { ...memory, characters: (memory.characters || []).map((entry) => (
    entry.id === id ? updater(entry) as Character : entry
  )) };
};

/**
 * API-compatible Workshop image-evolution hook. It preserves preview,
 * selection, save, discard, history, and revert behavior using deterministic
 * local SVG manifestations; no quota, auth, provider, Firebase, R2, or API
 * path is consulted.
 */
export function useCodexImageEvolution(
  memory: StoryMemory,
  activeStory: StoryWorld,
  updateStoryFields: UpdateStoryFields,
  _routingConfig: MultiModelRouting | undefined,
  pushNotification: (message: string) => void,
) {
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, CodexImagePreview>>({});

  const handleRevertImage = async (
    id: string,
    type: CodexImageHistoryEntityType,
    historyId: string,
  ) => {
    setGenerationError(null);
    let restored = false;
    await updateStoryFields(activeStory.id, (current) => {
      const currentMemory = writableMemoryForEntry(current.memory || memory, memory, id, type);
      if (!currentMemory) return {};
      const selected = readCollection(currentMemory, type)
        .find((entry) => entry.id === id)
        ?.imageHistory?.find((image) => image.id === historyId);
      if (!selected?.imageUrl?.trim()) return {};
      restored = true;
      return {
        memory: updateEntry(currentMemory, id, type, (entry) => ({
          ...entry,
          imageUrl: selected.imageUrl,
          imageAssetId: selected.assetId,
          imageHistory: (entry.imageHistory || []).map((image) => ({
            ...image,
            isCurrent: image.id === historyId,
          })),
        })),
      };
    });
    if (restored) pushNotification('Previous manifestation restored.');
    else setGenerationError('That manifestation is no longer available in this Workshop story.');
  };

  const handleAwakenCardImage = async (
    id: string,
    type: CodexImageEntityType,
    entity: EvolvableEntry,
  ) => {
    setGeneratingId(id);
    setGenerationError(null);
    try {
      await Promise.resolve();
      const prompt = `${type} manifestation for ${entity.name}: ${entity.description}`;
      setPreviews((current) => ({
        ...current,
        [id]: {
          urls: [0, 1, 2].map((variant) => (
            makeWorkshopManifestation(id, entity.name, type, variant)
          )),
          prompt,
          selectedIndex: 0,
          type,
        },
      }));
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : 'Unable to form a local preview.');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleSaveEvolution = async (id: string, type: CodexImageEntityType) => {
    const preview = previews[id];
    const selectedUrl = preview?.urls[preview.selectedIndex];
    if (!preview || !selectedUrl) return;

    const historyId = `workshop-${id}-${activeStory.currentChapterNumber}-${preview.selectedIndex}`;
    const historyItem: GeneratedImage = {
      id: historyId,
      entityId: id,
      entityType: type,
      imageUrl: selectedUrl,
      promptUsed: preview.prompt,
      createdAt: new Date().toISOString(),
      isCurrent: true,
      chapterNumber: activeStory.currentChapterNumber,
    };

    let saved = false;
    await updateStoryFields(activeStory.id, (current) => {
      const currentMemory = writableMemoryForEntry(current.memory || memory, memory, id, type);
      if (!currentMemory) return {};
      saved = true;
      return {
        memory: updateEntry(currentMemory, id, type, (entry) => ({
          ...entry,
          imageUrl: selectedUrl,
          imageHistory: (entry.imageHistory || [])
            .filter((image) => image.id !== historyId)
            .map((image) => ({ ...image, isCurrent: false }))
            .concat(historyItem),
          evolutionReady: false,
          availableVisualUpdate: false,
          lastImageChapter: activeStory.currentChapterNumber,
          arcAccumulation: undefined,
        })),
      };
    });

    if (!saved) {
      setGenerationError('That Codex entry is no longer available in this Workshop story.');
      return;
    }

    setPreviews((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    pushNotification('Evolution successfully bonded to the local Codex.');
  };

  const handleDiscardPreview = (id: string) => {
    setPreviews((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  return {
    generatingId,
    generationError,
    setGenerationError,
    previews,
    setPreviews,
    handleRevertImage,
    handleAwakenCardImage,
    handleSaveEvolution,
    handleDiscardPreview,
  };
}
