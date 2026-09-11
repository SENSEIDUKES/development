import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  SENHelpIcon,
  SENNavigationIcon,
  SENSearchIcon,
  SENStoryIcon,
  SENStorySeedIcon,
  SENStoriesIcon,
} from './SENIcon';

describe('SENIcon', () => {
  it('renders source-owned named adapters with canonical identifiers', () => {
    const html = renderToStaticMarkup(<>
      <SENHelpIcon size={18} />
      <SENSearchIcon size={18} />
      <SENStoriesIcon size={18} />
      <SENStoryIcon size={18} />
    </>);

    expect(html).toContain('data-sen-icon="header-help"');
    expect(html).toContain('data-sen-icon="header-search"');
    expect(html).toContain('data-sen-icon="navigation-stories"');
    expect(html).toContain('data-sen-icon="story-scroll"');
  });

  it('keeps established category selectors while routing through the shared renderer', () => {
    const html = renderToStaticMarkup(<>
      <SENNavigationIcon name="home" />
      <SENStorySeedIcon name="characters" />
    </>);

    expect(html).toContain('data-sen-navigation-icon="home"');
    expect(html).toContain('data-sen-icon="navigation-home"');
    expect(html).toContain('data-sen-story-seed-icon="characters"');
    expect(html).toContain('data-sen-icon="story-characters"');
  });
});
