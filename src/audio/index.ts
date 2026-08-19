// Public audio surface.
//
// This barrel re-exports the client-safe audio modules. Voice catalog data
// (with provider IDs) is intentionally NOT re-exported here — that lives in
// `src/server/audio/voiceCatalog.ts` and must stay on the server boundary.

export * from './libraryCues';
