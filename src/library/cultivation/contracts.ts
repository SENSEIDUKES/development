/** Read-only projection of the server-owned QI ledger. Clients cannot credit or debit it. */
export interface QiAccountSnapshot {
  uid: string;
  balance: number;
  transactions: Array<{
    id: string;
    /** `amount` is always positive; `kind` gives the direction. */
    kind: 'deposit' | 'spend';
    amount: number;
    source: string;
    description: string;
    balanceAfter: number;
    createdAt: string;
  }>;
}
export interface QiClient { getSnapshot(): Promise<QiAccountSnapshot> }
export type QiAccountState = {
  status: 'unavailable' | 'loading' | 'ready' | 'error';
  snapshot: QiAccountSnapshot | null;
  error: string | null;
};

/**
 * The only systems that may credit permanent DAO XP. Nothing else — QI, the
 * Dao Pillar, the Celestial Store, Familiar training — can move rank.
 * `opening-balance` is the one-time carry-over of a legacy profile's DAO XP
 * when the ledger first becomes authoritative for an account.
 */
export const DAO_XP_SOURCES = ['achievement', 'creation', 'fate-survival-relic', 'opening-balance'] as const;
export type DaoXpSource = (typeof DAO_XP_SOURCES)[number];

/** Read-only projection of the server-owned, credit-only DAO XP ledger. */
export interface DaoXpAccountSnapshot {
  uid: string;
  /** Permanent DAO XP. The only input to Cultivator Rank. */
  balance: number;
  transactions: Array<{
    id: string;
    amount: number;
    source: DaoXpSource;
    description: string;
    balanceAfter: number;
    createdAt: string;
  }>;
}
export interface DaoXpClient { getSnapshot(): Promise<DaoXpAccountSnapshot> }
export type DaoXpAccountState = {
  status: 'unavailable' | 'loading' | 'ready' | 'error';
  snapshot: DaoXpAccountSnapshot | null;
  error: string | null;
};

export const QI_API_PATH = '/api/library-economy?capability=cultivation';
export const DAO_XP_API_PATH = '/api/library-economy?capability=dao-xp';
