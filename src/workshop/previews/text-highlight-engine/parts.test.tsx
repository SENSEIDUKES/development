// @vitest-environment jsdom
import { existsSync } from 'node:fs';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ENGINE_PARTS, partBrief } from './parts';
import { PartsBoard } from './PartsBoard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => { document.body.innerHTML = ''; vi.unstubAllGlobals(); });

describe('Text Highlight Engine parts', () => {
  it('names every part once and points only at files that exist', () => {
    expect(new Set(ENGINE_PARTS.map(part => part.name)).size).toBe(ENGINE_PARTS.length);
    for (const part of ENGINE_PARTS) for (const file of part.files) expect(existsSync(file), `${part.name}: ${file}`).toBe(true);
  });

  it('copies a ready-to-send brief for one part', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    act(() => root.render(<PartsBoard />));
    const actionBar = ENGINE_PARTS.find(part => part.name === 'Action Bar')!;
    const copy = host.querySelector<HTMLButtonElement>('[aria-label="Copy Action Bar brief"]')!;
    await act(async () => { copy.click(); });
    expect(writeText).toHaveBeenCalledWith(partBrief(actionBar));
    expect(partBrief(actionBar)).toMatch(/^Text Highlight Engine › Action Bar — owns .+ Files: src\/components\/text-highlight-engine\/development\/ActionBar\.tsx/);
    expect(copy.textContent).toBe('Copied');
    act(() => root.unmount());
  });
});
