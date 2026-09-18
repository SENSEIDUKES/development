---
name: seihouse-components-performance
description: Audit and optimize the performance, resilience, loading behavior, and device adaptability of a specified component while preserving its intended design and functionality.
---

# SEIHouse Components Performance

Use this skill when the user points to a component, page section, interaction, animation, or UI surface and asks for performance optimization.

## Objective

Audit first, then optimize the specified component so it runs smoothly, loads responsibly, and remains dependable across mobile devices, weaker hardware, slow or unstable internet, and normal production conditions.

Preserve the component's intended appearance, atmosphere, behavior, accessibility, and product purpose.

## Scope

Focus on the specified component and the code paths directly required for it to function.

Do not broadly audit or refactor the repository unless a shared issue directly causes the component's performance problem.

## Audit

Inspect the component for meaningful issues involving:

- Unnecessary renders or repeated work
- Expensive effects, animations, particles, filters, shadows, or blur
- Large or poorly handled images, audio, video, fonts, or other assets
- Duplicate, unnecessary, blocked, or poorly timed data requests
- Slow initial loading or poor perceived responsiveness
- Excessive JavaScript, layout measurement, or main-thread work
- Timers, observers, subscriptions, event listeners, or resources that are not cleaned up
- Memory growth or work continuing while the component is hidden or inactive
- Missing lazy loading, caching, preloading, batching, or deferred work where appropriate
- Weak loading, empty, offline, timeout, retry, and error behavior
- Poor behavior on slower mobile devices or constrained networks
- Reinvented infrastructure that should use existing SEIHouse or Library systems

Identify real, high-impact risks before making changes. Avoid speculative micro-optimization.

## Optimization Principles

- Fix the highest-impact problems first.
- Prefer existing SEIHouse utilities, shared components, caches, loaders, asset pipelines, and state systems.
- Prefer local, understandable changes over large architectural rewrites.
- Preserve the visual identity and intended experience.
- Prefer adaptive quality over removing atmosphere.
- Reduce effect density, update frequency, asset quality, or background work on weaker devices when appropriate.
- Defer nonessential work until it is needed.
- Avoid adding new dependencies unless they clearly solve a real problem and fit the existing stack.
- Do not create parallel loading, caching, or state systems when an established project system already exists.
- Maintain accessibility, reduced-motion support, and functional parity.

## Network and Device Resilience

Where relevant, ensure the component behaves intentionally under:

- Slow responses
- Intermittent connectivity
- Offline or failed requests
- Delayed assets
- Cached or stale data
- Repeated retries
- Low-memory or lower-performance mobile devices
- Backgrounding and returning to the app

Use graceful degradation rather than allowing the component to freeze, disappear, repeatedly restart, or block the rest of the interface.

## Validation

Validate the directly affected behavior using the project's existing tools and targeted checks.

At minimum, consider:

- Normal desktop behavior
- Mobile-sized behavior
- Slow or delayed network behavior
- Loading, empty, and error states
- Re-entry, remounting, or reopening behavior
- Reduced-motion behavior when animation is involved
- Cleanup after leaving or hiding the component
- Whether the optimized component still integrates correctly with its owning SEN or Library surface

Run only relevant validation. Do not perform a broad repository review unless necessary.

## Guardrails

- Do not substantially redesign the layout.
- Do not remove intentional effects solely because they have a performance cost.
- Do not change product behavior without a clear reason.
- Do not replace stable shared systems with component-specific implementations.
- Do not claim an improvement without targeted validation or clear evidence.
- Do not perform unrelated cleanup.
- Do not narrate lengthy internal reasoning.

If significant layout problems are discovered, flag them separately for [SEIHouse Layout Optimization](../seihouse-layout-optimization/SKILL.md) rather than expanding the task.

## Completion Report

Provide a concise summary containing:

1. The main performance or resilience problems found
2. The changes made
3. How behavior improved on mobile, weak devices, or poor networks
4. Validation performed
5. Any meaningful remaining risk or recommended follow-up
