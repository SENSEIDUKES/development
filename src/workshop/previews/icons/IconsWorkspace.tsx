import { CatalogWorkspacePage } from '../../CatalogWorkspacePage';
import { IconsGrid } from '../../Icons';

export function IconsWorkspace() {
  return (
    <CatalogWorkspacePage
      title="Icons"
      section="Components · Library UI"
      description="Every current custom Celestial Library SVG glyph, rendered live."
    >
      <IconsGrid />
    </CatalogWorkspacePage>
  );
}
