import { useCodex } from './CodexContext';
import { canonicalAssetId } from '../codexCompatibility';
import { useHistoricalMediaUrls } from '../hooks/useHistoricalMediaUrls';

interface ReaderCodexImageGalleryProps {
  entityId: string;
  type: 'character' | 'creature' | 'location' | 'artifact' | 'beast' | 'faction';
  imageHistory: Array<{
    id: string;
    assetId?: string;
    imageUrl: string;
    chapterNumber?: number | null;
    promptUsed?: string;
  }> | undefined;
}

export function ReaderCodexImageGallery({
  entityId,
  type,
  imageHistory,
}: ReaderCodexImageGalleryProps) {
  const { handleRevertImage, activeStory } = useCodex();
  const resolvedThumbnails = useHistoricalMediaUrls(
    imageHistory ?? [],
    activeStory?.userId,
  );

  if (!imageHistory || imageHistory.length <= 1) return null;

  return (
    <div className="flex space-x-1 overflow-x-auto p-1.5 bg-neutral-950/80 custom-scrollbar border-b border-neutral-900 absolute top-0 w-full z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      {imageHistory.map((img) => {
        const chapterLabel = img.chapterNumber || 'Unknown';
        const promptLabel = img.promptUsed
          ? `Prompt: ${img.promptUsed}`
          : 'Prompt unavailable';
        const thumbnail = img.imageUrl
          || (img.assetId ? resolvedThumbnails[canonicalAssetId(img.assetId)] : '')
          || '';

        return (
          <div
            key={img.id}
            className="relative flex-shrink-0 w-8 h-8 rounded-sm overflow-hidden border border-neutral-800 cursor-pointer hover:border-portal transition-colors shadow-lg"
            // Versions are addressed by their durable history id: the rendered
            // URL is blank for every superseded version, so matching on it
            // restored an arbitrary one.
            onClick={() => handleRevertImage(entityId, type, img.id)}
            title={`Generated at Chapter ${chapterLabel}\n${promptLabel}`}
            role="button"
            aria-label={`Revert to image generated at Chapter ${chapterLabel}. ${promptLabel}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleRevertImage(entityId, type, img.id);
              }
            }}
          >
            {thumbnail
              ? <img src={thumbnail} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="" />
              : <div className="w-full h-full bg-neutral-900 animate-pulse" aria-hidden="true" />}
          </div>
        );
      })}
    </div>
  );
}
