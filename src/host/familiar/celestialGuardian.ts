import type { FamiliarDefinition, FamiliarOption } from '@seihouse/library/familiar';
import pet from '../../../public/familiars/celestial-guardian/pet.json';
import request from '../../../public/familiars/celestial-guardian/pet-request.json';
import timing from '../../../public/familiars/celestial-guardian/animation-timing.json';

const base = '/familiars/celestial-guardian';
const labels = ['Idle', 'Moving right', 'Moving left', 'Waving', 'Jumping', 'Disappointed', 'Waiting for input', 'Working with timepiece', 'Thoughtful review'];

export const celestialGuardianOption: FamiliarOption = {
  id: pet.id, name: pet.displayName, description: pet.description,
  heroUrl: 'https://gif.seihouse.org/LIBRARY/GIFS/celestial%20Guardian.gif',
  stillUrl: `${base}/neutral.png`, available: true,
};

/** Geometry and frame counts from pet-request.json; timings extracted from supplied QA GIFs. */
export const celestialGuardian: FamiliarDefinition = {
  id: pet.id, displayName: pet.displayName, description: pet.description,
  spriteUrl: `${base}/${pet.spritesheetPath}`,
  placeholderUrl: `${base}/neutral.png`,
  columns: request.atlas.columns, rows: request.atlas.rows,
  cellWidth: request.atlas.cell_width, cellHeight: request.atlas.cell_height,
  animations: Object.fromEntries([
    ...request.rows.slice(0, 9).map((row, index) => [row.state, {
      label: labels[index], row: row.row,
      columns: Array.from({ length: row.frames }, (_, column) => column),
      durations: timing[row.state as keyof typeof timing],
    }]),
    ['neutral', { label: 'Neutral pose', row: 0, columns: [6], durations: [0] }],
    ...request.rows.slice(9).flatMap(row => row.directions!.map((direction, column) => [`look-${direction}`, {
      label: `Look ${direction}°`, row: row.row, columns: [column], durations: [0],
    }])),
  ]),
};
