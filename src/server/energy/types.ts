import type {
  EnergyActionId,
  EnergyTransactionKind,
} from '../../components/energy/shared/energyContracts';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** Who an Energy operation runs for. Always resolved on the server, never trusted from a body. */
export interface EnergyPrincipal {
  uid: string;
  role: 'owner' | 'admin' | 'user';
  /** How the identity was established. Production hosts only ever see `verified`. */
  identity: 'verified' | 'development';
  /**
   * Whether the server grants this principal the development-only controls
   * (test grant, reset). Decided by server configuration, never by a client.
   */
  developmentAccess: boolean;
}

export interface EnergyAccountRecord {
  uid: string;
  balance: number;
  held: number;
  createdAt: string;
  updatedAt: string;
}

export type EnergyReservationStatus = 'held' | 'settled' | 'released';

export interface EnergyReservation {
  id: string;
  uid: string;
  actionId: EnergyActionId;
  amount: number;
  status: EnergyReservationStatus;
  /** Caller-supplied key: the same key always returns the same reservation. */
  idempotencyKey: string;
  metadata: JsonObject;
  createdAt: string;
  updatedAt: string;
  settledAt: string | null;
  releasedAt: string | null;
}

export interface EnergyTransaction {
  id: string;
  uid: string;
  kind: EnergyTransactionKind;
  amount: number;
  actionId: EnergyActionId | null;
  reservationId: string | null;
  idempotencyKey: string;
  description: string;
  balanceAfter: number;
  heldAfter: number;
  /** Internal only: provider cost, story ids, retry notes. Never sent to a browser. */
  metadata: JsonObject;
  createdAt: string;
}

/** Optional internal record of what a generation actually cost SEIHouse. */
export interface EnergyProviderCost {
  amount: number;
  currency: string;
  provider?: string;
  model?: string;
}
