# SEIHouse Engineering Conventions

These are decision rules, not substitutes for repository inspection.

## Discover Before Creating

Search for the behavior through route and screen labels, domain terms, rendered copy, types and schemas, API names, event names, persisted field names, tests, imports, and consumers. A missing exact term does not prove the system is absent.

## Choose the Owner by Responsibility

Put behavior where its lifecycle is naturally owned.

Examples:

- visual open/closed state: local component or shared UI state;
- story truth: story/domain data layer;
- generated entity registration: generation-to-domain contract;
- persisted preference: profile/preferences persistence;
- media lifecycle: media service/storage boundary;
- reward calculation: cultivation/reward domain;
- reveal animation: presentation component;
- chapter narration coordination: shared audio layer.

Do not move domain decisions into UI code because the UI is where the bug appears.

## Preserve Contracts

Before changing a function, type, schema, event, or component API:

1. Find its callers and consumers.
2. Identify stored data using the contract.
3. Determine whether the change is additive, compatible, or breaking.
4. Apply the [source authority and compatibility rules](../SKILL.md): preserve production
   contracts through compatibility, migration, or deliberate replacement; avoid artificial
   compatibility for development-only state unless its current contract requires it.
5. Update consumers and tests together when a break is required.

## State Rules

- One authoritative owner per durable value.
- Derived values should be recomputed unless persistence has a clear benefit.
- Optimistic UI must reconcile with server truth.
- Cache state must have invalidation or freshness semantics.
- Temporary UI state should not leak into durable models.
- Do not mirror server records into multiple global stores without need.
- Async state must represent loading, success, empty, stale, partial, and failure where the experience distinguishes them.

## Persistence Rules

- Use existing repositories, services, and data-access helpers.
- Keep writes intentional and bounded.
- Avoid writes triggered by render loops, subscriptions, polling, or repeated hydration.
- Make idempotent operations idempotent in practice.
- Preserve existing data through defaults, migrations, or dual-read/dual-write only when deliberately required.
- Validate complete user-visible persistence: record, relation, asset, retrieval, and rendering.

## Error and Offline Behavior

- Use established error surfaces and retry patterns.
- Do not swallow failures that leave the UI claiming success.
- Preserve usable cached/local content during temporary network failure when supported.
- Avoid blocking the whole screen when only one secondary resource fails.
- Differentiate unavailable, not-yet-generated, unauthorized, and failed states.

## Components

- Reuse the existing design system and primitives.
- Keep business rules out of purely presentational components.
- Avoid duplicate variants that differ only by minor styling.
- Extend component APIs carefully; do not create prop explosions.
- Keep accessibility semantics, focus behavior, reduced motion, and touch targets intact.
- Account for mobile, tablet, and desktop rather than treating tablet as stretched mobile.

## Performance

- Measure or inspect the real bottleneck before optimizing.
- Avoid duplicate fetches, repeated subscriptions, render-triggered writes, oversized payloads, and unnecessary full-tree rerenders.
- Preserve progressive rendering: primary content first, secondary enrichment after.
- Do not trade correctness or persistence integrity for superficial speed.
- On poor networks, prioritize recoverability and useful partial content.

## Generated and AI Data

- Validate structured outputs at the boundary.
- Keep provider-specific formatting behind adapters.
- Persist normalized domain data, not accidental model response shape.
- Maintain provenance to story, chapter, entity, version, and generation when needed.
- Retries must not silently duplicate chapters, entities, rewards, or media.
- User edits and canonical overrides must not be overwritten casually by regeneration.

## Cross-Media Data

Use extensible relationships or media-type contracts when modifying shared story architecture. Avoid fields whose names permanently assume every expression is a novel chapter when the concept is actually a generic episode, asset, build, or expression.

Do not generalize every local novel-only component prematurely. Generalize shared canon, identity, ownership, permissions, and media relationships at the correct boundary.

## Focused Changes

A focused task may include a related root-cause fix when required for correctness. It should not become an excuse to reorganize unrelated folders, rename broad systems, replace libraries, rewrite neighboring features, or clean up code with no task relevance.

Leave the code easier to understand in the touched area without expanding scope.
