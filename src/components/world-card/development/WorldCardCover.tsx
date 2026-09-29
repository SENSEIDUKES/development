import { useState } from 'react';
import { BookOpen } from 'lucide-react';

/** Cover art shared by both card faces and the overview; Compact keeps its wash if art fails. */
export function WorldCardCover({ src, title, decorative = false, loading = 'lazy', compact = false, fallbackCover = false }: {
  src?: string; title: string; decorative?: boolean; loading?: 'eager' | 'lazy';
  compact?: boolean; fallbackCover?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const imageUrl = src?.trim();

  if (!imageUrl || failedSource === imageUrl) {
    if (compact) return null;
    return <div className="world-card-cover-fallback" aria-hidden={decorative || undefined}
      role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : `Cover art unavailable for ${title}`}>
      <BookOpen size={28} aria-hidden="true" />
      <span>Cover unavailable</span>
    </div>;
  }

  return <img className={`world-card-cover-image${fallbackCover ? ' world-card-compact-fallback' : ''}`} src={imageUrl}
    alt={decorative ? '' : `Cover art for ${title}`}
    loading={loading} referrerPolicy="no-referrer" onError={() => setFailedSource(imageUrl)} />;
}
