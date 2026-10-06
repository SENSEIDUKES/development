// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GenerationOverlay, GenerationOverlayController, LoadingFamiliarProvider, loadingFamiliarPresentation, buildGenerationOverlayTaskCard } from '@seihouse/library/manifestations';
import { familiarCatalogueEntry } from '../../../host/familiar/catalogue';

// Keep the real scrubber and veil; omit only the exit fade so its retained lifetime is testable.
vi.mock('motion/react', async importOriginal => ({
  ...await importOriginal<typeof import('motion/react')>(),
  AnimatePresence: ({ children }: { children: import('react').ReactNode }) => children,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const VERSA = { id: 'versa', name: 'VERSA', logoUrl: '/versa.png', colorClass: 'text-human' };

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });

const show = (props: { generationPhase: string; progress?: number | null; streamingBlocksCount?: number;
  active?: boolean; completed?: boolean; chapterNumber?: number; minimized?: boolean; remaining?: number | null }) => act(() => root.render(
  <GenerationOverlay agent={VERSA} isGenerating={props.active ?? true} completed={props.completed}
    generationPhase={props.generationPhase} generatingChapterNum={props.chapterNumber ?? 3}
    progress={props.progress} streamingBlocksCount={props.streamingBlocksCount ?? 0}
    generationProgressMessage={null} estimatedSecondsRemaining={props.remaining ?? null} activeAgentId="versa"
    isVeilMinimized={props.minimized ?? false} setIsVeilMinimized={() => undefined} />,
));

const position = () => Number(container.querySelector('[data-testid="generation-overlay"]')?.getAttribute('data-journey-progress'));
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
const clock = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] });

