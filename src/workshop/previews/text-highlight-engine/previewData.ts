import { createManuscript, type ManuscriptIdFactory } from '@seihouse/sen/text-highlight-engine';

/** Three short pre-made paragraphs for the lab page: action, world-building, and a breakthrough. */
export const previewParagraphs: readonly string[] = [
  'The iron gate split down the middle, and Lin Wei rolled beneath the falling beam a heartbeat before it struck the ground. Dust swallowed the courtyard. Somewhere behind the smoke, the beast roared again, closer now, its claws scraping across the stone. “Get up!” someone shouted from the wall. Lin Wei drew his sword, planted his feet on the cracked tiles, and met the first lunge with a ringing strike that shook every bone in his arms.',
  'Beyond the ridge, the city of Qinglan rose in nine terraces, each one older than the kingdom that claimed it. Merchants on the lowest terrace sold river salt and spirit herbs beneath paper lanterns. Higher up, the sect halls kept their doors shut, and only the temple bells spoke for them, marking the hours in long bronze notes. At the summit stood the Moon Archive, where no one had turned a page in three hundred years.',
  'Lin Wei sat cross-legged in the cave until the last of the storm faded from the entrance. The pill dissolved on his tongue like cold fire. For a long moment nothing happened; then his meridians opened all at once, and a flood of qi tore through him with the sound of breaking ice. [Breakthrough: Foundation Establishment, Lv. 1] He opened his eyes. The cave walls were glowing faintly, as if the stone itself had noticed.',
];

export const createPreviewManuscript = (createId?: ManuscriptIdFactory) => createManuscript(previewParagraphs, { createId });
