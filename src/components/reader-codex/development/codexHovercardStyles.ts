/** Feature-owned hovercard rim; independent of Library UI internals. */
export const CODEX_SPECTRAL_EDGE = [
  'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:p-px',
  "before:content-['']",
  'before:[background:conic-gradient(from_0deg_at_50%_50%,rgba(198,224,255,0.34)_0deg,rgba(4,172,255,0.24)_24deg,rgba(124,92,255,0.22)_52deg,rgba(212,175,55,0.17)_78deg,rgba(4,172,255,0.06)_112deg,transparent_150deg,rgba(212,175,55,0.13)_166deg,transparent_196deg,rgba(4,172,255,0.05)_226deg,rgba(4,172,255,0.15)_252deg,rgba(4,172,255,0.06)_286deg,rgba(124,92,255,0.15)_322deg,rgba(150,200,255,0.24)_348deg,rgba(198,224,255,0.34)_360deg)]',
  // Longhand masks only — the `mask` shorthand resets `mask-composite` to
  // `add`, and Tailwind orders the shorthand after the longhand, which would
  // wash the gradient over the whole panel instead of clipping it to the
  // outer 1px ring.
  'before:[-webkit-mask-image:linear-gradient(#fff_0_0),linear-gradient(#fff_0_0)] before:[-webkit-mask-clip:content-box,border-box] before:[-webkit-mask-composite:xor]',
  'before:[mask-image:linear-gradient(#fff_0_0),linear-gradient(#fff_0_0)] before:[mask-clip:content-box,border-box] before:[mask-composite:exclude]',
  'before:opacity-55 before:mix-blend-screen',
].join(' ');
