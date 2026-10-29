import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Flag, MapPin, PawPrint, Scale, Sparkles, Sword, User } from 'lucide-react';
import './reader-colors.css';

/**
 * The Codex's one card, in parts: its art, the card itself, and an opened
 * card's large header. The Codex gallery and its profiles are built from them,
 * and so is anything else that shows a world card (the World Blueprint before
 * Chapter 1), so a story's cards look the same wherever they are met.
 */

export type CodexCardCategory = 'characters' | 'items' | 'abilities' | 'places' | 'factions' | 'species' | 'world-rules';

/** What each category's cards carry on their art until a picture is manifested. */
const CATEGORY_MARK: Record<CodexCardCategory, (size: number) => ReactNode> = {
  characters: size => <User size={size} />,
  items: size => <Sword size={size} />,
  abilities: size => <Sparkles size={size} />,
  places: size => <MapPin size={size} />,
  factions: size => <Flag size={size} />,
  species: size => <PawPrint size={size} />,
  'world-rules': size => <Scale size={size} />,
};

/**
 * A card's art: its manifested picture, else the aura where its picture will
 * stand, which stirs while the picture is being made.
 */
export function CodexCardArt({ category, picture, name, large = false, making = false }: {
  category: CodexCardCategory; picture?: string; name: string; large?: boolean; making?: boolean;
}) {
  if (picture && !making) return <img src={picture} alt={name} className="absolute inset-0 h-full w-full object-cover" />;
  return <div aria-hidden className="absolute inset-0 overflow-hidden bg-(--reader-art-backdrop)">
    <div className="absolute inset-0 bg-[radial-gradient(#ffffff14_1px,transparent_1px)] [background-size:14px_14px]" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,color-mix(in_srgb,var(--reader-light)_7%,transparent),transparent_62%)]" />
    <div className={`absolute left-1/2 top-[38%] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-(--reader-light)/10 bg-(--reader-shade)/60 text-(--reader-light)/30 ${large ? 'h-24 w-24' : 'h-14 w-14'}`}>
      <span className={`absolute inset-1.5 rounded-full border border-dashed ${making ? 'border-(--reader-light)/40 motion-safe:animate-[spin_4s_linear_infinite]' : 'border-(--reader-light)/15 motion-safe:animate-[spin_40s_linear_infinite]'}`} />
      {CATEGORY_MARK[category](large ? 34 : 20)}
    </div>
    <span className={`absolute inset-x-0 text-center font-mono uppercase tracking-[0.28em] ${making ? 'text-(--reader-light)/60 motion-safe:animate-pulse' : 'text-(--reader-light)/30'} ${large ? 'top-[58%] text-[10px]' : 'top-[60%] text-[8px]'}`}>{making ? 'Manifesting' : 'Unmanifested'}</span>
  </div>;
}

/**
 * One card: its art fills it, its name and one line about it sit at its foot.
 * Every category's cards are the same card. It is a button: opening it is the
 * host's.
 */
export function CodexCardButton({ category, name, line, badge, featured = false, picture, making, className = '', ...button }: {
  category: CodexCardCategory; name: string; line: string; badge?: string; featured?: boolean; picture?: string; making?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type' | 'children'>) {
  return <button type="button" {...button}
    className={`group relative block aspect-[3/4] w-full overflow-hidden rounded-xl border text-start shadow-[0_8px_24px_color-mix(in_srgb,var(--reader-shade)_53%,transparent)] transition-transform duration-200 motion-reduce:transition-none hover:-translate-y-0.5 ${featured ? 'border-(--reader-light)/30' : 'border-(--reader-light)/10'} ${className}`}>
    <CodexCardArt category={category} name={name} picture={picture} making={making} />
    {/* The card's frame: an inner rim and a foot dark enough to read its name on any picture. */}
    <span aria-hidden className="pointer-events-none absolute inset-1 rounded-[10px] border border-(--reader-light)/[0.07]" />
    <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-(--reader-shade) via-(--reader-shade)/80 to-transparent" />
    {badge && <span className="absolute start-2 top-2 max-w-[calc(100%-1rem)] truncate rounded-md border border-(--reader-light)/15 bg-(--reader-shade)/70 px-1.5 py-0.5 text-[10px] font-medium text-(--reader-light)/90 backdrop-blur-sm">{badge}</span>}
    <span className="absolute inset-x-0 bottom-0 p-2.5">
      <span className="block break-words font-display text-[15px] leading-tight text-(--reader-light)">{name}</span>
      <span className="mt-0.5 block truncate text-[11px] text-(--reader-light)/60">{line}</span>
    </span>
  </button>;
}

/** An opened card's art, large, with its name, its one line and its badges. */
export function CodexProfileHeader({ category, name, line, badges, picture, making, nameId }: {
  category: CodexCardCategory; name: string; line: string; badges: readonly string[]; picture?: string; making?: boolean;
  /** The id of the name, for the profile that is labelled by it. */
  nameId?: string;
}) {
  return <header className="relative mx-auto aspect-[4/5] max-h-[26rem] w-full max-w-sm overflow-hidden rounded-2xl border border-(--reader-light)/15 shadow-[0_16px_40px_color-mix(in_srgb,var(--reader-shade)_67%,transparent)]">
    <CodexCardArt category={category} name={name} large picture={picture} making={making} />
    <span aria-hidden className="pointer-events-none absolute inset-1.5 rounded-[14px] border border-(--reader-light)/[0.07]" />
    <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-(--reader-shade) via-(--reader-shade)/80 to-transparent" />
    {badges.length > 0 && <span className="absolute start-3 top-3 flex flex-wrap gap-1.5">
      {badges.map(badge => <span key={badge} className="rounded-md border border-(--reader-light)/15 bg-(--reader-shade)/70 px-2 py-0.5 text-[11px] font-medium text-(--reader-light)/90 backdrop-blur-sm">{badge}</span>)}
    </span>}
    <div className="absolute inset-x-0 bottom-0 p-4">
      <h3 id={nameId} className="break-words font-display text-2xl leading-tight text-(--reader-light)">{name}</h3>
      <p className="mt-1 text-sm text-(--reader-light)/65">{line}</p>
    </div>
  </header>;
}
