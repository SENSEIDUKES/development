// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AILoadingVeil } from '@seihouse/library/manifestations';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const VERSA = { id: 'versa', name: 'VERSA', logoUrl: '/versa.png', colorClass: 'text-human' };

let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

const show = (props: { generationPhase: string; progress?: number | null; streamingBlocksCount?: number }) => act(() => root.render(
  <AILoadingVeil agent={VERSA} isGenerating generationPhase={props.generationPhase} generatingChapterNum={3}
    progress={props.progress} streamingBlocksCount={props.streamingBlocksCount ?? 0}
    generationProgressMessage={null} estimatedSecondsRemaining={null} activeAgentId="versa"
    isVeilMinimized={false} setIsVeilMinimized={() => undefined} />,
));

describe('The Aura Veil has two screens', () => {
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
});
