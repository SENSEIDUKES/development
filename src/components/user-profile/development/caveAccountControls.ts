/** Host-owned account data and destinations; never derived from cultivation Qi. */
export interface CaveAccountControls {
  energyBalance?: number | null;
  inboxUnreadCount?: number;
  onOpenInbox?: () => void;
  onOpenStore?: () => void;
  onRedeemCode?: () => void;
}
