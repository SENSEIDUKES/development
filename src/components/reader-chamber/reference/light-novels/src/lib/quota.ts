import { LOCAL_ONLY_MODE } from './firebase';
import { consumeImageGenerationQuota } from './persistence';

export async function checkAndConsumeImageQuota(opts?: { automatic?: boolean }): Promise<void> {
  if (LOCAL_ONLY_MODE) return;
  if (opts?.automatic) {
    return; // System actions do not count against manual user limits and do not throw
  }
  await consumeImageGenerationQuota();
}
