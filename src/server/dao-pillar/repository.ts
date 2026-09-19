import { type RewardEntry } from '@seihouse/library/dao-pillar';
import type { JsonObject } from '../qi/qiLedger';
import type { DaoPillarClaimRecord } from './types';

export class DaoPillarValidationError extends Error {
  readonly issues: string[];
  constructor(issues: string[]) {
    super(issues.join(' '));
    this.name = 'DaoPillarValidationError';
    this.issues = issues;
  }
}

/** The requested day is not claimable right now (future, past, or outside the cycle). */
export class DaoPillarNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DaoPillarNotAvailableError';
  }
}

export class DaoPillarUnsupportedRewardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DaoPillarUnsupportedRewardError';
  }
}

export interface ClaimDayCommand {
  uid: string;
  themeId: string;
  cycleId: string;
  dayNumber: number;
  scheduledDate: string;
  rewards: RewardEntry[];
  description: string;
  metadata?: JsonObject;
}

export interface ClaimDayResult {
  claim: DaoPillarClaimRecord;
  /** True when this scheduled day had already been claimed and nothing moved. */
  replayed: boolean;
}

/**
 * Durable claim-history boundary. `claimDay` is one atomic unit of work: an
 * adapter must record the claim and deliver every reward entry together or
 * not at all, and must return the original claim for a repeated
 * (uid, cycleId, dayNumber) under concurrent calls. The Postgres migration
 * carries those guards as a row lock and a unique constraint; the in-memory
 * adapter mirrors them for tests and the Workshop dev server.
 */
export interface DaoPillarRepository {
  /** Every claim of this cultivator, newest scheduled date first, across cycles. */
  listClaims(uid: string): Promise<DaoPillarClaimRecord[]>;
  claimDay(command: ClaimDayCommand): Promise<ClaimDayResult>;
  /** The cultivator's Qi balance as the ledger behind this repository sees it. */
  getQiBalance(uid: string): Promise<number>;
}

export const assertClaimDayCommand = (command: ClaimDayCommand): void => {
  const issues: string[] = [];
  if (!command.uid?.trim()) issues.push('A user id is required.');
  if (!command.themeId?.trim()) issues.push('A theme id is required.');
  if (!command.cycleId?.trim()) issues.push('A cycle id is required.');
  if (!Number.isInteger(command.dayNumber) || command.dayNumber < 1) issues.push('A scheduled day is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(command.scheduledDate)) issues.push('A scheduled date is required.');
  if (!Array.isArray(command.rewards) || command.rewards.length === 0) issues.push('A claim needs at least one reward entry.');
  if (issues.length) throw new DaoPillarValidationError(issues);
};
