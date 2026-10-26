import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LibraryAtmosphereIcon, LIBRARY_ICON_CATALOG } from '@seihouse/library/presentation';

describe('reusable Library icons', () => {
  it('includes all twelve new named icons in the existing catalog categories', () => {
    const bundled = LIBRARY_ICON_CATALOG.filter(icon => icon.source === 'bundled');
    expect(LIBRARY_ICON_CATALOG).toHaveLength(45);
    expect(bundled.map(icon => icon.label)).toEqual([
      'Edit', 'Copy', 'Media', 'Remove', 'Back', 'Audio', 'Cue', 'Soundscape', 'Atmosphere', 'Save', 'Undo', 'Delete',
    ]);
    for (const icon of bundled) {
      const html = renderToStaticMarkup(<icon.Icon size={48} className="example" />);
      expect(html).toContain('width="48"');
      expect(html).toContain('height="48"');
      expect(html).toContain('fill="currentColor"');
      expect(html).toContain('class="example"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toMatch(/<(path|rect) /);
      expect(['Basic', 'Special']).toContain(icon.group);
    }
  });
  it('supports an accessible label when used without adjacent text', () => {
    const html = renderToStaticMarkup(<LibraryAtmosphereIcon aria-label="Atmosphere" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Atmosphere"');
    expect(html).not.toContain('aria-hidden');
  });
});
