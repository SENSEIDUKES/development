/** Read-only projection of the server-owned QI ledger. Clients cannot credit or debit it. */
export interface QiAccountSnapshot {
  uid: string;
  balance: number;
  transactions: Array<{
    id: string;
    kind: 'deposit';
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
