// Run while the image is built, so a new server starts with the model already on its disk.
import { loadModel } from './model.mjs';

const tts = await loadModel();
await tts.generate('Ready.', { voice: 'bm_lewis' });
console.log('Kokoro model fetched.');
