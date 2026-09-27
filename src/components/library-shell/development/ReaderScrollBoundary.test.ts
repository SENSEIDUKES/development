import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { libraryNavigationMode } from './libraryRoutes';

/**
 * The Reader Chamber stays outside the Library Shell.
 *
 * Browsing screens scroll inside the App Shell's fixed frame (`WorkspaceShell`
 * → `SEIAppShell`'s `<main>`). The Reader is immersive and scrolls the document
 * itself: its cinematic scrolling saves and restores the reading position
 * against `document.scrollingElement` (`shared/cinematicScroll`). Mounting the
 * Reader inside the shell's `<main>` would silently move its scroll surface and
 * break that. These checks fail the moment someone tries.
 */
const READER_ROOT = path.resolve(__dirname, '../../reader-chamber');
const SHELL_IMPORTS = [
  /library-shell\/development\/WorkspaceShell/,
  /library-shell\/development\/LibraryNavigation/,
  /from ['"]@seihouse\/library\/shell['"]/,
  /\bSEIAppShell\b/,
];

const sourceFiles = (directory: string): string[] => readdirSync(directory).flatMap(name => {
  const file = path.join(directory, name);
  if (statSync(file).isDirectory()) return sourceFiles(file);
  return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [file] : [];
});

describe('Reader Chamber scroll boundary', () => {
  it('keeps reader and codex routes immersive, outside the shell and the global strip', () => {
    expect(libraryNavigationMode('reader')).toBe('immersive');
    expect(libraryNavigationMode('codex')).toBe('immersive');
  });

  it('never mounts the Reader inside the Library Shell or the App Shell', () => {
    const offenders = sourceFiles(READER_ROOT).flatMap(file => {
      const source = readFileSync(file, 'utf8');
      return SHELL_IMPORTS.filter(pattern => pattern.test(source)).map(pattern => `${path.relative(READER_ROOT, file)} matches ${pattern}`);
    });
    expect(offenders).toEqual([]);
  });

  it('keeps cinematic reading position on the document scroller', () => {
    const position = readFileSync(path.join(READER_ROOT, 'shared/cinematicScroll/useSemanticReadingPosition.ts'), 'utf8');
    expect(position).toMatch(/document\.scrollingElement/);
  });
});
