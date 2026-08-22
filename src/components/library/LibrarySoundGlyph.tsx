import React, { memo, useId, type SVGAttributes } from 'react';

/**
 * Celestial Library sound mark: an open folio sending two quiet resonance
 * rings into the margin. The hand-drawn SVG inherits `currentColor`, so the
 * owning control can keep it neutral at rest and illuminate it during audio.
 */
export interface LibrarySoundGlyphProps extends SVGAttributes<SVGSVGElement> {
  /** Pixel width/height of the square glyph. Defaults to 16. */
  size?: number;
  /** Optional accessible title for standalone use. */
  title?: string;
  /** Optional id for the title element, wired to aria-labelledby. */
  titleId?: string;
  /**
   * Decorative by default because interactive owners provide the label.
   * Interactive handlers and focus attributes passed through `...restProps`
   * are intentionally dropped; the wrapping control owns the click and
   * focus surface.
   */
  decorative?: boolean;
}

export const LibrarySoundGlyph = memo(function LibrarySoundGlyph({
  size = 16,
  title,
  titleId,
  decorative,
  role,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-hidden': ariaHiddenProp,
  ...restProps
}: LibrarySoundGlyphProps) {
  const safeSize = typeof size === 'number' && Number.isFinite(size) && size >= 0 ? size : 16;
  const isExplicitlyAccessible = decorative === false
    || Boolean(title)
    || Boolean(ariaLabel)
    || Boolean(ariaLabelledBy);
  const isDecorative = decorative ?? !isExplicitlyAccessible;

  // Strip interaction and focus props from restProps so a future consumer
  // passing onClick, tabIndex, aria-pressed, etc. cannot accidentally turn
  // the static mark into a duplicate focus stop or an interactive SVG.
  // The wrapping control owns the click and focus surface.
  const {
    tabIndex: _tabIndex,
    onClick: _onClick,
    onKeyDown: _onKeyDown,
    onKeyUp: _onKeyUp,
    onKeyPress: _onKeyPress,
    onFocus: _onFocus,
    onBlur: _onBlur,
    onPointerDown: _onPointerDown,
    focusable: _focusable,
    'aria-pressed': _ariaPressed,
    'aria-expanded': _ariaExpanded,
    'aria-controls': _ariaControls,
    'aria-owns': _ariaOwns,
    ...safeProps
  } = restProps;
  void _tabIndex;
  void _onClick;
  void _onKeyDown;
  void _onKeyUp;
  void _onKeyPress;
  void _onFocus;
  void _onBlur;
  void _onPointerDown;
  void _focusable;
  void _ariaPressed;
  void _ariaExpanded;
  void _ariaControls;
  void _ariaOwns;

  // When a standalone title is provided, always wire aria-labelledby to a
  // non-empty id on the inner <title>. Generating the id with useId() when
  // the consumer did not pass titleId keeps the accessible name portable
  // across screen readers (NVDA in Firefox does not announce the implicit
  // SVG <title> text rule) and prevents id collisions when two glyphs
  // share the same hand-written titleId.
  const generatedTitleId = useId();
  const resolvedTitleId = titleId ?? (title ? generatedTitleId : undefined);
  const resolvedAriaLabelledBy =
    ariaLabelledBy ?? (title ? resolvedTitleId : undefined);

  return (
    <svg
      width={safeSize}
      height={safeSize}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={role ?? (isDecorative ? undefined : 'img')}
      aria-hidden={ariaHiddenProp ?? (isDecorative ? 'true' : undefined)}
      aria-label={ariaLabel}
      aria-labelledby={resolvedAriaLabelledBy}
      data-library-glyph="sound"
      {...safeProps}
    >
      {title && <title id={resolvedTitleId}>{title}</title>}
      <path d="M4.6 7.2c2.5-.35 4.55.34 6.15 2.08v8.02c-1.6-1.74-3.65-2.43-6.15-2.08V7.2Z" />
      <path d="M10.75 9.28c1.12-1.2 2.42-1.9 3.9-2.1v8.02c-1.48.2-2.78.9-3.9 2.1" />
      <path d="M16.55 9.55c1.2 1.35 1.2 3.55 0 4.9" />
      <path d="M19.15 7.25c2.35 2.65 2.35 6.85 0 9.5" />
    </svg>
  );
});
