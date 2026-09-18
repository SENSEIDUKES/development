---
name: seihouse-layout-optimization
description: Audit and repair responsive composition, hierarchy, and usability of a specified UI surface across viewport sizes and content states.
---

# SEIHouse Layout Optimization

Use this skill when the user points to a component, page section, overlay, modal, animation, or UI surface and asks for it to work consistently across all viewport sizes.

## Objective

Audit first, then optimize the specified component so it looks intentional, remains usable, and preserves its visual hierarchy across mobile, tablet, laptop, desktop, portrait, landscape, narrow, wide, and short-height screens.

Preserve the component's identity, atmosphere, behavior, accessibility, and product purpose.

## Core Rule

Do not treat tablet as enlarged mobile or compressed desktop. Evaluate tablet as its own layout range.

## Scope

Focus on the specified component and the directly affected layout code.

Do not redesign unrelated screens or introduce a new global design system unless the component clearly depends on a shared layout defect.

## Audit

Identify the component's:

- Primary focal element
- Supporting content
- Controls and interaction targets
- Visual hierarchy
- Required content
- Decorative content
- Anchoring and alignment behavior
- Intended relationship to the surrounding page

Then inspect for issues involving:

- Overflow, clipping, overlap, or accidental scrolling
- Excessive empty space or cramped composition
- Poor scaling between viewport ranges
- Tablet-specific imbalance
- Mobile and tablet landscape behavior
- Short screens and limited vertical space
- Very wide screens and uncontrolled stretching
- Text wrapping, truncation, line length, and hierarchy
- Fixed, sticky, absolute, or viewport-based positioning
- Modals, overlays, tooltips, menus, thought bubbles, and floating controls
- Safe areas, browser chrome, keyboards, and device edges
- Touch target size and spacing
- Image, illustration, character, or animation framing
- Background effects escaping or overpowering their container
- Larger text and accessibility settings
- State changes that alter height or width
- Loading, empty, error, and populated states

Test intermediate widths, not only named device presets.

## Layout Principles

- Preserve the intended composition rather than merely preventing overflow.
- Decide deliberately what should scale, reflow, stack, collapse, reposition, or use an alternate composition.
- Prefer fluid sizing, flexible layout systems, intrinsic sizing, and container-aware behavior.
- Use controlled breakpoints only where the composition genuinely changes.
- Prefer CSS layout over JavaScript viewport checks.
- Use minimum and maximum dimensions to prevent elements from becoming tiny, oversized, stretched, or detached.
- Keep focal elements visually anchored across viewport ranges.
- Maintain readable text, clear hierarchy, and comfortable touch targets.
- Allow a distinct tablet composition when neither the mobile nor desktop arrangement works well.
- Keep decorative visuals contained and subordinate to the usable interface.
- Preserve reduced-motion and accessibility behavior.

## Viewport Coverage

Where relevant, validate:

- Small mobile portrait
- Large mobile portrait
- Mobile landscape
- Small tablet portrait
- Large tablet portrait
- Tablet landscape
- Standard laptop
- Desktop
- Wide desktop
- Short-height screens
- Split-screen or narrow desktop windows

Exact breakpoints should follow the component's content and the project's existing conventions rather than arbitrary device labels.

## State Coverage

Confirm the layout remains intentional during:

- Initial loading
- Loaded content
- Empty content
- Error states
- Long text or large values
- Short text or missing optional content
- Expanded and collapsed states
- Open overlays, menus, or thought bubbles
- Active animations and transitions
- Larger text or zoomed interfaces

## Guardrails

- Do not make the implementation mobile-only.
- Do not solve responsiveness by shrinking everything.
- Do not hide meaningful content merely to make it fit.
- Do not flatten the visual hierarchy.
- Do not add excessive one-off media queries.
- Do not use JavaScript layout logic when CSS can handle the behavior reliably.
- Do not alter the component's visual identity without instruction.
- Do not perform unrelated redesign or cleanup.
- Do not narrate lengthy internal reasoning.

If significant runtime or loading problems are discovered, flag them separately for [SEIHouse Components Performance](../seihouse-components-performance/SKILL.md) rather than expanding the task.

## Validation

Use the project's existing tools and targeted checks to verify:

- No clipping, overlap, accidental overflow, or inaccessible controls
- Intentional spacing and hierarchy at each important range
- Tablet portrait and landscape quality
- Mobile portrait and landscape quality
- Stable behavior during content and state changes
- Proper containment of overlays and animation boundaries
- Appropriate touch targets and readable text
- No major regression to the surrounding page

Run only relevant validation. Do not broadly review the repository unless necessary.

## Completion Report

Provide a concise summary containing:

1. The main cross-viewport problems found
2. The layout decisions made
3. What changes between mobile, tablet, laptop, and desktop
4. Validation performed
5. Any meaningful remaining risk or recommended follow-up
