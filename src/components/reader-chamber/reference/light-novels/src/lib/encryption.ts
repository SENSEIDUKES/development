import { generateUUID } from './id';
/**
 * SEIHouse Client-Side Key Obfuscation & Telemetry Scrambler.
 * 
 * ARCHITECTURAL WARNING & DISCLAIMER:
 * This module implements local shoulder-surfing protection and client-side key scrambling (obfuscation),
 * NOT authentic or hardened server-side cryptographic security. It derives a client-side AES-GCM key by hashing 
 * local device telemetry (User Agent, platform, language) as a dynamic salt. 
 * 
 * While this serves as a lightweight, frictionless approach for locally-persistent, Bring-Your-Own-Key (BYOK) 
 * configurations where a dedicated hardware security module (HSM) or secure server-side vault is not available,
 * it is fundamentally an *obfuscation* mechanism, not a military-grade security boundary. 
 * 
 * The export names (`secureStorage`, `encryptKey`, `decryptKey`) are preserved purely to maintain backwards-compatibility
 * with callers throughout the codebase, but they should be treated strictly as client-side telemetry-derived local scramblers.
 */

const STORAGE_SALT_KEY = 'seihouse-secure-salt-v1';

const getLegacyEntropyString = (): string => {
  if (typeof window === "undefined") return "seihouse-celestial-key";
  const userAgent = window.navigator?.userAgent || "";
  const platform = window.navigator?.platform || "";
  const language = window.navigator?.language || "";
  return `seihouse-obfuscated-salt-04acff:${userAgent}:${platform}:${language}`;
};

let memorySalt: string | null = null;

const getSecureEntropyString = (): string => {
  if (typeof window === "undefined") return "seihouse-celestial-key";

  let salt: string | null = null;
  try {
    salt = localStorage.getItem(STORAGE_SALT_KEY);
  } catch (e) {
    console.warn("[Encryption] localStorage is not accessible, using in-memory fallback:", e);
  }

  if (!salt) {
    salt = memorySalt;
  }

  if (!salt) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      salt = crypto.randomUUID();
    } else if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;
      const hex = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
      salt = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    } else {
      salt = generateUUID();
    }

    try {
      localStorage.setItem(STORAGE_SALT_KEY, salt);
    } catch (e) {
      memorySalt = salt;
    }
  }

  return `seihouse-secure-entropy-v1:${salt}`;
};

const getCryptoKey = async (useLegacy: boolean = false): Promise<CryptoKey> => {
  const entropy = useLegacy ? getLegacyEntropyString() : getSecureEntropyString();
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.digest("SHA-256", encoder.encode(entropy));
  return crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
};

function legacyDecrypt(encryptedValue: string): string {
  try {
    const rawEntropy = getLegacyEntropyString();
    let hash = 0;
    for (let i = 0; i < rawEntropy.length; i++) {
      const char = rawEntropy.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const secret = Math.abs(hash).toString(36) + "-portal-key";
    const rawBase64 = encryptedValue.substring(5);
    const binary = atob(rawBase64);
    const encryptedBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      encryptedBytes[i] = binary.charCodeAt(i);
    }
    
    const secretBytes = new TextEncoder().encode(secret);
    const decryptedBytes = new Uint8Array(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
      decryptedBytes[i] = encryptedBytes[i] ^ secretBytes[i % secretBytes.length];
    }
    
    return new TextDecoder().decode(decryptedBytes);
  } catch (error) {
    return "";
  }
}

/**
 * Encrypts a string value using AES-GCM with a dynamic key.
 */
export async function encryptKey(value: string): Promise<string> {
  if (!value) return "";
  try {
    const key = await getCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(value);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );
    
    // Convert to base64
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const cipherBase64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)));
    return `enc::${ivBase64}:${cipherBase64}`;
  } catch (error) {
    console.error("[Encryption Error]", error);
    return "";
  }
}

/**
 * Decrypts a string value that was encrypted using encryptKey.
 */
export async function decryptKey(encryptedValue: string): Promise<string> {
  if (!encryptedValue) return "";
  if (!encryptedValue.startsWith("enc::")) {
    // Unencrypted
    return encryptedValue;
  }
  
  const parts = encryptedValue.substring(5).split(':');
  if (parts.length === 1) {
    // Legacy XOR fallback
    return legacyDecrypt(encryptedValue);
  }
  
  try {
    const ivBytes = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0));
    const cipherBytes = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
    
    let key = await getCryptoKey(false);
    try {
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes },
        key,
        cipherBytes
      );
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      // Fallback to legacy key
      key = await getCryptoKey(true);
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBytes },
        key,
        cipherBytes
      );
      return new TextDecoder().decode(decrypted);
    }
  } catch (error) {
    console.error("[Encryption Error] Failed to decrypt client-side credential:", error);
    return "";
  }
}

/**
 * Enhanced secure wrapper for localStorage API key operations
 */
export const secureStorage = {
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (!value) {
        localStorage.removeItem(key);
        return;
      }
      const encrypted = await encryptKey(value);
      localStorage.setItem(key, encrypted);
    } catch (error) {
      console.warn('Failed to save to secureStorage:', error);
    }
  },
  
  async getItem(key: string): Promise<string> {
    if (typeof window === "undefined") return "";
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch (e) {
      console.warn('Failed to read from localStorage in secureStorage:', e);
    }
    if (!raw) return "";

    const decrypted = await decryptKey(raw);
    if (decrypted) {
      let needsMigration = false;
      if (!raw.startsWith("enc::")) {
        needsMigration = true;
      } else {
        const parts = raw.substring(5).split(':');
        if (parts.length === 1) {
          needsMigration = true;
        } else {
          try {
            const ivBytes = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0));
            const cipherBytes = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0));
            const secureKey = await getCryptoKey(false);
            await crypto.subtle.decrypt(
              { name: "AES-GCM", iv: ivBytes },
              secureKey,
              cipherBytes
            );
          } catch (e) {
            needsMigration = true;
          }
        }
      }

      if (needsMigration) {
        try {
          const reEncrypted = await encryptKey(decrypted);
          if (reEncrypted) {
            localStorage.setItem(key, reEncrypted);
          }
        } catch (e) {
          console.warn("Failed to migrate key to secure format:", e);
        }
      }
    }
    return decrypted;
  },
  
  removeItem(key: string): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('Failed to remove from localStorage in secureStorage:', e);
      }
    }
  }
};
