const SUPPORTED_AUDIO_FILE = /\.(?:aac|flac|m4a|mp3|oga|ogg|opus|wav)$/i;

const isGlobalIpv4 = (hostname: string): boolean => {
  const parts = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)?.slice(1).map(Number);
  if (!parts) return false;
  if (parts.some(part => part > 255)) return false;
  const [first, second, third, fourth] = parts;
  return !(
    first === 0
    || first === 10
    || first === 127
    || first >= 224
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 0 && third === 0 && fourth !== 9 && fourth !== 10)
    || (first === 192 && second === 0 && third === 2)
    || (first === 192 && second === 88 && third === 99)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19))
    || (first === 198 && second === 51 && third === 100)
    || (first === 203 && second === 0 && third === 113)
  );
};

const isGlobalIpv6 = (hostname: string): boolean => {
  if (!hostname.includes(':')) return false;
  if (hostname.startsWith('::ffff:')) {
    const embeddedIpv4 = hostname.slice('::ffff:'.length);
    return isGlobalIpv4(embeddedIpv4);
  }
  const [head = '', tail = ''] = hostname.split('::');
  const headParts = head ? head.split(':') : [];
  const tailParts = tail ? tail.split(':') : [];
  const missingParts = 8 - headParts.length - tailParts.length;
  if (missingParts < 0 || (!hostname.includes('::') && missingParts !== 0)) return false;
  const parts = [...headParts, ...Array(missingParts).fill('0'), ...tailParts].map(part => Number.parseInt(part || '0', 16));
  if (parts.length !== 8 || parts.some(part => !Number.isFinite(part) || part < 0 || part > 0xffff)) return false;
  const [firstHextet, secondHextet, thirdHextet] = parts;
  if (!Number.isFinite(firstHextet) || firstHextet < 0x2000 || firstHextet > 0x3fff) return false;
  return !(
    (firstHextet === 0x2001 && secondHextet === 0x0db8)
    || (firstHextet === 0x2001 && secondHextet === 0x0002 && thirdHextet === 0)
    || (firstHextet === 0x2001 && secondHextet >= 0x0010 && secondHextet <= 0x002f)
    || (firstHextet === 0x3fff && secondHextet <= 0x0fff)
  );
};

/** Host-authorized HTTPS resources may use signed URLs or extensionless routes. */
export const isPublicHttpsUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) return false;
    const hostname = parsed.hostname.replace(/^\[|\]$/g, '').replace(/\.+$/, '').toLowerCase();
    if (!hostname || hostname === 'localhost' || hostname.endsWith('.localhost')) return false;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) && !isGlobalIpv4(hostname)) return false;
    if (hostname.includes(':') && !isGlobalIpv6(hostname)) return false;
    return true;
  } catch {
    return false;
  }
};

/** Stable catalog records intentionally require a public, non-expiring file URL. */
export const isPublicHttpsMediaUrl = (value: string): boolean => {
  if (!isPublicHttpsUrl(value)) return false;
  const parsed = new URL(value);
  return !parsed.search && !parsed.hash && SUPPORTED_AUDIO_FILE.test(parsed.pathname);
};
