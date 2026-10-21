# SEIHouse Change Protocol

## Before Editing

Confirm:

- the affected user journey;
- the system that owns the behavior;
- the current entry point;
- the state and persistence flow;
- relevant media flow;
- nearest downstream consumers;
- existing tests or reproducible checks.

For a visible data bug, trace upstream until the first incorrect contract or state transition is found.

## During Editing

- Keep the diff centered on the verified owner.
- Preserve current public behavior unless change is intentional.
- Reuse helpers, tokens, types, and lifecycle patterns.
- Delete the old implementation the change replaces, with the imports and tests only it used; keep the feature's workspace, preview route and manifest entry and update them in place.
- Avoid unrelated formatting churn.
- Document only non-obvious decisions that future maintainers need.

## Targeted Validation Matrix

Choose checks based on the change.

### UI or component

- primary interaction;
- loading, empty, and error state;
- mobile, tablet, and desktop;
- keyboard/focus/accessibility where relevant;
- reduced motion when animation changes;
- no regression to existing variants/themes.

### State or data flow

- initial hydration;
- update path;
- refresh/reload persistence;
- stale or partial data;
- failure and retry;
- no duplicate writes or duplicate records.

### Story generation

- request/context formation;
- structured output validation;
- chapter persistence;
- entity/Codex registration;
- retry/idempotency;
- Reader consumption;
- existing story compatibility.

### Media

- object creation/upload;
- durable metadata/reference;
- public/private retrieval;
- fallback/failure;
- replacement and cleanup where relevant;
- rendered asset after reload.

### Migration or schema

Apply [Build only what we are building](../SKILL.md#build-only-what-we-are-building)
first. For a development-only replacement, verify the new schema or storage boundary,
the intentional reset of obsolete state, and updated consumers; do not invent
migrations. Only when the owner asks for compatibility, or production or real user data
depend on the contract, verify:

- old records still load;
- new records use the new shape;
- defaults are safe;
- migration/backfill is bounded and repeatable;
- rollback or partial-deployment behavior is understood.

### Performance

- baseline behavior observed;
- suspected bottleneck verified;
- duplicate network/write/render work checked;
- poor-network behavior considered;
- user-visible improvement confirmed without data loss.

## Completion Report

Keep the final implementation summary concise:

- what existing system owned the change;
- what was changed;
- what contracts or behavior were preserved, and what was deliberately replaced or deleted;
- what targeted validation ran;
- any genuine remaining risk or follow-up;
- any system-map statement found stale, incomplete, or contradicted by the current
  repository, including the verified replacement fact.

Do not silently edit the system map as unrelated scope during a product task. Report the
mismatch so the reference can be corrected deliberately, or update it in the same change
only when the task explicitly includes conventions maintenance.

Do not include long repository-discovery narration.
