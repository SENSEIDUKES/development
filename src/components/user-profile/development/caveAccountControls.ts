/**
 * Host-owned account data and destinations; never derived from cultivation Qi.
 * Energy is deliberately absent: the Cave reads it through the shared Energy
 * client (`src/components/energy`), never as a host-supplied number.
 */
export interface CaveAccountControls {
  inboxUnreadCount?: number;
  onOpenInbox?: () => void;
  onOpenStore?: () => void;
  onRedeemCode?: () => void;
}
