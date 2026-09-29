/**
 * `@seihouse/library/world-card` — one WorldCard with full and compact faces.
 *
 * The Info page, full discovery face, and compact creator face. Home, the
 * world detail, and Create render these,
 * so a change to a size shows everywhere that size appears. Hosts supply the
 * world display data and every destination.
 */
export * from '../../components/world-card/shared/worldCardContracts';
export * from '../../components/world-card/development/WorldCardInfo';
export { WorldCard, WORLD_STATUS_LABELS } from '../../components/world-card/development/WorldCard';
