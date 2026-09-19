const xmlEscape = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
}[character] || character));

const hashText = (value: string) => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const makeWorkshopManifestation = (
  id: string,
  name: string,
  type: string,
  variant: number,
): string => {
  const hue = (hashText(`${id}:${type}`) + variant * 47) % 360;
  const safeName = xmlEscape(name || 'Unknown Entry');
  const safeType = xmlEscape(type.toUpperCase());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024"><defs><radialGradient id="a" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="hsl(${hue} 76% 34%)"/><stop offset="0.55" stop-color="hsl(${(hue + 38) % 360} 60% 13%)"/><stop offset="1" stop-color="#050507"/></radialGradient><filter id="g"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="768" height="1024" fill="url(#a)"/><circle cx="384" cy="380" r="190" fill="none" stroke="hsla(${hue} 90% 72% / .35)" stroke-width="3"/><circle cx="384" cy="380" r="145" fill="hsla(${(hue + 45) % 360} 85% 70% / .08)" filter="url(#g)"/><path d="M190 770 Q384 530 578 770" fill="hsla(${hue} 35% 8% / .72)" stroke="hsla(${hue} 80% 70% / .2)"/><text x="384" y="850" text-anchor="middle" fill="#f4f4f5" font-family="serif" font-size="36" letter-spacing="3">${safeName}</text><text x="384" y="895" text-anchor="middle" fill="hsl(${hue} 75% 72%)" font-family="monospace" font-size="16" letter-spacing="7">${safeType} · FORM ${variant + 1}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
