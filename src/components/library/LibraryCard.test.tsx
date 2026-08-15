// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LibraryCard,
  LibraryCardActions,
  LibraryCardBody,
  LibraryCardContent,
  LibraryCardDescription,
  LibraryCardFooter,
  LibraryCardHeader,
  LibraryCardMedia,
  LibraryCardMetadata,
  type LibraryCardHeaderProps,
  type LibraryCardProps,
} from './index';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Type-level contracts kept from SEICard: interactive cards must provide an
// action, and the header takes explicit regions instead of children.
// @ts-expect-error Interactive cards need either an href or an onClick action.
const incompleteActionCardProps = { interactive: true, title: 'Incomplete' } satisfies LibraryCardProps;
void incompleteActionCardProps;

// @ts-expect-error LibraryCardHeader uses explicit regions instead of arbitrary children.
const unsupportedHeaderChildren = { children: 'Unexpected' } satisfies LibraryCardHeaderProps;
void unsupportedHeaderChildren;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const renderCard = (ui: Parameters<Root['render']>[0]) => {
  act(() => {
    root.render(ui);
  });
};

const slot = (name: string) => container.querySelector(`[data-slot="${name}"]`);

describe('LibraryCard static contract', () => {
  it('keeps visual hover elevation static and out of the tab order', () => {
    renderCard(<LibraryCard title="Visual card" elevateOnHover />);

    const card = container.querySelector('article');
    expect(card).toBeTruthy();
    expect(card!.className).toContain('hover:-translate-y-1');
    expect(card!.getAttribute('role')).toBeNull();
    expect(card!.getAttribute('tabindex')).toBeNull();
  });

  it('renders the callout variant without the spectral edge', () => {
    renderCard(<LibraryCard variant="callout" title="Guidance" />);

    const card = container.querySelector('article');
    expect(card!.className).toContain('border-gold-accent/25');
    expect(card!.className).not.toContain('before:mix-blend-screen');
  });
});

