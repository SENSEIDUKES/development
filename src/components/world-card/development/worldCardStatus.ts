import type { CreatorWorldStatus } from '../../creator-space/shared/creatorSpaceContracts';

export const WORLD_STATUS_LABELS: Record<CreatorWorldStatus, string> = {
  draft: 'Draft', shared: 'Shared', public: 'Public', complete: 'Complete',
};
