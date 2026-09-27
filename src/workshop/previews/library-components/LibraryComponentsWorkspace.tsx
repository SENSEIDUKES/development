import { CatalogWorkspacePage } from '../../CatalogWorkspacePage';
import { LibraryComponentsGrid } from '../../LibraryComponents';

export function LibraryComponentsWorkspace() {
  return (
    <CatalogWorkspacePage
      title="Library Components"
      section="Components · Library UI"
      description="Reusable Celestial Library primitives, rendered live."
    >
      <LibraryComponentsGrid />
    </CatalogWorkspacePage>
  );
}
