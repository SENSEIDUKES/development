import { useFamiliarHelperContext } from '../../components/familiar/development/FamiliarHelper';
import { useFamiliarHelpTopics, type FamiliarHelpPlace } from './helpTopics';

/**
 * The page the reader is on, for the Familiar: its name, and the help topics
 * Explain offers there. It sits under the page's own place (the Reader, Create
 * mode), which covers it while open. Nothing to do here yet, so no actions.
 */
export function FamiliarPlace({ title, help }: { title: string; help: FamiliarHelpPlace }) {
  const topics = useFamiliarHelpTopics(help);
  useFamiliarHelperContext({ key: `place:${title}`, title, topics, actions: [], hint: '' }, 'base');
  return null;
}
