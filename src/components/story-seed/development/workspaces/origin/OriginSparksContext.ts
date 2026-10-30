import { createContext, type ReactNode } from 'react';

/**
 * The host's Sparks button for the open Story Seed (`CreationModal`'s
 * `originSparks`), placed in the Origin heading. Null without one.
 */
export const OriginSparksContext = createContext<ReactNode>(null);
