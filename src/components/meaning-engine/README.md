# Meaning Engine

Compares text by what it means instead of by the words it shares. It is the
primitive behind Story Tag suggestions, and is built to serve tag search,
"stories like this one" and SEA's album matching from the same fingerprints.

## How it works

An embedding model turns a text into a long list of numbers; texts that mean
similar things get similar numbers. The engine calls no model. A host
fingerprints text and hands the numbers over, and the engine does arithmetic:

- `fingerprint.ts`: `packFingerprint` shortens a model's vector to 768 numbers
  and stores each in one byte; `encodeFingerprint` / `decodeFingerprint` move it
  through JSON; `meaningSimilarity` compares two; `textStamp` marks a stored
  fingerprint so a check can tell when its text changed.
- `rank.ts`: `meaningFit` scores every candidate against one query on a shared
  0..1 scale; `pickSpread` picks the best candidates without saying the same
  thing twice.

## Ownership

SEN (`@seihouse/sen/meaning-engine`). It knows nothing about tags, stories or
any host. The model call belongs to the host: here, the Meaning Fingerprint
route (`src/server/meaning-fingerprint/`, `/api/meaning-fingerprint`) on the
Model Router's Meaning model. Fingerprints from different models cannot be
compared, so stored ones are rebuilt when the model changes.

## History

- 2026-11-21: Created for the Story Tag engine (SENSEI: tags and search are the
  same primitive, so it is built once and reused).