describe('LibraryCard interactive contracts', () => {
  it('renders actionable cards with a keyboard-operable button contract', () => {
    renderCard(<LibraryCard interactive title="Action card" onClick={() => undefined} />);

    const card = container.querySelector('[role="button"]');
    expect(card).toBeTruthy();
    expect(card!.getAttribute('tabindex')).toBe('0');
    expect(card!.className).toContain('focus-visible:ring-2');
    expect(card!.className).toContain('cursor-pointer');
    // Interactive cards always elevate, even without elevateOnHover.
    expect(card!.className).toContain('hover:-translate-y-1');
  });

  it('activates button cards with Enter and Space, and ignores other or prevented keys', async () => {
    const onClick = vi.fn();
    renderCard(<LibraryCard interactive title="Action card" onClick={onClick} />);

    const card = container.querySelector<HTMLDivElement>('[role="button"]')!;
    await act(async () => {
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onClick).toHaveBeenCalledTimes(1);

    await act(async () => {
      card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    });
    expect(onClick).toHaveBeenCalledTimes(2);

    await act(async () => {
      card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(onClick).toHaveBeenCalledTimes(2);

    const preventedKeydown = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    preventedKeydown.preventDefault();
    await act(async () => {
      card.dispatchEvent(preventedKeydown);
    });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('uses native link semantics when an interactive card has an href', async () => {
    const onClick = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    renderCard(<LibraryCard interactive href="/library" title="Open library" onClick={onClick} />);

    const link = container.querySelector<HTMLAnchorElement>('a[href="/library"]');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('role')).toBeNull();
    expect(link!.className).toContain('focus-visible:ring-2');

    await act(async () => {
      link!.click();
    });
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('preserves disabled link semantics while blocking its destination and callback', async () => {
    const onClick = vi.fn();
    renderCard(
      <LibraryCard
        interactive
        disabled
        href="/library"
        title="Unavailable library"
        onClick={onClick}
      />,
    );

    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link!.getAttribute('href')).toBeNull();
    expect(link!.getAttribute('role')).toBe('link');
    expect(link!.getAttribute('aria-disabled')).toBe('true');
    expect(link!.getAttribute('tabindex')).toBe('-1');

    await act(async () => {
      link!.click();
    });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('removes disabled action cards from keyboard navigation and clicks', async () => {
    const onClick = vi.fn();
    renderCard(<LibraryCard interactive disabled title="Unavailable action" onClick={onClick} />);

    const card = container.querySelector<HTMLDivElement>('[role="button"]')!;
    expect(card.getAttribute('tabindex')).toBe('-1');
    expect(card.getAttribute('aria-disabled')).toBe('true');
    expect(card.className).toContain('aria-disabled:pointer-events-none');

    await act(async () => {
      card.click();
    });
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('LibraryCard region composition', () => {
  it('keeps the convenience API while exposing identity, media, and accent regions', () => {
    renderCard(
      <LibraryCard
        accentColor="#f59e0b"
        padding="lg"
        eyebrow="Legendary relic"
        icon={<span>✦</span>}
        title="Compass of Returning Stars"
        titleAs="h2"
        description="A relic that remembers every road home."
        metadata="+120 Qi"
        media={<div data-state="sigil">Relic sigil</div>}
        actions={<button type="button">Reveal</button>}
        footer="First claim reward"
      />,
    );

    const card = container.querySelector<HTMLElement>('article')!;
    expect(card.getAttribute('data-accent')).toBe('true');
    expect(card.style.getPropertyValue('--library-card-accent')).toBe('#f59e0b');
    expect(card.style.getPropertyValue('--library-card-accent-border')).toContain('color-mix');

    const media = slot('card-media');
    expect(media).toBeTruthy();
    expect(media!.className).toContain('-m-6');
    expect(slot('card-icon')).toBeTruthy();
    expect(container.querySelector('h2[data-slot="card-title"]')).toBeTruthy();
    expect(slot('card-metadata')).toBeTruthy();
    expect(slot('card-actions')).toBeTruthy();
    expect(slot('card-footer')).toBeTruthy();
  });

  it('supports product-specific composition without forcing one content order', () => {
    renderCard(
      <LibraryCard padding="none" accentColor="#04acff">
        <LibraryCardMedia as="figure">Generated image placeholder</LibraryCardMedia>
        <LibraryCardContent padding="md">
          <LibraryCardHeader eyebrow="Reveal · Location" title="The Ninth Archive" titleAs="h4" />
          <LibraryCardBody>
            <LibraryCardDescription as="blockquote">
              Its doors only open for names the Library remembers.
            </LibraryCardDescription>
          </LibraryCardBody>
          <LibraryCardMetadata>3 known encounters</LibraryCardMetadata>
          <LibraryCardActions>
            <button type="button">Listen</button>
            <button type="button">Open Codex</button>
          </LibraryCardActions>
          <LibraryCardFooter>Last revealed in Chapter 12</LibraryCardFooter>
        </LibraryCardContent>
      </LibraryCard>,
    );

    expect(container.querySelector('figure[data-slot="card-media"]')).toBeTruthy();
    expect(slot('card-content')).toBeTruthy();
    expect(container.querySelector('h4[data-slot="card-title"]')).toBeTruthy();
    expect(container.querySelector('blockquote[data-slot="card-description"]')).toBeTruthy();
    expect(slot('card-body')).toBeTruthy();
    expect(slot('card-metadata')).toBeTruthy();
    expect(slot('card-actions')).toBeTruthy();
    expect(slot('card-footer')).toBeTruthy();
  });

  it('does not create empty regions for conditionally absent React content', () => {
    renderCard(
      <LibraryCard
        eyebrow={[false, null, '', '   ', <>{null}</>]}
        title={[undefined, '', '\n\t']}
        actions={[false, null]}
        footer={['', '  ', <>
          {false}
          {'   '}
        </>]}
      />,
    );

    expect(slot('card-header')).toBeNull();
    expect(slot('card-footer')).toBeNull();
  });

  it('recognizes meaningful content nested inside React fragments', () => {
    renderCard(
      <LibraryCard
        title={<><>Nested title</></>}
        footer={<>Fragment footer</>}
      />,
    );

    expect(slot('card-header')).toBeTruthy();
    expect(container.textContent).toContain('Nested title');
    expect(slot('card-footer')).toBeTruthy();
    expect(container.textContent).toContain('Fragment footer');
  });
});

describe('LibraryCard transferred foundations', () => {
  it('keeps equal-height layout, anchored footer, reduced motion, and adaptive mobile glass', () => {
    renderCard(<LibraryCard title="Foundation" footer="Anchored" />);

    const card = container.querySelector('article')!;
    expect(card.className).toContain('flex-col');
    expect(card.className).toContain('motion-reduce:transition-none');
    // The LibraryPanel glass recipe: opaque base behind a supports() guard,
    // lighter blur on small screens, fuller blur from sm up, spectral edge.
    expect(card.className).toContain('supports-[backdrop-filter]:bg-[rgba(8,12,20,0.60)]');
    expect(card.className).toContain('backdrop-blur-sm');
    expect(card.className).toContain('sm:backdrop-blur-xl');
    expect(card.className).toContain('before:mix-blend-screen');

    expect(slot('card-footer')!.className).toContain('mt-auto');
  });

  it('keeps long-content wrapping on text regions', () => {
    renderCard(
      <LibraryCard
        title="An extremely long title that must wrap anywhere without overflowing its card"
        description="An equally long lore passage that must stay contained inside the glass."
        metadata="a-very-long-unbroken-metadata-token"
        footer="A long footer line that must also wrap."
      />,
    );

    for (const name of ['card-title', 'card-description', 'card-metadata', 'card-footer']) {
      expect(slot(name)!.className, `${name} keeps wrap-anywhere`).toContain('wrap-anywhere');
    }
  });

  it('uses configurable heading levels with an h3 default', () => {
    renderCard(<LibraryCard title="Default heading" />);
    expect(container.querySelector('h3[data-slot="card-title"]')).toBeTruthy();

    renderCard(<LibraryCard title="Raised heading" titleAs="h2" />);
    expect(container.querySelector('h2[data-slot="card-title"]')).toBeTruthy();
  });
});
