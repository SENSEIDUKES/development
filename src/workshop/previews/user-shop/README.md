# User Shop workspace

- **Route:** `?preview=user-shop`, Pages → Commerce.
- **Implementation owner:** Library's User Profile,
  `src/components/user-profile/development/UserProfileCreatorPanel.tsx`.
- **Preview owner:** Workshop. The iframe opens the existing Library Shell
  document's embedded Profile host at the selected creator's `storefront` route.

The creator selector reuses `publicCreatorData.ts` and the developed-cultivator
scenario. The page is the existing empty pavilion: there are no listed items or
purchases. Returning from the shop opens the same creator's public profile.
Profile services, identity and economy use the existing local Workshop adapters;
no production account or commerce service is connected. The iframe follows the
available viewport width, so its Cave shell retains its own responsive layout.
There is no historical shop capture; Original Reference explains that boundary
and Compare is disabled. No reference folder or duplicate shop component exists.

## History

- **2026-10-10:** Exposed the existing Profile creator storefront as User Shop
  with a standalone Workshop card and creator selector.
