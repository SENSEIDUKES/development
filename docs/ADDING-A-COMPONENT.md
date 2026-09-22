# Adding a Workshop Component

Keep each experiment small and portable.

## Suggested structure

```text
src/
  components/
    feature-name/
      FeatureName.tsx
      feature-name.css
  workshop/
    FeatureNamePreview.tsx
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
6. Record which component, styles, and assets should move into `Light-Novels`.

The workshop shell, home screen, mock data, and preview-only wrappers should not be copied into the production app.
