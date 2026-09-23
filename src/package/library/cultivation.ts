/**
 * `@seihouse/library/cultivation` — the Closed-Door Cultivation surface.
 *
 * Cultivation's permanent DAO XP ranks and spendable QI behavior are Library
 * product behavior, not portable SEN engine behavior: the idle-QI reward, its
 * realm language, and its claim ceremony only make sense inside SEIHouse's
 * first-party host application.
 *
 * The modal itself stays props-driven — reward calculation and persistence
 * remain host responsibilities — so Library keeps the presentation while the
 * application supplies the numbers.
 */
export {
  ClosedDoorCultivationModal,
  type ClosedDoorCultivationModalProps,
} from '../../components/closed-door-cultivation/development/ClosedDoorCultivationModal';
export * from '../../library/cultivation/contracts';
export * from '../../library/cultivation/economyStandards';
export * from '../../library/cultivation/progression';
export * from '../../library/cultivation/qiClient';
export * from '../../library/cultivation/QiAmount';
