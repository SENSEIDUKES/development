import type { HTMLAttributes, ReactNode } from 'react';
import { ChevronRight, Globe } from 'lucide-react';
import { SEIDisclosure, SEIDisclosureGroup } from '@seihouse/ui';
import { getSenLanguageLabel, type SenLanguageCode } from '@seihouse/sen/contracts';
import { LIBRARY_FOOTER_SOCIAL_GLYPHS, LIBRARY_FOOTER_SOCIAL_LABELS, type LibraryFooterSocialNetwork } from './LibraryFooterSocialIcons';
import './library-footer.css';

/** The footer's title, set above the company statement. */
export const LIBRARY_FOOTER_TITLE = 'NovelExpanded';
/** The company statement, read beneath the title. */
export const LIBRARY_FOOTER_STATEMENT = 'A BETTER TIME CAPSULE AND TRANSLATOR OF ARTISTIC EXPRESSION';
/** The legal line, dated from the current year so it never goes stale. */
export function libraryFooterCopyright(year = new Date().getFullYear()) {
  return `© ${year} SEIHouse Productions LLC`;
}

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
}

const hasDestination = (item: { href?: string; onSelect?: () => void }) => Boolean(item.href || item.onSelect);

/** Renders an action as a real link or a real button; never a dead anchor. */
function FooterControl({ item, className, children, ...props }: { item: LibraryFooterAction | LibraryFooterSocialLink; className: string; children: ReactNode } & Omit<HTMLAttributes<HTMLElement>, 'children'>) {
  const shared = { className, title: 'title' in item ? item.title : undefined, ...props };
  const disabled = 'disabled' in item && item.disabled;
  // A disabled link would still navigate, so a disabled destination is always
  // rendered as a disabled button, whichever kind the host supplied.
  if (item.href && !disabled) {
    return <a {...shared} href={item.href} target="_blank" rel="noreferrer">{children}</a>;
  }
  return <button {...shared} type="button" onClick={disabled ? undefined : item.onSelect} disabled={disabled || undefined}>{children}</button>;
}

/**
 * The Celestial Library platform footer. Library-owned chrome, like the global
 * header and bottom navigation: it opens on its title and the company statement, then three
 * closed menus, the social row, the account's language entry and the legal row. Every
 * destination comes from the host; the footer holds no routes or URLs of its own.
 */
export function LibraryFooter({ groups, social, legal, language, className = '', ...props }: LibraryFooterProps) {
  const visibleGroups = groups.map(group => ({ ...group, items: group.items.filter(hasDestination) })).filter(group => group.items.length > 0);
  const visibleSocial = social.filter(hasDestination);
  const visibleLegal = legal.filter(hasDestination);
  return <footer {...props} data-library-footer className={`library-footer ${className}`.trim()} aria-label="Celestial Library footer">
    <div className="library-footer-inner">
      <div className="library-footer-identity">
        <p className="library-footer-title" data-footer-title>{LIBRARY_FOOTER_TITLE}</p>
        <p className="library-footer-statement">{LIBRARY_FOOTER_STATEMENT}</p>
      </div>

      <div className="library-footer-controls">
        {visibleGroups.length > 0 && <div className="library-footer-menus">
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
        </div>}

        {visibleSocial.length > 0 && <div className="library-footer-social">
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
        </div>}

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
        <p className="library-footer-copyright">{libraryFooterCopyright()}</p>
        {visibleLegal.length > 0 && <ul className="library-footer-legal-links" aria-label="Legal">
          {visibleLegal.map(item => <li key={item.id}>
            <FooterControl item={item} className="library-footer-legal-link">{item.label}</FooterControl>
          </li>)}
        </ul>}
      </div>
    </div>
  </footer>;
}
