import React, { forwardRef, ReactNode, useId } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Text-like input types only — the glass surface is not built for checkboxes, files, etc. */
export type LibraryTextBoxType = 'text' | 'email' | 'password' | 'search' | 'tel' | 'url' | 'number';

/**
 * LibraryTextBox — the official Celestial Library text input.
 *
 * Behavior is ported from SEIHouse UI's `SEIInput` / `SEIField`
 * (UI repo: `packages/seihouse-ui/src/forms/sei-input.tsx` and `sei-field.tsx`,
 * ported 2026-08-03 — only the text-input behavior, not the whole package):
 *
 * - `forwardRef` to the underlying `<input>`
 * - `useId`-generated fallback id, so `label htmlFor` and message ids always wire up
 * - `aria-describedby` wiring — the error message wins over the helper text,
 *   and any caller-supplied `aria-describedby` is merged in, never clobbered
 * - `aria-invalid` driven by `invalid` or a present `error`
 * - the error message carries `role="alert"` so screen readers announce it
 *   when it appears
 * - required marker (visual `*` plus an sr-only "(required)")
 * - `size` variants: `comfortable` (default, 44px touch target, 16px text so
 *   iOS Safari does not auto-zoom on focus) and `compact`
 * - icon-bearing surface wrapper (`glass-field-wrap` + `glass-field-icon`)
 *   plus a `trailingElement` slot (clear button, password visibility toggle)
 *
 * Controlled or uncontrolled: pass `value` + `onChange` to drive it from
 * state, or omit `value` and let the browser manage the text (`defaultValue`,
 * `onChange`, and `ref` all work natively). The quiet completed accent only
 * applies in controlled mode, where the current text is known.
 *
 * The skin stays entirely on the Library glass field system (`glass-field.css`):
 * dark glass surface, cool-blue focus glow, quiet completed accent, warning
 * edge when invalid, small-caps serif label, helper text above the field.
 *
 * Architecture rule: pages and workspaces import `LibraryTextBox` — never a raw
 * `<input>` or a page-specific input component. If a surface needs a different
 * visual mood, add a `variant` value here instead of creating a new component.
 */
export interface LibraryTextBoxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'size' | 'type'> {
  /** DOM id. Optional — a stable id is generated when omitted. Preview scripts rely on explicit ids, so keep passing them where they exist. */
  id?: string;
  label?: ReactNode;
  /** Controlled value. Omit for uncontrolled usage (`defaultValue` then applies). */
  value?: string | number;
  onChange?: (value: string) => void;
  /** Guidance rendered between the label and the field. */
  helpText?: ReactNode;
  /** Error message rendered under the field; also marks the field invalid and is announced to screen readers. */
  error?: string;
  /** Small node rendered at the right end of the label row (e.g. a character count). */
  rightElement?: ReactNode;
  /** Small contextual icon resting inside the field's left edge. */
  icon?: LucideIcon;
  /** Interactive node inside the field's right edge (e.g. a clear button or password visibility toggle). */
  trailingElement?: ReactNode;
  /** Marks the field invalid without a message (keeps the glass surface, warning-colored edge). */
  invalid?: boolean;
  /** `comfortable` is the default touch-friendly size; `compact` matches the workspace compact fields. */
  size?: 'comfortable' | 'compact';
  /** Visual mood. Only the Celestial glass skin exists today — add new moods here, never as a new component. */
  variant?: 'glass';
  /** Text-like types only. */
  type?: LibraryTextBoxType;
}

const sizeClasses: Record<NonNullable<LibraryTextBoxProps['size']>, string> = {
  // 16px text on phones at both sizes: anything smaller makes iOS Safari
  // auto-zoom the page on focus. Compact keeps its dense 12px text from the
  // sm breakpoint up, where the character/faction grids go multi-column.
  comfortable: 'min-h-[2.75rem] px-4 py-2.5 text-base',
  compact: 'px-2.5 py-1.5 text-base sm:text-xs',
};

export const LibraryTextBox = forwardRef<HTMLInputElement, LibraryTextBoxProps>(
  function LibraryTextBox(
    {
      id,
      label,
      value,
      onChange,
      helpText,
      error,
      rightElement,
      icon: Icon,
      trailingElement,
      invalid = false,
      size = 'comfortable',
      variant = 'glass',
      required = false,
      disabled = false,
      className = '',
      type = 'text',
      'aria-describedby': ariaDescribedBy,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const helperId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const hasError = Boolean(error);
    const isInvalid = invalid || hasError;
    const describedBy =
      [hasError ? errorId : helpText ? helperId : undefined, ariaDescribedBy]
        .filter(Boolean)
        .join(' ') || undefined;

    const controlled = value !== undefined;
    const complete =
      controlled && !isInvalid && value !== null && String(value).trim().length > 0;

    const compact = size === 'compact';

    return (
      <div data-disabled={disabled || undefined}>
        {(label != null || rightElement) && (
          <div className={`flex justify-between items-end ${compact ? 'mb-1' : 'mb-2'}`}>
            <label
              className={`block flex gap-2 items-center font-sc text-xs ${compact ? 'sm:text-[10px]' : ''} text-neutral-400 uppercase tracking-widest ${disabled ? 'opacity-45' : ''}`}
              htmlFor={inputId}
            >
              {label}
              {required && (
                <>
                  <span aria-hidden="true" className="text-human">*</span>
                  <span className="sr-only">(required)</span>
                </>
              )}
            </label>
            {rightElement && <span>{rightElement}</span>}
          </div>
        )}

        {helpText && (
          <p
            id={helperId}
            className={`text-neutral-400 font-sans text-xs ${compact ? 'mb-2' : 'mb-3'} leading-relaxed`}
          >
            {helpText}
          </p>
        )}

        <div className={variant === 'glass' ? 'glass-field-wrap' : ''}>
          {Icon && (
            <Icon
              size={compact ? 13 : 15}
              aria-hidden="true"
              className="glass-field-icon top-1/2 -translate-y-1/2"
            />
          )}
          <input
            ref={ref}
            id={inputId}
            type={type}
            {...(controlled ? { value: value ?? '' } : {})}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
            required={required}
            aria-invalid={isInvalid || undefined}
            aria-describedby={describedBy}
            data-complete={complete || undefined}
            data-invalid={isInvalid || undefined}
            className={`glass-field ${compact ? 'library-compact-field' : ''} ${sizeClasses[size]} ${Icon ? (compact ? 'pl-8' : 'pl-10') : ''} ${trailingElement ? (compact ? 'pr-8' : 'pr-10') : ''} ${className}`}
            {...rest}
          />
          {trailingElement && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-neutral-400">
              {trailingElement}
            </span>
          )}
        </div>

        {hasError && (
          <p id={errorId} role="alert" className="mt-2 font-sans text-xs text-human">
            {error}
          </p>
        )}
      </div>
    );
  },
);
