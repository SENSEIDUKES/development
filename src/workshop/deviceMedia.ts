import { DeviceMediaUrls, IndexedDbDeviceMediaPackStore } from '../host/media/deviceMediaPacks';

/**
 * The Workshop's own installed media packs, apart from the app's: where its
 * reader mixer plays their recordings, and the device store that keeps them.
 */
export const WORKSHOP_DEVICE_MEDIA = new DeviceMediaUrls();
export const WORKSHOP_MEDIA_PACK_STORE = new IndexedDbDeviceMediaPackStore('seihouse.harness.media-packs.v1');
