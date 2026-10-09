import { CatalogWorkspacePage } from '../../CatalogWorkspacePage';
import { IconsGrid } from '../../Icons';

export function IconsWorkspace() {
  return (
    <CatalogWorkspacePage
      title="Icons"
      section="Components · Library UI"
      description="All 33 Basic and Special icons from SEIHouse R2, with their public URLs."
    >
      <IconsGrid />
    </CatalogWorkspacePage>
  );
}
