import type { CSSProperties, ReactNode } from 'react';
import type { LibraryAssets } from '../../library/assets';
import { backgroundImageUrl, getBackgroundImage } from './backgroundImage';
import './background-image.css';

/** A shared menu-page backdrop; individual story media remains with its owner. */
export function LibraryBackgroundScope({ imageId, assets, children }: { imageId?: string; assets: LibraryAssets; children: ReactNode }) {
  const src = imageId === undefined ? undefined : backgroundImageUrl(imageId, assets);
  return <div className="library-background-scope" data-library-background={src ? getBackgroundImage(imageId).id : undefined}
    style={{ display: 'contents', '--library-background-image': src ? `url(${JSON.stringify(src)})` : undefined } as CSSProperties}>{children}</div>;
}
