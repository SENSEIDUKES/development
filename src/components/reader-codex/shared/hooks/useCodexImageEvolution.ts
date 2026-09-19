import { useEffect, useRef, useState } from 'react';
import { useReaderRuntime } from '../../../../narrative/readerRuntime';
import { generateId } from '../../../../narrative/id';
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

/** New Codex artwork is owned only by the four visual categories. */
export type CodexImageEntityType = 'character' | 'location' | 'artifact';
/** Legacy values remain readable so existing media history is not migrated away. */
export type CodexImageHistoryEntityType = CodexImageEntityType | 'creature' | 'beast' | 'faction';

export interface CodexImagePreview {
  urls: string[];
  prompt: string;
  selectedIndex: number;
  type: CodexImageEntityType;
}

type EvolvableEntry = Character | Location | Artifact | Faction;

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
 * Portable image preview, selection, history and restoration.
 * The optional host image port supplies content; SEN owns no generation provider.
 */
export function useCodexImageEvolution(
  memory: StoryMemory,
  activeStory: StoryWorld,
  updateStoryFields: UpdateStoryFields,
  _routingConfig: MultiModelRouting | undefined,
  pushNotification: (message: string) => void,
) {
  const runtime = useReaderRuntime();
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, CodexImagePreview>>({});
  const requestEpoch = useRef(0);
  const inFlight = useRef(false);
  useEffect(() => {
    setPreviews({});
    setGeneratingId(null);
    setGenerationError(null);
    inFlight.current = false;
    return () => { requestEpoch.current += 1; };
  }, [activeStory.id]);

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
    else setGenerationError('That manifestation is no longer available in this story.');
  };

  const handleAwakenCardImage = async (
    id: string,
    type: CodexImageEntityType,
    entity: EvolvableEntry,
  ) => {
    if (inFlight.current) return;
    const epoch = requestEpoch.current;
    inFlight.current = true;
    setGeneratingId(id);
    setGenerationError(null);
    try {
      if (!runtime.manifestImages) throw new Error('The host has not enabled image manifestation.');
      const result = await runtime.manifestImages({ storyId: activeStory.id, id, name: entity.name, description: entity.description, type });
      if (requestEpoch.current !== epoch) return;
      if (!result.urls.length) throw new Error('No images were returned.');
      setPreviews((current) => ({
        ...current,
        [id]: {
          urls: result.urls,
          prompt: result.prompt,
          selectedIndex: 0,
          type,
        },
      }));
    } catch (error) {
      if (requestEpoch.current === epoch) setGenerationError(error instanceof Error ? error.message : 'Unable to prepare an image.');
    } finally {
      if (requestEpoch.current === epoch) {
        inFlight.current = false;
        setGeneratingId(null);
      }
    }
  };

  const handleSaveEvolution = async (id: string, type: CodexImageEntityType) => {
    const preview = previews[id];
    const selectedUrl = preview?.urls[preview.selectedIndex];
    if (!preview || !selectedUrl) return;

    const historyId = generateId();
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
      setGenerationError('That Codex entry is no longer available in this story.');
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
