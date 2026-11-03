import { useMemo } from 'react';
import { useFamiliarHelperContext } from '../../components/familiar/development/FamiliarHelper';
import type { FamiliarHelperAction, FamiliarPage } from './helper';
import { useFamiliarHelpTopics, type FamiliarHelpPlace } from './helpTopics';

const NO_ACTIONS: readonly FamiliarHelperAction[] = [];

/**
 * The page the reader is on, for the Familiar: its name, the help topics
 * Explain offers there, which page it is for the master action list, and the
 * app's anywhere actions (going Home, to My Energy…). The master list decides
 * which of them the Familiar gets here. It sits under the page's own place
 * (the Reader, Create mode), which adds that page's actions while open.
 */
export function FamiliarPlace({ title, help, page, actions = NO_ACTIONS }: { title: string; help: FamiliarHelpPlace; page?: FamiliarPage; actions?: readonly FamiliarHelperAction[] }) {
  const topics = useFamiliarHelpTopics(help);
  const context = useMemo(() => {
    const labels = actions.map(action => action.label);
    const hint = labels.length ? `Say where to go: ${labels.slice(0, -1).join(', ')}${labels.length > 1 ? ' or ' : ''}${labels.at(-1)}.` : '';
    return { key: `place:${page ?? title}:${help}`, title, topics, actions, hint, ...(page ? { page } : {}) };
  }, [title, help, page, topics, actions]);
  useFamiliarHelperContext(context, 'base');
  return null;
}
