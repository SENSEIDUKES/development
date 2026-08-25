/**
 * `@Seihouse/Library/cultivation` — the Closed-Door Cultivation surface.
 *
 * Cultivation and Qi progression are Library product behavior, not portable
 * SEN engine behavior: the idle-Qi reward, its realm language, and its claim
 * ceremony only make sense inside SEIHouse's first-party host application.
 *
 * The modal itself stays props-driven — reward calculation and persistence
 * remain host responsibilities — so Library keeps the presentation while the
 * application supplies the numbers.
 */
export {
  ClosedDoorCultivationModal,
  type ClosedDoorCultivationModalProps,
} from '../../components/closed-door-cultivation/development/ClosedDoorCultivationModal';
