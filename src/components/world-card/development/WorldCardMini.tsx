import { useState } from 'react';
import { BookOpen, Play } from 'lucide-react';
import type { WorldCardMiniProps } from '../shared/worldCardContracts';
import './world-card.css';

/** Mini card: one row sized like an audio-player track — cover thumb, title, meta and a round action. */
export function WorldCardMini({ title, imageUrl, meta, onOpen, actionLabel = `Continue ${title}`, onAction }: WorldCardMiniProps) {
  const [failed, setFailed] = useState<string>();
  const showImage = imageUrl && failed !== imageUrl;
  return <div className="world-card-mini" data-world-card="mini">
    <button type="button" className="world-card-mini-main" onClick={onOpen} disabled={!onOpen}
      aria-label={`${title}, ${meta}`}>
      <span className="world-card-mini-thumb" aria-hidden="true">
        {showImage
          ? <img src={imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(imageUrl)} />
          : <BookOpen size={20} />}
      </span>
      <span className="world-card-mini-text">
        <span className="world-card-mini-title font-display">{title}</span>
        <span className="world-card-mini-meta font-sans">{meta}</span>
      </span>
    </button>
    {onAction && <button type="button" className="world-card-mini-action" onClick={onAction} aria-label={actionLabel}>
      <Play size={16} fill="currentColor" aria-hidden="true" />
    </button>}
  </div>;
}
