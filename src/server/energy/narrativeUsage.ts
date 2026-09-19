import type { NarrativeUsageAuthorization, NarrativeUsagePort } from '@seihouse/sen/contracts';
import type { EnergyActionId } from '@seihouse/library/energy';
import type { LibraryPrincipal } from '../identity/types';
import { EnergyAuthorizationError, type EnergyService } from './service';
import type { EnergyReservation } from './types';

/** Trusted server adapter, never a browser API. The host binds the verified account and
 * capability policy before SEN can ask to use it. No caller supplies a price or account. */
export function createEnergyUsagePort(options: {
  service: EnergyService;
  principal: LibraryPrincipal;
  actions: Readonly<Record<string, EnergyActionId>>;
  authorizeStory(storyId: string, capability: string): Promise<boolean>;
}): NarrativeUsagePort {
  const key = (operationId: string) => `narrative:${operationId}`;
  const projection = (reservation: EnergyReservation): NarrativeUsageAuthorization => ({
    receipt: reservation.id,
    state: reservation.status === 'held' ? 'authorized' : reservation.status,
  });
  return {
    async authorize(request) {
      const actionId = Object.hasOwn(options.actions, request.capability) ? options.actions[request.capability] : undefined;
      if (!actionId || !await options.authorizeStory(request.storyId, request.capability)) throw new EnergyAuthorizationError('This narrative operation is not authorized.');
      const previous = await options.service.findReservation(options.principal, key(request.operationId));
      if (previous && (previous.actionId !== actionId || previous.metadata.storyId !== request.storyId)) throw new EnergyAuthorizationError('An operation identity cannot be reused for another request.');
      const result = await options.service.reserve(options.principal, { actionId, idempotencyKey: key(request.operationId), metadata: { storyId: request.storyId } });
      // The repository is the atomic arbiter: a competing intent can win after
      // the advisory lookup above. Never authorize work against that receipt.
      if (result.reservation.actionId !== actionId || result.reservation.metadata.storyId !== request.storyId) throw new EnergyAuthorizationError('An operation identity cannot be reused for another request.');
      return projection(result.reservation);
    },
    async recover(operationId) {
      const reservation = await options.service.findReservation(options.principal, key(operationId));
      return reservation ? projection(reservation) : undefined;
    },
    async settle(receipt) { await options.service.settle(options.principal, { reservationId: receipt }); },
    async release(receipt) { await options.service.release(options.principal, { reservationId: receipt }); },
  };
}
