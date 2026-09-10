import type { KeyboardEvent } from 'react';

const PREVIOUS_RADIO_KEYS = new Set(['ArrowUp', 'ArrowLeft']);
const NEXT_RADIO_KEYS = new Set(['ArrowDown', 'ArrowRight']);

/**
 * Keeps the Profile's custom visual radio rows operable as one native-like
 * radio group. It intentionally lives with the Profile fork so importing it
 * does not couple this Cave surface to an unrelated feature.
 */
export function handleProfileRadioGroupKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
  const group = event.currentTarget.closest<HTMLElement>('[role="radiogroup"]');
  if (!group) return;

  const radios = Array.from(
    group.querySelectorAll<HTMLButtonElement>('button[role="radio"]:not(:disabled)'),
  );
  if (!radios.length) return;

  const currentIndex = radios.indexOf(event.currentTarget);
  if (currentIndex < 0) return;

  let nextIndex = currentIndex;
  if (PREVIOUS_RADIO_KEYS.has(event.key)) {
    nextIndex = (currentIndex - 1 + radios.length) % radios.length;
  } else if (NEXT_RADIO_KEYS.has(event.key)) {
    nextIndex = (currentIndex + 1) % radios.length;
  } else if (event.key === 'Home') {
    nextIndex = 0;
  } else if (event.key === 'End') {
    nextIndex = radios.length - 1;
  } else {
    return;
  }

  event.preventDefault();
  const nextRadio = radios[nextIndex];
  nextRadio.focus();
  nextRadio.click();
}

/** Gives a custom radio group one tab stop, including a safe first option while unset. */
export function profileRadioTabIndex(isSelected: boolean, hasSelection: boolean, index: number) {
  return isSelected || (!hasSelection && index === 0) ? 0 : -1;
}
