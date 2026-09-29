import { useState } from 'react';
import { BookOpen } from 'lucide-react';

/** Cover art shared by the full card and overview; an empty or failed URL is visible. */
export function WorldCardCover({ src, title, decorative = false, loading = 'lazy' }: {
  src?: string; title: string; decorative?: boolean; loading?: 'eager' | 'lazy';
}) {
  const [failedSource, setFailedSource] = useState<string>();
  const imageUrl = src?.trim();

  if (!imageUrl || failedSource === imageUrl) {
    return <div className="world-card-cover-fallback" aria-hidden={decorative || undefined}
      role={decorative ? undefined : 'img'} aria-label={decorative ? undefined : `Cover art unavailable for ${title}`}>
      <BookOpen size={28} aria-hidden="true" />
      <span>Cover unavailable</span>
    </div>;
  }

  return <img className="world-card-cover-image" src={imageUrl}
    alt={decorative ? '' : `Cover art for ${title}`}
    loading={loading} referrerPolicy="no-referrer" onError={() => setFailedSource(imageUrl)} />;
}
