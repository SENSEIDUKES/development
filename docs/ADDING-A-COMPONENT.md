# Adding a Workshop Component

Keep each experiment small and portable.

## Suggested structure

```text
src/
  components/
    feature-name/
      development/
        FeatureName.tsx
        feature-name.css
      shared/  # only when genuinely shared
      README.md
  workshop/
    previews/feature-name/FeatureNameWorkspace.tsx  # built on FeatureWorkspace
    manifest.ts
public/
  feature-name/
    assets...
```

## Checklist

1. Put reusable production-ready logic in its own component or feature folder.
2. Keep mock data and demo layout inside the preview wrapper.
3. Add the preview to `App.tsx` using a unique `?preview=<id>` value.
4. Add the component metadata to `src/workshop/manifest.ts`, including its Workshop `section` (and `group` for Pages), its real package `owner`, and `status: 'active'`.
5. Test the deployed preview on a phone-sized screen.
6. Add a README with a short dated history using real dates; manifest source metadata points at this repository. No replica-creation or source-comparison dates are required.

SEN, Library and NovelExpanded at `/app/` are the destination, guided by `NOVEL_EXPANDED.md`. Keep Workshop controls and mocks out of the packages and app. New features do not get a `reference/` folder; existing ones are historical old production versions, never edited or refreshed. Keep old systems until each is remade: never delete them because the new path does not use them, reconnect them as they are, or re-sync with the old production app. Never change another repository unless the owner asks.
