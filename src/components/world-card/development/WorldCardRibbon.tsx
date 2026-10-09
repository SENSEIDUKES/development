/** The SEN sash across a cover's corner, like a bound book's ribbon. Shown only when the host awards it (`senSash`). */
export function WorldCardRibbon() {
  return <span className="world-card-ribbon" aria-hidden="true">
    <span><i className="world-card-ribbon-star" />SEN<i className="world-card-ribbon-star" /></span>
  </span>;
}
