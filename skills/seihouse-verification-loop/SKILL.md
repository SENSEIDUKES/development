---
name: seihouse-verification-loop
description: Verify implementation through requirement, integration, adversarial, and final diff passes. Fix confirmed in-scope defects without expanding the task.
---

# SEIHouse Verification Loop

Use this skill to guide a coding agent through distinct verification passes after implementation.

## Core rule

Implement exactly what was requested. Inspect deeply. Fix confirmed in-scope defects. Do not add unrequested features, abstractions, controls, states, animations, fallbacks, cleanup, or redesigns.

**Validate broadly. Modify narrowly.**

## Workflow

### 1. Understand the task

Before editing:

- Convert the request into a short requirement checklist.
- Inspect only the files and nearby systems needed to understand the change.
- Reuse existing SEIHouse patterns, utilities, components, state flows, and conventions.
- Do not broaden the task.

### 2. Implement

Make the smallest complete change that satisfies the request.

- Preserve existing behavior outside the requested scope.
- Avoid unrelated cleanup or refactors.
- Do not create a new abstraction unless the requested behavior clearly needs one.
- Do not treat unusual SEIHouse behavior as a defect without evidence.

### 3. Verification pass one: requirement check

Review the actual final diff from disk, not from memory.

Check:

- Every requested requirement is implemented.
- Nothing requested is missing, partial, or replaced by a different interpretation.
- No placeholder, dead branch, accidental change, broken import, type issue, or incomplete state flow remains.
- The change stays within scope.

Fix confirmed issues before continuing.

### 4. Verification pass two: integration check

Inspect directly affected callers, consumers, parent components, shared types, hooks, routes, state, and persistence paths only as needed.

Check:

- Existing behavior still works.
- The change does not bypass an established system or duplicate existing logic.
- Loading, empty, error, disabled, and navigation behavior remain correct when directly affected.
- Responsive behavior remains correct when the task affects layout or UI.
- No obvious stale state, race condition, rerender loop, or broken data flow was introduced.

Fix confirmed in-scope defects with the smallest safe patch.

Do not change unrelated existing issues. Note them briefly instead.

### 5. Verification pass three: adversarial check

Act like a skeptical reviewer trying to break the implementation.

Test only relevant failure cases, such as:

- missing or partial data
- repeated interaction
- smallest supported viewport
- slow or failed request
- navigation away and back
- stale or malformed persisted state

Run targeted tests, type checks, lint checks, builds, or manual validation when available and relevant.

Do not run broad expensive checks unless the change genuinely requires them.

Fix confirmed in-scope defects before continuing.

### 6. Final approval pass

After all fixes:

- Reopen the final diff.
- Recheck the original requirement checklist.
- Confirm that no new actionable defect was introduced.
- Confirm that no unrequested feature or scope expansion was added.

Stop when one complete final pass finds no new meaningful issue.

## Scope guard

Before making any review-driven change, confirm that at least one of these is true:

1. It is required by the original request.
2. It fixes a defect introduced by the current implementation.
3. It preserves existing behavior directly affected by the change.
4. It is required for the requested behavior to function correctly.

If none are true, do not change it.

## Never do this

- Do not add features because they seem useful.
- Do not add controls, settings, animations, fallbacks, abstractions, or extra states that were not requested.
- Do not redesign surrounding systems.
- Do not scan or refactor the entire repository by default.
- Do not treat speculation as a confirmed defect.
- Do not claim a check passed unless it actually ran.
- Do not stop immediately after implementation, even when the task appears simple.
- Do not produce a long reasoning report.

## Completion response

Keep the final response concise. Include:

- what changed
- what was validated
- which targeted checks passed
- anything relevant that could not be verified
- any out-of-scope issue noticed but intentionally not changed

Do not present optional improvements unless they are directly useful to the user.
