import type { KeyboardEvent } from 'react';

const PREVIOUS_KEYS = new Set(['ArrowUp', 'ArrowLeft']);
const NEXT_KEYS = new Set(['ArrowDown', 'ArrowRight']);

/**
 * Keeps custom button radios aligned with the WAI-ARIA radio-group keyboard
 * pattern while leaving each surface responsible for its own selected state.
 */
export const handleRadioGroupKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
  const { key, currentTarget } = event;
  if (!PREVIOUS_KEYS.has(key) && !NEXT_KEYS.has(key) && key !== 'Home' && key !== 'End') return;

  const group = currentTarget.closest<HTMLElement>('[role="radiogroup"]');
  if (!group) return;

  const options = Array.from(group.querySelectorAll<HTMLButtonElement>('[role="radio"]'))
    .filter(option => !option.disabled);
  const currentIndex = options.indexOf(currentTarget);
  if (currentIndex === -1 || options.length === 0) return;

  let nextIndex = currentIndex;
  if (key === 'Home') nextIndex = 0;
  else if (key === 'End') nextIndex = options.length - 1;
  else if (NEXT_KEYS.has(key)) nextIndex = (currentIndex + 1) % options.length;
  else nextIndex = (currentIndex - 1 + options.length) % options.length;

  event.preventDefault();
  const nextOption = options[nextIndex];
  nextOption.focus();
  if (nextOption !== currentTarget) nextOption.click();
};

/** Keep a single Tab stop in each custom radio group. */
export const radioGroupTabIndex = (
  selected: boolean,
  hasSelection: boolean,
  index: number,
) => (selected || (!hasSelection && index === 0) ? 0 : -1);
