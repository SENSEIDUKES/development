import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { secureStorage } from '../lib/encryption';
import { checkAndConsumeImageQuota } from '../lib/quota';
import { generateId, generateUUID } from '../lib/id';
import {
  MEDIA_PURPOSE,
  MEDIA_TARGET_KIND,
  requirePersistenceUuid,
  saveMediaAsset,
} from '../lib/media/mediaAssetClient';
import {
  discardCachedMedia,
  resolveMediaAssetForDisplay,
} from '../lib/media/privateMediaResolver';
import { auth } from '../lib/firebase';
import { retainLocalMediaDescriptor } from '../lib/media/localMediaDescriptors';
import { isSameAssetId } from '../contracts/assetIdentity';

function committedMediaDeliveryError(label: string, cause: unknown): Error {
  const detail = cause instanceof Error ? ` ${cause.message}` : '';
  return new Error(
    `The ${label} was saved permanently, but its image could not be loaded yet.${detail}`,
  );
}

export function useImageManifest() {
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const stories = useAppStore(state => state.stories);
  const activeStoryId = useAppStore(state => state.activeStoryId);
  const saveStories = useAppStore(state => state.saveStories);
  const routingConfig = useAppStore(state => state.routingConfig);

  const manifestImage = async (entry: any, type: string) => {
    if (generatingIds.has(entry.id)) return;
    const initiatingUserId = auth.currentUser?.uid ?? null;
    const accountIsCurrent = () =>
      (auth.currentUser?.uid ?? null) === initiatingUserId;
    const activeStory = stories.find(s => s.id === activeStoryId);
    if (!activeStory) return;
    if (activeStory.userId && activeStory.userId !== initiatingUserId) return;

    setGeneratingIds(prev => new Set(prev).add(entry.id));
    
    try {
      await checkAndConsumeImageQuota();
      if (!accountIsCurrent()) return;

      const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const gemini = await secureStorage.getItem('@seihouse/api-key-gemini');
      if (!accountIsCurrent()) return;
      const openrouter = await secureStorage.getItem('@seihouse/api-key-openrouter');
      if (!accountIsCurrent()) return;
      const ollama = await secureStorage.getItem('@seihouse/api-key-ollama-host');
      if (!accountIsCurrent()) return;
      if (gemini) apiHeaders['x-gemini-key'] = gemini;
      if (openrouter) apiHeaders['x-openrouter-key'] = openrouter;
      if (ollama) apiHeaders['x-ollama-host'] = ollama;

      const res = await fetch('/api/generate-card-image', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          prompt: `${entry.name}. ${entry.description}`,
          type,
          routingConfig
        })
      });
      if (!accountIsCurrent()) return;

      const data = await res.json();
      if (!accountIsCurrent()) return;
      if (!res.ok) {
        throw new Error(data.error || "Aetherial alignment gate failed to synchronize imagery.");
      }

      let newImageUrls = data.imageUrls;
      if (!newImageUrls && data.imageUrl) newImageUrls = [data.imageUrl];
      if (!newImageUrls && data.fallbackUrl) newImageUrls = [data.fallbackUrl];

      if (!newImageUrls || newImageUrls.length === 0) {
        throw new Error("No imagery frames returned.");
      }
      let selectedUrl = newImageUrls[0];

      if (activeStory) {
        const id = entry.id;
        const currentChapterNumber = activeStory.currentChapterNumber || 1;
        const legacyMediaId = generateId(8);
        const storyPersistenceId = requirePersistenceUuid(
          activeStory.persistenceId ?? activeStory.id,
          'Story',
        );
        const entityPersistenceId = requirePersistenceUuid(
          entry.persistenceId ?? entry.id,
          `${type} entity`,
        );
        const targetKindByType: Record<string, string> = {
          character: MEDIA_TARGET_KIND.CHARACTER,
          beast: MEDIA_TARGET_KIND.BEAST,
          location: MEDIA_TARGET_KIND.LOCATION,
          artifact: MEDIA_TARGET_KIND.ARTIFACT,
          faction: MEDIA_TARGET_KIND.FACTION,
        };
        const targetKind = targetKindByType[type];
        if (!targetKind) throw new Error(`Unsupported manifestation type: ${type}`);
        const promptUsed = `${entry.name}. ${entry.description}`;
        const asset = await saveMediaAsset({
          source: selectedUrl,
          assetType: 'IMAGE',
          purpose: MEDIA_PURPOSE.MANIFESTATION,
          association: {
            targetKind,
            // The media slot is keyed by (owner, targetKind, targetKey,
            // purpose) and the server requires the canonical relational id.
            // A story-local stable key was rejected outright, and two stories
            // owned by the same account can reuse the same stable key, so it
            // could never have addressed one slot either.
            targetKey: entityPersistenceId,
            storyId: storyPersistenceId,
            entityId: entityPersistenceId,
            legacyMediaId,
            entityType: type,
            promptUsed,
            chapterNumber: currentChapterNumber,
          },
          replacesAssetId: entry.imageAssetId,
          idempotencyKey: generateUUID(),
          expectedOwnerUid: initiatingUserId ?? undefined,
        });
        if (!accountIsCurrent()) return;
        let deliveryFailure: unknown;
        try {
          selectedUrl = (
            await resolveMediaAssetForDisplay(
              asset,
              initiatingUserId ?? undefined,
            )
          ).url;
          if (!selectedUrl.trim()) {
            deliveryFailure = new Error(
              'The permanent media service returned an empty delivery URL.',
            );
          }
        } catch (error) {
          if (!accountIsCurrent()) return;
          selectedUrl = '';
          deliveryFailure = error;
        }
        if (!accountIsCurrent()) return;
        if (
          entry.imageAssetId
          && !isSameAssetId(entry.imageAssetId, asset.id)
        ) {
          await discardCachedMedia(entry.imageAssetId);
          if (!accountIsCurrent()) return;
        }
        const newHistoryItem = {
          id: legacyMediaId,
          assetId: asset.id,
          assetVersion: asset.version,
          checksumSha256: asset.checksumSha256,
          deliveryUrlExpiresAt: asset.deliveryUrlExpiresAt ?? undefined,
          entityId: id,
          entityType: type as any,
          imageUrl: selectedUrl,
          promptUsed,
          createdAt: new Date().toISOString(),
          isCurrent: true,
          chapterNumber: currentChapterNumber
        };

        await saveStories(currentStories => currentStories.map(s => {
          if (s.id !== activeStoryId) return s;
          const memory = s.memory;
          const updatedMemory = { ...memory };
          if (type === 'character') {
            updatedMemory.characters = memory.characters.map((c: any) =>
              c.id === id ? {
                ...c,
                persistenceId: entityPersistenceId,
                imageAssetId: asset.id,
                imageUrl: selectedUrl,
                imageHistory: (c.imageHistory || [])
                  .map((img: any) => ({ ...img, isCurrent: false }))
                  .concat(newHistoryItem),
              } : c
            );
          } else if (type === 'location') {
            updatedMemory.locations = (memory.locations || []).map((l: any) =>
              l.id === id ? {
                ...l,
                persistenceId: entityPersistenceId,
                imageAssetId: asset.id,
                imageUrl: selectedUrl,
                imageHistory: (l.imageHistory || [])
                  .map((img: any) => ({ ...img, isCurrent: false }))
                  .concat(newHistoryItem),
              } : l
            );
          } else if (type === 'artifact') {
            updatedMemory.artifacts = (memory.artifacts || []).map((a: any) =>
              a.id === id ? {
                ...a,
                persistenceId: entityPersistenceId,
                imageAssetId: asset.id,
                imageUrl: selectedUrl,
                imageHistory: (a.imageHistory || [])
                  .map((img: any) => ({ ...img, isCurrent: false }))
                  .concat(newHistoryItem),
              } : a
            );
          } else if (type === 'beast') {
            updatedMemory.characters = memory.characters.map((c: any) =>
              c.id === id ? {
                ...c,
                persistenceId: entityPersistenceId,
                imageAssetId: asset.id,
                imageUrl: selectedUrl,
                imageHistory: (c.imageHistory || [])
                  .map((img: any) => ({ ...img, isCurrent: false }))
                  .concat(newHistoryItem),
              } : c
            );
          } else if (type === 'faction') {
            updatedMemory.factions = (memory.factions || []).map((f: any) =>
              f.id === id ? {
                ...f,
                persistenceId: entityPersistenceId,
                imageAssetId: asset.id,
                imageUrl: selectedUrl,
                imageHistory: (f.imageHistory || [])
                  .map((img: any) => ({ ...img, isCurrent: false }))
                  .concat(newHistoryItem),
              } : f
            );
          }
          return {
            ...s,
            persistenceId: storyPersistenceId,
            memory: updatedMemory,
            mediaDescriptors: retainLocalMediaDescriptor(
              s.mediaDescriptors,
              asset,
            ),
            updatedAt: new Date().toISOString(),
          };
        }));
        if (!accountIsCurrent()) return;
        if (deliveryFailure) {
          throw committedMediaDeliveryError('manifestation', deliveryFailure);
        }
      }
      
      if (!accountIsCurrent()) return;
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
      return selectedUrl;
    } catch (err: any) {
      if (!accountIsCurrent()) return;
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
      window.dispatchEvent(new CustomEvent('seihouse-toast', { 
        detail: { 
          title: "Manifestation Collapse", 
          message: err.message, 
          type: "error" 
        }
      }));
      throw err;
    }
  };

  const manifestChapterHero = async (chapterNumber: number, promptText: string) => {
    const genId = `chapter-hero-${chapterNumber}`;
    if (generatingIds.has(genId)) return;
    const initiatingUserId = auth.currentUser?.uid ?? null;
    const accountIsCurrent = () =>
      (auth.currentUser?.uid ?? null) === initiatingUserId;
    const activeStory = stories.find(s => s.id === activeStoryId);
    if (!activeStory) return;
    if (activeStory.userId && activeStory.userId !== initiatingUserId) return;

    setGeneratingIds(prev => new Set(prev).add(genId));
    
    try {
      await checkAndConsumeImageQuota({ automatic: true });
      if (!accountIsCurrent()) return;

      const apiHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const gemini = await secureStorage.getItem('@seihouse/api-key-gemini');
      if (!accountIsCurrent()) return;
      const openrouter = await secureStorage.getItem('@seihouse/api-key-openrouter');
      if (!accountIsCurrent()) return;
      const ollama = await secureStorage.getItem('@seihouse/api-key-ollama-host');
      if (!accountIsCurrent()) return;
      if (gemini) apiHeaders['x-gemini-key'] = gemini;
      if (openrouter) apiHeaders['x-openrouter-key'] = openrouter;
      if (ollama) apiHeaders['x-ollama-host'] = ollama;

      const res = await fetch('/api/generate-card-image', {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({
          prompt: promptText,
          type: 'chapterHero',
          routingConfig
        })
      });
      if (!accountIsCurrent()) return;

      const data = await res.json();
      if (!accountIsCurrent()) return;
      if (!res.ok) {
        throw new Error(data.error || "Aetherial alignment gate failed to synchronize imagery.");
      }

      let newImageUrls = data.imageUrls;
      if (!newImageUrls && data.imageUrl) newImageUrls = [data.imageUrl];
      if (!newImageUrls && data.fallbackUrl) newImageUrls = [data.fallbackUrl];

      if (!newImageUrls || newImageUrls.length === 0) {
        throw new Error("No imagery frames returned.");
      }
      let selectedUrl = newImageUrls[0];

      if (activeStory) {
        const storyPersistenceId = requirePersistenceUuid(
          activeStory.persistenceId ?? activeStory.id,
          'Story',
        );
        const chapter = activeStory.arcs
          .flatMap(arc => arc.chapters)
          .find(candidate => candidate.number === chapterNumber);
        const chapterPersistenceId = requirePersistenceUuid(
          chapter?.persistenceId,
          `Chapter ${chapterNumber}`,
        );
        const legacyMediaId = generateId(8);
        const asset = await saveMediaAsset({
          source: selectedUrl,
          assetType: 'IMAGE',
          purpose: MEDIA_PURPOSE.CHAPTER_HERO,
          association: {
            targetKind: MEDIA_TARGET_KIND.CHAPTER,
            targetKey: chapterPersistenceId,
            storyId: storyPersistenceId,
            chapterId: chapterPersistenceId,
            legacyMediaId,
            entityType: 'chapterHero',
            promptUsed: promptText,
            chapterNumber,
          },
          replacesAssetId: chapter?.heroImageAssetId,
          idempotencyKey: generateUUID(),
          expectedOwnerUid: initiatingUserId ?? undefined,
        });
        if (!accountIsCurrent()) return;
        let deliveryFailure: unknown;
        try {
          selectedUrl = (
            await resolveMediaAssetForDisplay(
              asset,
              initiatingUserId ?? undefined,
            )
          ).url;
          if (!selectedUrl.trim()) {
            deliveryFailure = new Error(
              'The permanent media service returned an empty delivery URL.',
            );
          }
        } catch (error) {
          if (!accountIsCurrent()) return;
          selectedUrl = '';
          deliveryFailure = error;
        }
        if (!accountIsCurrent()) return;
        if (
          chapter?.heroImageAssetId
          && !isSameAssetId(chapter.heroImageAssetId, asset.id)
        ) {
          await discardCachedMedia(chapter.heroImageAssetId);
          if (!accountIsCurrent()) return;
        }
        const newHistoryItem = {
          id: legacyMediaId,
          assetId: asset.id,
          assetVersion: asset.version,
          checksumSha256: asset.checksumSha256,
          deliveryUrlExpiresAt: asset.deliveryUrlExpiresAt ?? undefined,
          entityId: chapterPersistenceId,
          entityType: 'chapterHero' as const,
          imageUrl: selectedUrl,
          promptUsed: promptText,
          createdAt: new Date().toISOString(),
          isCurrent: true,
          chapterNumber: chapterNumber
        };

        await saveStories(currentStories => currentStories.map(s => {
          if (s.id !== activeStoryId) return s;
          const updatedArcs = s.arcs.map(arc => ({
            ...arc,
            chapters: arc.chapters.map(ch => {
              if (ch.number === chapterNumber) {
                return {
                  ...ch,
                  persistenceId: chapterPersistenceId,
                  heroImageAssetId: asset.id,
                  imageHistory: (ch.imageHistory || [])
                    .map(img => ({ ...img, isCurrent: false }))
                    .concat(newHistoryItem),
                  assetManifest: {
                    ...(ch.assetManifest || {}),
                    heroImage: selectedUrl,
                  },
                };
              }
              return ch;
            }),
          }));

          return {
            ...s,
            persistenceId: storyPersistenceId,
            arcs: updatedArcs,
            mediaDescriptors: retainLocalMediaDescriptor(
              s.mediaDescriptors,
              asset,
            ),
            updatedAt: new Date().toISOString(),
          };
        }));
        if (!accountIsCurrent()) return;
        if (deliveryFailure) {
          throw committedMediaDeliveryError('chapter hero', deliveryFailure);
        }
      }
      
      if (!accountIsCurrent()) return;
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(genId);
        return next;
      });
      return selectedUrl;
    } catch (err: any) {
      if (!accountIsCurrent()) return;
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(genId);
        return next;
      });
      console.warn("Hero generation failed:", err);
      throw err;
    }
  };

  return { manifestImage, manifestChapterHero, generatingIds };
}
