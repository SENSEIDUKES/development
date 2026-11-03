import { createContext, useContext, type ReactNode } from 'react';

/**
 * Spoken codes: short names a voice user can say (N3, C12, F2), shown as small
 * badges on what they name, like a phone's "show numbers". A host turns them
 * on while its voice helper is in use; surfaces only place the badges, so SEN
 * never depends on that helper.
 */
const SpokenCodesVisible = createContext(false);

export function SpokenCodesProvider({ visible, children }: { visible: boolean; children: ReactNode }) {
  return <SpokenCodesVisible.Provider value={visible}>{children}</SpokenCodesVisible.Provider>;
}

/** Whether spoken-code badges are showing. */
export const useSpokenCodesVisible = () => useContext(SpokenCodesVisible);

/** The badge for one code; nothing while codes are hidden. Hidden from screen readers, which name the item already. */
export function SpokenCode({ code, className = '' }: { code: string; className?: string }) {
  const visible = useSpokenCodesVisible();
  if (!visible) return null;
  return <span aria-hidden data-spoken-code={code}
    className={`inline-flex shrink-0 items-center rounded-md bg-[#8bdbff] px-1.5 py-0.5 font-mono text-[11px] font-bold leading-none text-[#06121f] shadow ${className}`.trim()}>{code}</span>;
}
