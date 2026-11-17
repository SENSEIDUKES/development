import { KokoroTTS } from 'kokoro-js';

/** The model every line is made with. Changing it makes new clips: the saved ones are kept under the old name. */
export const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
export const MODEL_VERSION = 'kokoro-82m-v1.0-fp32';

/** The full model on the server's processor: about 3.5 seconds of speech a second on four cores. */
export const loadModel = () => KokoroTTS.from_pretrained(MODEL, { dtype: 'fp32', device: 'cpu' });
