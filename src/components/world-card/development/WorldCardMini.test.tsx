// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WorldCardMini } from './WorldCardMini';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
afterEach(() => { act(() => root.unmount()); container.remove(); });

it('opens the world from the row and continues it from the round action', () => {
  const onOpen = vi.fn();
  const onAction = vi.fn();
  act(() => root.render(<WorldCardMini title="The Last Lotus" imageUrl="/lotus.png" meta="Ch. 24 · Xianxia" onOpen={onOpen} onAction={onAction} />));
  const [row, action] = Array.from(container.querySelectorAll('button'));
  expect(row.getAttribute('aria-label')).toBe('The Last Lotus, Ch. 24 · Xianxia');
  expect(action.getAttribute('aria-label')).toBe('Continue The Last Lotus');
  act(() => row.click());
  act(() => action.click());
  expect(onOpen).toHaveBeenCalledOnce();
  expect(onAction).toHaveBeenCalledOnce();
});

it('shows a placeholder cover and no action when neither is supplied', () => {
  act(() => root.render(<WorldCardMini title="Where the Rivers Forget" meta="Ch. 3 · Draft" onOpen={() => {}} />));
  expect(container.querySelector('img')).toBeNull();
  expect(container.querySelector('.world-card-mini-thumb svg')).not.toBeNull();
  expect(container.querySelectorAll('button')).toHaveLength(1);
});
