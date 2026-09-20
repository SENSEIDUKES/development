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
| `./familiar` | Sprite animation, draggable/resizable companion, minimize/recall, and profile selection through the existing Energy provider |
| `./cultivation` | QI read projection, rank authority and cultivation surfaces |
| `./dao-pillar` | Calendar/reward contracts and server-result-driven UI |
| `./relics` | One Relics domain/read model, client projection and presentation |
| `./shell` | Navigation, route models, header/footer and shell orchestration |
| `./home` | Library Home, discovery and story-detail surfaces |
| `./story-seed` | Authenticated Story Bank, Help and branded creation journey |
| `./generation` | First-party HARNESS workspace composition |
| `./media` | First-party catalog selection and entitlement contracts |
| `./manifestations` | Celestial manifestation orchestration around Library UI visuals |
| `./styles.css` | Library feature styles |

Profile consumes Energy and QI projections; it is not their authority. DAO
Pillar requests today's claim without naming a reward amount. Relics clients
can read earned records and redacted assignments but cannot award them. Every
balance, reward, role and permission is host-authoritative.

`LibraryPresentationProvider` composes stateless `@seihouse/library-ui@0.5.0`
visuals over SEN. Concrete CDN and public-directory locations are supplied as
`LibraryAssets`; they are not embedded in the package.

## Dependencies and verification

Library consumes SEN only through `@seihouse/sen/*`. Its type build resolves
SEN's emitted declarations, preventing a second engine copy. The packed smoke
installs both tarballs plus UI peers in a fresh directory, bundles every public
entry and type-checks Profile, Energy, QI, Relics and HARNESS host contracts.

```bash
npm run check:ownership
npm run build:package:library
npm run test:package
```

Workshop simulations, API handlers, identity verification, database adapters,
provider access and production infrastructure are not published.
