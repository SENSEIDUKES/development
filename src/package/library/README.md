# `@seihouse/library`

Celestial Library's client-safe product behavior, assembled on the portable
SEN engine and the two UI packages. Library owns SEIHouse users, products,
economy, community and business policy. Authentication enforcement, secrets,
durable ledgers and concrete infrastructure stay in the host/backend.

## Public entries

| Import | Responsibility |
| --- | --- |
| `@seihouse/library` | Common Library exports and version |
| `./presentation` | Library-to-SEN presentation composition and host asset-location provider |
| `./profile` | Cave/Profile behavior, public views, settings, admin host ports |
| `./energy` | Client-safe Energy contracts, read projections and provider |
| `./familiar` | Sprite animation, draggable/resizable companion, minimize/recall, profile selection, and the Familiar account: ownership, Bond Rank cultivated with QI, element mastery, and the Active Elemental Effect (`FamiliarTrainingPanel`, `ElementalEffectPanel`, `FamiliarNameEffect`, `activeNameEffect`) |
| `./celestial-store` | Official Familiar Store page and the reusable `ShopCard`: offer configuration, deterministic daily rotation, and the account port for host-owned ownership and purchases |
| `./cultivation` | Spendable-QI and permanent DAO XP read projections (DAO XP alone sets Cultivator Rank, which only chooses colours), economy standards, and cultivation surfaces |
| `./dao-pillar` | Calendar/reward contracts and server-result-driven UI |
| `./rewards` | Achievements and Mystery Scrolls: reward vocabulary, the achievements client, `AchievementsPanel`, the shared reward reveal (`MysteryScrollReveal`, `RewardRevealCard`), and `useRefreshWhenReplaced` for re-reading balances when a reward lands |
| `./relics` | Fate Survival Relics: contracts, the read client, `FateSurvivalRelicsPanel` and `RelicReveal` |
| `./shell` | Navigation, route models, header/footer and shell orchestration |
| `./home` | Library Home, discovery and story-detail surfaces |
| `./story-seed` | Authenticated Story Bank, Help and branded creation journey |
| `./generation` | First-party HARNESS workspace composition |
| `./media` | First-party catalog selection and entitlement contracts |
| `./manifestations` | Celestial manifestation orchestration around Library UI visuals |
| `./styles.css` | Library feature styles |

Profile consumes the Energy, spendable-QI and permanent DAO XP projections; it is not their
authority. DAO Pillar requests today's claim without naming a reward amount. The achievements
client can only open a scroll the cultivator owns, the Relics client only reads, and the Familiar
client asks the server to train, choose a look, or buy at today's price. Every balance,
progression total, reward, role and permission is host-authoritative, and no Familiar effect
grants a boost, multiplier, discount or other advantage.

`LibraryPresentationProvider` composes stateless `@seihouse/library-ui@0.5.0`
visuals over SEN. Concrete CDN and public-directory locations are supplied as
`LibraryAssets`; they are not embedded in the package.

## Dependencies and verification

Library consumes SEN only through `@seihouse/sen/*`. Its type build resolves
SEN's emitted declarations, preventing a second engine copy. The packed smoke
installs both tarballs plus UI peers in a fresh directory, bundles every public
entry and type-checks Profile, Energy, QI, DAO XP, rewards, Relics, Familiar and HARNESS host contracts.

```bash
npm run check:ownership
npm run build:package:library
npm run test:package
```

Workshop simulations, API handlers, identity verification, database adapters,
provider access and production infrastructure are not published.
