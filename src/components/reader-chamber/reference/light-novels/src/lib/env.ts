/**
 * True in local development only — covers Vite's browser dev server (where
 * `process` is undefined but `import.meta.env.DEV` is set) and Node-side
 * tooling (where NODE_ENV is set). Deliberately false under Vitest so
 * curation logs don't spam test output.
 */
export function isDevBuild(): boolean {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return true;
  }
  // Keep the access direct so Vite can replace import.meta.env.DEV at build
  // time. Hiding import.meta behind an alias leaves it undefined in the
  // browser bundle.
  type ViteImportMeta = ImportMeta & {
    env?: { DEV?: boolean; TEST?: boolean; VITE_SEIHOUSE_DEV_PREVIEW?: boolean };
  };
  return (
    (!!(import.meta as ViteImportMeta).env?.DEV && !(import.meta as ViteImportMeta).env?.TEST)
    || (import.meta as ViteImportMeta).env?.VITE_SEIHOUSE_DEV_PREVIEW === true
  );
}
