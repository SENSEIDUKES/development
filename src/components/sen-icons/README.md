# SEN icons

Canonical source folder for official SEN icon artwork used by both current and older Development components.

- `assets/header/` contains global utility, account, Manifesting, and Qi artwork.
- `assets/navigation/` contains Library destination artwork.
- `assets/story-seed/` contains Story Seed contract and style artwork.
- `SENIcon.tsx` is the shared `currentColor` mask renderer and exports named adapters for APIs that accept Lucide-compatible icon components.

Use the named adapter matching the icon's exact meaning. Keep an existing icon when no exact SEN equivalent exists. In particular, Story uses `SENStoryIcon`, while Origin intentionally keeps its quill icon.
