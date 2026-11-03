import type { ActiveElementalEffectSelection, OfferQiResponse, SelectFamiliarFormInput } from '../../../library/familiars/contracts';
import type { FamiliarsState } from '../../../library/familiars/familiarsClient';

/** What `useFamiliars()` returns; any host adapter with the same shape works. */
export type FamiliarsAccount = FamiliarsState & {
  refresh(): Promise<void>;
  offerQi(familiarId: string, amount: number): Promise<OfferQiResponse>;
  selectForm(input: SelectFamiliarFormInput): Promise<unknown>;
  selectElementalEffect(selection: ActiveElementalEffectSelection): Promise<unknown>;
  connected: boolean;
};
