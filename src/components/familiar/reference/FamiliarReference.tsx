/** Locked source preview: the supplied greeting GIF, copied byte-for-byte. */
export function FamiliarReference() {
  return <section className="familiar-reference">
    <h2>Celestial Guardian · original greeting</h2>
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet="/familiars/celestial-guardian/neutral.png" />
      <img src="/familiars/celestial-guardian/previews/waving.gif" alt="Celestial Guardian greeting from the supplied package" width={192} height={208} />
    </picture>
    <p>The supplied greeting preview. Development plays the original sprite atlas and connects to Energy.</p>
  </section>;
}
