/** The Meaning Engine: compare text by what it means, from fingerprints a host supplies. */
export {
  FINGERPRINT_DIMENSIONS, packFingerprint, encodeFingerprint, decodeFingerprint, meaningSimilarity, textStamp, type Fingerprint,
} from '../../components/meaning-engine/shared/fingerprint';
export {
  meaningFit, pickSpread, type SpreadCandidate, type SpreadOptions,
} from '../../components/meaning-engine/shared/rank';
