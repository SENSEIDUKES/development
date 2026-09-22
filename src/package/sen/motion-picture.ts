/**
 * `@seihouse/sen/motion-picture` — a still that peeks into motion on demand.
 *
 * Any item a publisher can picture can also be given a clip: a cover, a
 * companion, an artifact, a place. The peek keeps the still as the resting
 * state, plays the clip in place from one control on the artwork itself, and
 * hands the still back when the clip ends.
 *
 * The publisher supplies both locations and decides whether the choice is
 * remembered. SEN stores no media, no catalogue, and no preference.
 */
import '../../components/motion-picture/development/motion-picture.css';

export { MotionPicture, type MotionPictureProps } from '../../components/motion-picture/development/MotionPicture';
export { useDominantColor, MOTION_PICTURE_FALLBACK_GLOW } from '../../components/motion-picture/development/useDominantColor';
