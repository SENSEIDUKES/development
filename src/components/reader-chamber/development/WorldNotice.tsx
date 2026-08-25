import React from 'react';
import type { WorldNoticeData } from '../shared/types';
import type { SystemColorMeaning } from '../shared/colorCodes';
import { normalizeWorldNoticeData } from '../shared/systemPromptPresentation';

export { normalizeWorldNoticeData } from '../shared/systemPromptPresentation';

export interface WorldNoticeProps {
  title: string;
  flavor?: string;
  /** The authored block prose stays the Reader's narration/TTS source. */
  content: string;
  notice: WorldNoticeData;
  meaning: SystemColorMeaning;
  className?: string;
  style?: React.CSSProperties;
  /** Structural Reader attributes only; interactive and raw HTML props are always discarded. */
  readOnlyProps?: React.HTMLAttributes<HTMLElement>;
}

const cleanText = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

/** Keep the document surface inert even when it is embedded by a generic host. */
function getStaticProps(
  props: React.HTMLAttributes<HTMLElement> | undefined,
): React.HTMLAttributes<HTMLElement> | undefined {
  if (!props) return undefined;
  return Object.fromEntries(
    Object.entries(props).filter(([name]) => (
      !/^on[A-Z]/.test(name)
      && ![
        'autoFocus',
        'contentEditable',
        'dangerouslySetInnerHTML',
        'draggable',
        'role',
        'tabIndex',
      ].includes(name)
    )),
  ) as React.HTMLAttributes<HTMLElement>;
}

function getStaticCaption(content: string): string | undefined {
  const caption = content.replace(/^\s*\[|\]\s*$/g, '').trim();
  return caption || undefined;
}

/**
 * One read-only, diegetic document renderer. A single entry is a notice;
 * multiple entries become a board without changing the underlying component.
 */
export function WorldNotice({
  title,
  flavor,
  content,
  notice,
  meaning,
  className,
  style,
  readOnlyProps,
}: WorldNoticeProps) {
  const headingId = React.useId();
  const staticProps = getStaticProps(readOnlyProps);
  const normalizedNotice = normalizeWorldNoticeData(notice);
  if (!normalizedNotice) return null;
  const documentTitle = cleanText(title) ?? 'WORLD NOTICE';
  const documentFlavor = cleanText(flavor);
  const caption = getStaticCaption(content);
  const isBoard = normalizedNotice.entries.length > 1;

  return (
    <section
      {...staticProps}
      aria-labelledby={headingId}
      data-system-presentation="world_notice"
      data-world-notice="true"
      data-world-notice-board={isBoard ? 'true' : 'false'}
      data-world-notice-entry-count={normalizedNotice.entries.length}
      data-reader-narration="excluded"
      data-color-code={meaning.colorCode}
      style={style}
      className={`world-notice my-6 mx-auto max-w-xl overflow-hidden border border-[color-mix(in_srgb,currentColor_42%,rgba(226,190,119,0.38))] bg-[linear-gradient(145deg,rgba(60,43,27,0.96),rgba(21,15,11,0.98)_52%,rgba(49,35,22,0.96))] px-4 py-4 text-left shadow-[0_12px_30px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,239,198,0.12)] md:my-8 md:px-5 md:py-5 ${className || ''}`}
    >
      <header className="border-b border-amber-100/20 pb-3 text-center">
        <h2
          id={headingId}
          className="font-mono text-sm font-black uppercase tracking-[0.2em] text-current drop-shadow-[0_0_9px_color-mix(in_srgb,currentColor_42%,transparent)] md:text-base"
        >
          {documentTitle}
        </h2>
        {documentFlavor && (
          <p data-world-notice-flavor="true" className="mt-1 font-serif text-xs italic leading-relaxed text-amber-100/65 md:text-sm">
            {documentFlavor}
          </p>
        )}
      </header>

      {caption && (
        <p data-world-notice-caption="true" className="border-b border-amber-100/10 py-2.5 text-center font-serif text-xs italic leading-relaxed text-amber-50/70 md:text-sm">
          {caption}
        </p>
      )}

      <div className={isBoard ? 'divide-y divide-amber-100/15' : ''}>
        {normalizedNotice.entries.map((entry, index) => (
          <article
            key={`${entry.title}-${index}`}
            data-world-notice-entry="true"
            data-reader-narration="excluded"
            className={`py-4 ${!isBoard ? 'pb-0' : ''}`}
          >
            <h3 className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-amber-50 md:text-sm">
              {entry.title}
            </h3>
            {entry.body && (
              <p className="mt-2 font-serif text-sm leading-relaxed text-amber-50/85 md:text-[0.95rem]">
                {entry.body}
              </p>
            )}
            {entry.details && entry.details.length > 0 && (
              <dl className="mt-3 grid gap-x-4 gap-y-1.5 border-t border-amber-100/10 pt-3 font-mono text-[10px] uppercase tracking-[0.1em] md:text-[11px]">
                {entry.details.map((detail, detailIndex) => (
                  <div key={`${detail.label}-${detailIndex}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                    <dt className="text-amber-100/55">{detail.label}</dt>
                    <dd className="text-right font-semibold text-amber-50">{detail.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