describe('The Generation Overlay has two screens', () => {
  it.each([
    ['quill', '#2589ff'], ['phoenix', '#ff6a13'], ['celestial-moon-moth', '#6bd6f0'],
    ['celestial-guardian', '#d5b668'], ['galaxy-octopus', '#994bfa'],
  ])('shows the equipped %s with its elemental palette in narrative and media generation', (id, accent) => {
    const familiar = familiarCatalogueEntry(id)!.definition;
    for (const phase of ['chapter', 'cover']) {
      act(() => root.render(<LoadingFamiliarProvider value={loadingFamiliarPresentation(familiar)}>
        <GenerationOverlay agent={VERSA} isGenerating generationPhase={phase} generatingChapterNum={3}
          progress={null} streamingBlocksCount={0} generationProgressMessage={null} estimatedSecondsRemaining={null}
          activeAgentId="versa" isVeilMinimized={false} setIsVeilMinimized={() => undefined} />
      </LoadingFamiliarProvider>));
      const veil = container.querySelector<HTMLElement>('[data-testid="generation-overlay"]')!;
      expect(veil.dataset.familiarId).toBe(id);
      expect(veil.style.getPropertyValue('--veil-accent')).toBe(accent);
      expect(veil.querySelector(`[aria-label="${familiar.displayName}, ${familiar.animations.waving.label}"]`)).toBeTruthy();
      const underline = veil.querySelector('.generation-overlay-familiar-underline');
      expect(underline?.getAttribute('aria-hidden')).toBe('true');
      expect(underline?.querySelector('button, [role="button"], [tabindex]')).toBeNull();
      expect(veil.querySelector('[data-celestial-foreground]')).toBeTruthy();
      expect(veil.querySelector('img[src="/versa.png"]')).toBeNull();
      expect(veil.textContent).not.toMatch(/\d+%/);
    }
  });

  it('changes equipment without restarting the active journey, then shows the ready pose on arrival', () => {
    clock();
    const renderFamiliar = (id: string, active = true, completed = false) => act(() => root.render(
      <LoadingFamiliarProvider value={loadingFamiliarPresentation(familiarCatalogueEntry(id)!.definition)}>
        <GenerationOverlay agent={VERSA} isGenerating={active} completed={completed} generationPhase="chapter"
          generatingChapterNum={3} progress={null} streamingBlocksCount={0} generationProgressMessage={null}
          estimatedSecondsRemaining={null} activeAgentId="versa" isVeilMinimized={false} setIsVeilMinimized={() => undefined} />
      </LoadingFamiliarProvider>,
    ));
    renderFamiliar('quill');
    advance(5000);
    const before = position();
    renderFamiliar('phoenix');
    expect(position()).toBeGreaterThanOrEqual(before);
    expect(container.querySelector('[data-familiar-id="phoenix"]')).toBeTruthy();
    renderFamiliar('phoenix', false, true);
    expect(position()).toBe(1);
    expect(container.querySelector('[aria-label="Phoenix, Thoughtful review"]')).toBeTruthy();
    advance(1000);
    expect(container.querySelector('[data-testid="generation-overlay"]')).toBeNull();
  });

  it('narrative: names the chapter, with a percentage only when progress is known', () => {
    show({ generationPhase: 'chapter', progress: null });
    expect(container.textContent).toContain('Chapter 3');
    expect(container.textContent).not.toMatch(/\d+%/);

    // Streamed passages (the Workshop simulation) still estimate progress.
    show({ generationPhase: 'chapter', streamingBlocksCount: 4 });
    expect(container.textContent).toContain('Chapter 3');
    expect(container.textContent).toContain('24%');
  });

  it('every narrative operation is the same narrative screen, and every media operation the same reveal', () => {
    show({ generationPhase: 'blueprint', progress: null });
    const blueprint = container.textContent;
    show({ generationPhase: 'chapter', progress: null });
    expect(container.textContent).toContain('Chapter 3');
    expect(blueprint).toContain('Chapter 3');

    show({ generationPhase: 'cover' });
    expect(container.textContent).not.toContain('Chapter 3');
    expect(container.textContent).not.toMatch(/\d+%/);
    show({ generationPhase: 'audio' });
    expect(container.textContent).not.toContain('Chapter 3');
  });

  it.each(['chapter', 'cover', 'audio'])('%s: travels while a whole response is pending, then reaches the goal before closing', generationPhase => {
    clock();
    show({ generationPhase, progress: null });
    const start = position();
    advance(5000);
    expect(position()).toBeGreaterThan(start);
    expect(container.textContent).not.toMatch(/\d+%/);
    const journey = container.querySelector('svg[aria-label="Generation in progress"]');
    expect(journey?.getAttribute('role')).toBe('img');
    expect(journey?.hasAttribute('aria-valuenow')).toBe(false);

    // A slow provider must never be declared done by the clock.
    advance(600_000);
    expect(position()).toBeLessThan(0.95);
    show({ generationPhase, progress: null, active: false, completed: true });
    expect(position()).toBe(1);
    expect(container.querySelector('svg[aria-label="Generation complete"]')).toBeTruthy();
    advance(999);
    expect(container.querySelector('[data-testid="generation-overlay"]')).toBeTruthy();
    advance(1);
    expect(container.querySelector('[data-testid="generation-overlay"]')).toBeNull();
  });

  it('retains a very fast result long enough to arrive, and resets for the next chapter', () => {
    clock();
    show({ generationPhase: 'chapter', progress: null });
    advance(10);
    show({ generationPhase: 'chapter', progress: null, active: false, completed: true });
    expect(position()).toBe(1);
    advance(1000);
    show({ generationPhase: 'chapter', progress: null, chapterNumber: 4 });
    expect(position()).toBeLessThan(0.05);
    advance(250);
    expect(position()).toBeGreaterThan(0.05);
    expect(position()).toBeLessThan(1);
  });

  it('does not finish a failed or cancelled run, and starts its retry from the beginning', () => {
    clock();
    show({ generationPhase: 'chapter', progress: null });
    advance(5000);
    show({ generationPhase: 'chapter', progress: null, active: false, completed: false });
    expect(container.querySelector('[data-testid="generation-overlay"]')).toBeNull();
    expect(container.querySelector('[aria-label="Generation complete"]')).toBeNull();
    show({ generationPhase: 'chapter', progress: null });
    expect(position()).toBeLessThan(0.05);
    act(() => root.unmount());
    expect(vi.getTimerCount()).toBe(0);
    root = createRoot(container);
  });

  it('keeps travelling while minimized and follows genuine progress when supplied', () => {
    clock();
    show({ generationPhase: 'chapter', progress: null, minimized: true });
    advance(5000);
    show({ generationPhase: 'chapter', progress: null });
    expect(position()).toBeGreaterThan(0.1);
    show({ generationPhase: 'chapter', progress: 70 });
    advance(250);
    expect(position()).toBe(0.7);
    expect(container.textContent).toContain('70%');
    expect(container.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe('70');
    show({ generationPhase: 'chapter', progress: 70, active: false, completed: true });
    expect(position()).toBe(1);
    expect(container.textContent).toContain('100%');
  });

  it('retains the successful task for arrival even when the host clears its task card', () => {
    clock();
    const task = buildGenerationOverlayTaskCard({ generationPhase: 'chapter', generatingChapterNum: 3,
      generationProgressMessage: null, estimatedSecondsRemaining: null, activeAgentId: 'versa',
      streamingBlocksCount: 0, statusQuote: 'Writing', progress: null,
    }, VERSA);
    act(() => root.render(<GenerationOverlayController active task={task} minimized={false} onMinimizedChange={() => undefined} />));
    advance(2000);
    act(() => root.render(<GenerationOverlayController active={false} completed task={null} minimized={false} onMinimizedChange={() => undefined} />));
    expect(position()).toBe(1);
    advance(1000);
    expect(container.querySelector('[data-testid="generation-overlay"]')).toBeNull();
    // An explicit failure overrides a stale finished progress value from the host.
    const stale = { ...task, progress: 100 };
    act(() => root.render(<GenerationOverlayController active task={stale} minimized={false} onMinimizedChange={() => undefined} />));
    advance(250);
    act(() => root.render(<GenerationOverlayController active={false} completed={false} task={stale} minimized={false} onMinimizedChange={() => undefined} />));
    expect(container.querySelector('[data-testid="generation-overlay"]')).toBeNull();
  });
});
