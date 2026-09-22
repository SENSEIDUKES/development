import type { HTMLAttributes, ReactNode } from 'react';
import { ChevronRight, Globe } from 'lucide-react';
import { LibraryElementalTitle, LibraryPanel } from '@seihouse/library-ui';
import { SEIDisclosure, SEIDisclosureGroup } from '@seihouse/ui';
import { getSenLanguageLabel, type SenLanguageCode } from '@seihouse/sen/contracts';
import { LIBRARY_FOOTER_SOCIAL_GLYPHS, LIBRARY_FOOTER_SOCIAL_LABELS, type LibraryFooterSocialNetwork } from './LibraryFooterSocialIcons';
import './library-footer.css';

/** The company statement. The wordmark above it already names SEIHouse. */
export const LIBRARY_FOOTER_STATEMENT = 'A BETTER TIME CAPSULE AND TRANSLATOR OF ARTISTIC EXPRESSION';
export const LIBRARY_FOOTER_MARK = 'SEN';
/** What the SEN wordmark stands for, read out beneath it. */
export const LIBRARY_FOOTER_EXPANSION = 'SEIHouse Expanded Novels';
export const LIBRARY_FOOTER_COPYRIGHT = '© 2026 SEIHouse Productions LLC';

/**
 * One footer destination. Hosts supply either an in-app action or an external
 * link; an item with neither is not rendered, so unfinished destinations never
 * become dead controls.
 */
export interface LibraryFooterAction {
  id: string;
  label: string;
  /** External destination, opened in a new tab. */
  href?: string;
  /** Existing host action or router callback. */
  onSelect?: () => void;
  disabled?: boolean;
  title?: string;
}
export interface LibraryFooterGroup {
  id: string;
  label: string;
  items: readonly LibraryFooterAction[];
}
export interface LibraryFooterSocialLink {
  network: LibraryFooterSocialNetwork;
  href?: string;
  onSelect?: () => void;
}
export interface LibraryFooterLanguage {
  /** The account's current Interface Language. */
  code: SenLanguageCode;
  /** Opens the existing Language setting, which owns confirmation and revert. */
  onOpenSettings: () => void;
}
export interface LibraryFooterProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  /** Closed accordions — Explore, SEIHouse, Support — with host destinations. */
  groups: readonly LibraryFooterGroup[];
  social: readonly LibraryFooterSocialLink[];
  /** Terms, Privacy, Cookies. */
  legal: readonly LibraryFooterAction[];
  language?: LibraryFooterLanguage;
  emblem?: { src: string; alt: string };
}

const hasDestination = (item: { href?: string; onSelect?: () => void }) => Boolean(item.href || item.onSelect);

/** Renders an action as a real link or a real button; never a dead anchor. */
function FooterControl({ item, className, children, ...props }: { item: LibraryFooterAction | LibraryFooterSocialLink; className: string; children: ReactNode } & Omit<HTMLAttributes<HTMLElement>, 'children'>) {
  const shared = { className, title: 'title' in item ? item.title : undefined, ...props };
  if (item.href) {
    return <a {...shared} href={item.href} target="_blank" rel="noreferrer" aria-disabled={'disabled' in item && item.disabled ? true : undefined}>{children}</a>;
  }
  return <button {...shared} type="button" onClick={item.onSelect} disabled={'disabled' in item ? item.disabled : undefined}>{children}</button>;
}

/**
 * The Celestial Library platform footer. Library-owned chrome, like the global
 * header and bottom navigation: it carries the SEN identity, the social row,
 * three closed menus, the account's language entry and the legal row. Every
 * destination comes from the host; the footer holds no routes or URLs of its own.
 */
export function LibraryFooter({ groups, social, legal, language, emblem, className = '', ...props }: LibraryFooterProps) {
  const visibleGroups = groups.map(group => ({ ...group, items: group.items.filter(hasDestination) })).filter(group => group.items.length > 0);
  const visibleSocial = social.filter(hasDestination);
  const visibleLegal = legal.filter(hasDestination);
  return <footer {...props} data-library-footer className={`library-footer ${className}`.trim()} aria-label="Celestial Library footer">
    <div className="library-footer-inner">
      <div className="library-footer-identity">
        <div className="library-footer-seal" aria-hidden="true">
          <span className="library-footer-hairline" />
          {emblem && <img src={emblem.src} alt="" className="library-footer-emblem" decoding="async" />}
          <span className="library-footer-hairline" />
        </div>
        {/* The wordmark carries the lettering, cycling the shared Celestial
            Library spectrum; what it stands for reads plainly beneath it. */}
        <LibraryElementalTitle as="p" element="celestial" intensity="subtle" shadow="none"
          className="library-footer-mark" data-footer-production-mark>{LIBRARY_FOOTER_MARK}</LibraryElementalTitle>
        <p className="library-footer-expansion" data-footer-expansion>{LIBRARY_FOOTER_EXPANSION}</p>
        <p className="library-footer-statement">{LIBRARY_FOOTER_STATEMENT}</p>
      </div>

      <div className="library-footer-controls">
        {visibleGroups.length > 0 && <LibraryPanel padding="none" className="library-footer-menus">
          {/* One open section at a time; everything starts collapsed. Wide
              viewports set these side by side as tabs — see library-footer.css. */}
          <SEIDisclosureGroup type="single" defaultValue={null} className="library-footer-disclosures" role="navigation" aria-label="Footer menus">
            {visibleGroups.map(group => <SEIDisclosure key={group.id} value={group.id} heading={group.label} headingLevel="h3"
              className="library-footer-disclosure" triggerClassName="library-footer-disclosure-trigger" contentClassName="library-footer-disclosure-content">
              <ul className="library-footer-links">
                {group.items.map(item => <li key={item.id}>
                  <FooterControl item={item} className="library-footer-link">{item.label}</FooterControl>
                </li>)}
              </ul>
            </SEIDisclosure>)}
          </SEIDisclosureGroup>
        </LibraryPanel>}

        {visibleSocial.length > 0 && <LibraryPanel padding="none" className="library-footer-social">
          <ul className="library-footer-social-list" aria-label="SEIHouse social channels">
            {visibleSocial.map(item => {
              const Glyph = LIBRARY_FOOTER_SOCIAL_GLYPHS[item.network];
              const label = LIBRARY_FOOTER_SOCIAL_LABELS[item.network];
              return <li key={item.network}>
                <FooterControl item={item} className="library-footer-social-link" aria-label={`SEIHouse on ${label}`} data-social={item.network}>
                  <Glyph size={26} />
                </FooterControl>
              </li>;
            })}
          </ul>
        </LibraryPanel>}

        {language && <div className="library-footer-language-row">
          <button type="button" className="library-footer-language" onClick={language.onOpenSettings}
            aria-label={`Language: ${getSenLanguageLabel(language.code)}. Open Language settings`}>
            <Globe aria-hidden="true" focusable="false" size={18} />
            <span className="library-footer-language-label">{getSenLanguageLabel(language.code)}</span>
            <ChevronRight aria-hidden="true" focusable="false" size={16} className="library-footer-language-chevron" />
          </button>
        </div>}
      </div>

      <div className="library-footer-legal">
        <p className="library-footer-copyright">{LIBRARY_FOOTER_COPYRIGHT}</p>
        {visibleLegal.length > 0 && <ul className="library-footer-legal-links" aria-label="Legal">
          {visibleLegal.map(item => <li key={item.id}>
            <FooterControl item={item} className="library-footer-legal-link">{item.label}</FooterControl>
          </li>)}
        </ul>}
      </div>
    </div>
  </footer>;
}
