/**
 * `@seihouse/sen/ui` — the SEN surface primitives.
 *
 * The portable component substrate every SEN surface is built from: panels,
 * cards, buttons, the primary creation action, text inputs, navigation,
 * particles, and the shared glyphs. A host application composes its own
 * screens from these primitives, or replaces them entirely — nothing in this
 * entry reaches into a host's data, storage, or authentication.
 *
 * The primitives still carry SEIHouse's Celestial skin as their default
 * presentation, and their exported names keep the historical `Library*`
 * prefix. Separating that brand skin from the primitives — so an embedding
 * author can drop in their own — is tracked in `src/package/README.md` as
 * follow-up work, not something this entry has done yet.
 *
 * This entry carries the primitive stylesheets as a side effect, so a
 * consumer that imports a primitive gets its treatment with it.
 */
export * from '../../components/library';
