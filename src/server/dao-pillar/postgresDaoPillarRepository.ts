import { type DeliveredReward, type RewardEntry } from '@seihouse/library/dao-pillar';
import type { JsonObject } from '../qi/qiLedger';
import { translateQiSqlError, type QiSqlClient } from '../qi/postgresQiLedger';
import {
  assertClaimDayCommand,
  DaoPillarUnsupportedRewardError,
  DaoPillarValidationError,
  type ClaimDayCommand,
  type ClaimDayResult,
  type DaoPillarRepository,
} from './repository';
import type { DaoPillarClaimRecord } from './types';

type Row = Record<string, unknown>;

/**
 * Whole-second ISO timestamps. A row read back through a driver and the same
 * row serialized by `to_jsonb` inside the claim function can disagree on
 * sub-second precision; a claim time never needs it.
 */
const isoTimestamp = (value: unknown): string => {
  const parsed = value instanceof Date ? value.getTime() : Date.parse(String(value));
  return new Date(Math.floor(parsed / 1000) * 1000).toISOString();
};
/** A DATE column arrives as a JS Date (pg) or a string (PGlite / JSON); both become YYYY-MM-DD. */
const calendarDate = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
};
const parseJson = <T>(value: unknown, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'string') { try { return JSON.parse(value) as T; } catch { return fallback; } }
  return value as T;
};

export const claimFromRow = (row: Row): DaoPillarClaimRecord => ({
  id: String(row.id),
  uid: String(row.uid),
  themeId: String(row.theme_id),
  cycleId: String(row.cycle_id),
  dayNumber: Number(row.day_number),
  scheduledDate: calendarDate(row.scheduled_date),
  rewards: parseJson<RewardEntry[]>(row.rewards, []),
  status: row.status as DaoPillarClaimRecord['status'],
  delivered: parseJson<DeliveredReward[]>(row.delivered, []).map(entry => ({
    ...entry,
    amount: Number(entry.amount),
    balanceAfter: Number(entry.balanceAfter),
  })),
  claimedAt: isoTimestamp(row.claimed_at),
  metadata: parseJson<JsonObject>(row.metadata, {}),
});

const translateSqlError = (error: unknown): never => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('dao_pillar_unsupported_reward:')) throw new DaoPillarUnsupportedRewardError(message.replace(/^.*dao_pillar_unsupported_reward:\s*/, ''));
  if (message.includes('dao_pillar_validation:')) throw new DaoPillarValidationError([message.replace(/^.*dao_pillar_validation:\s*/, '')]);
  return translateQiSqlError(error);
};

/** Thin adapter over `dao_pillar_claim_day` in `20260918_003_dao_pillar_calendar.sql`. */
export class PostgresDaoPillarRepository implements DaoPillarRepository {
  constructor(private readonly sql: QiSqlClient) {}

  async listClaims(uid: string): Promise<DaoPillarClaimRecord[]> {
    const { rows } = await this.sql.query<Row>(
      'SELECT * FROM dao_pillar_claim WHERE uid = $1 ORDER BY scheduled_date DESC, claimed_at DESC',
      [uid],
    );
    return rows.map(claimFromRow);
  }

  async claimDay(command: ClaimDayCommand): Promise<ClaimDayResult> {
    assertClaimDayCommand(command);
    try {
      const { rows } = await this.sql.query<{ result: Row }>(
        'SELECT dao_pillar_claim_day($1, $2, $3, $4::smallint, $5::date, $6::jsonb, $7, $8::jsonb) AS result',
        [
          command.uid,
          command.themeId,
          command.cycleId,
          command.dayNumber,
          command.scheduledDate,
          JSON.stringify(command.rewards),
          command.description,
          JSON.stringify(command.metadata ?? {}),
        ],
      );
      const result = rows[0]?.result;
      if (!result) throw new Error('The Dao Pillar claim function returned no result.');
      return { replayed: Boolean(result.replayed), claim: claimFromRow(result.claim as Row) };
    } catch (error) {
      return translateSqlError(error);
    }
  }

  async getQiBalance(uid: string): Promise<number> {
    const { rows } = await this.sql.query<Row>('SELECT balance FROM qi_account WHERE uid = $1', [uid]);
    return rows[0] ? Number(rows[0].balance) : 0;
  }
}
