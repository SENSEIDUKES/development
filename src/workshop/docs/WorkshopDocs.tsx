import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { ArrowRight, BookOpen, ChevronDown, Menu, Search, X } from 'lucide-react';
import { SEIDrawer, SEIDrawerClose, SEIDrawerContent, SEIDrawerTitle, SEIDrawerTrigger } from '@seihouse/ui';
import { docsCategories, docsHref, findDocsTopic, searchDocs } from './catalog';
import './docs.css';

interface DocsProps {
  topicId: string;
  onNavigate: (id: string) => void;
}

interface TopicNavigationProps extends DocsProps {
  collapsedCategories: ReadonlySet<string>;
  onToggleCategory: (id: string) => void;
}

function TopicLink({ id, onNavigate, children, ...props }: {
  id: string;
  onNavigate: (id: string) => void;
  children: ReactNode;
  className?: string;
  'aria-current'?: 'page';
}) {
  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    // Real URLs also support copying a link and opening it in a new tab.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(id);
  }
  return <a href={docsHref(id)} onClick={navigate} {...props}>{children}</a>;
}

function TopicNavigation({ topicId, onNavigate, collapsedCategories, onToggleCategory }: TopicNavigationProps) {
  const instanceId = useId();
  return (
    <nav aria-label="Docs topics" className="docs-navigation">
      <TopicLink id="overview" onNavigate={onNavigate} aria-current={topicId === 'overview' ? 'page' : undefined}>Overview</TopicLink>
      {docsCategories.map(category => (
        <section key={category.id}>
          <h2>
            <button type="button" className="docs-category-toggle" aria-expanded={!collapsedCategories.has(category.id)}
              aria-controls={`${instanceId}-topics-${category.id}`} onClick={() => onToggleCategory(category.id)}>
              <span>{category.title}</span><ChevronDown aria-hidden="true" size={15} />
            </button>
          </h2>
          <ul id={`${instanceId}-topics-${category.id}`} hidden={collapsedCategories.has(category.id)}>
            {category.topics.map(topic => (
              <li key={topic.id}>
                <TopicLink id={topic.id} onNavigate={onNavigate} aria-current={topicId === topic.id ? 'page' : undefined}>
                  {topic.title}
                </TopicLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}

export function WorkshopDocs({ topicId, onNavigate }: DocsProps) {
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<ReadonlySet<string>>(
    () => new Set(docsCategories.map(category => category.id)),
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusArticle = useRef(false);
  const topic = findDocsTopic(topicId);
  const category = docsCategories.find(group => group.topics.some(entry => entry.id === topicId));
  const searching = query.trim().length > 0;
  const results = searching ? searchDocs(query) : [];

  useEffect(() => {
    if (focusArticle.current && !drawerOpen) {
      headingRef.current?.focus({ preventScroll: true });
      focusArticle.current = false;
    }
  }, [topicId, drawerOpen, searching]);

  useEffect(() => {
    // Do not leave an invisible modal trapping focus after rotating a device.
    const desktop = window.matchMedia('(min-width: 56rem)');
    const closeOnDesktop = () => { if (desktop.matches) setDrawerOpen(false); };
    desktop.addEventListener('change', closeOnDesktop);
    const restoreArticle = () => { setQuery(''); setDrawerOpen(false); };
    window.addEventListener('popstate', restoreArticle);
    return () => {
      desktop.removeEventListener('change', closeOnDesktop);
      window.removeEventListener('popstate', restoreArticle);
    };
  }, []);

  function navigate(id: string) {
    focusArticle.current = true;
    setQuery('');
    setDrawerOpen(false);
    onNavigate(id);
    // Also handle selecting the already-open topic.
    if (!drawerOpen && !searching && id === topicId) headingRef.current?.focus({ preventScroll: true });
  }

  function toggleCategory(id: string) {
    setCollapsedCategories(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const navigationProps = { topicId, onNavigate: navigate, collapsedCategories, onToggleCategory: toggleCategory };

  return (
    <div className="workshop-docs">
      <header className="docs-toolbar">
        <div className="docs-label"><BookOpen size={20} aria-hidden="true" /><span>Docs</span></div>
        <div className="docs-toolbar-actions">
          <SEIDrawer open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SEIDrawerTrigger className="docs-menu-button" aria-label="Browse Docs topics">
              <Menu size={20} aria-hidden="true" />
            </SEIDrawerTrigger>
            <SEIDrawerContent unstyled side="left" className="docs-drawer" backdropClassName="docs-drawer-backdrop"
              finalFocus={focusArticle.current ? headingRef : undefined}>
              <div className="docs-drawer-header">
                <SEIDrawerTitle className="docs-drawer-title">Docs topics</SEIDrawerTitle>
                <SEIDrawerClose className="docs-icon-button" aria-label="Close Docs topics"><X size={20} aria-hidden="true" /></SEIDrawerClose>
              </div>
              <div className="docs-drawer-scroll"><TopicNavigation {...navigationProps} /></div>
            </SEIDrawerContent>
          </SEIDrawer>
          <div className="docs-search" role="search">
            <Search size={18} aria-hidden="true" />
            <input ref={searchRef} type="search" aria-label="Search Docs" placeholder="Search Docs"
              value={query} onChange={event => setQuery(event.target.value)}
              onKeyDown={event => { if (event.key === 'Escape') setQuery(''); }} />
            {query && <button type="button" className="docs-icon-button" aria-label="Clear search" onClick={() => { setQuery(''); searchRef.current?.focus(); }}><X size={16} aria-hidden="true" /></button>}
          </div>
        </div>
      </header>

      <div className="docs-layout">
        <aside className="docs-sidebar"><TopicNavigation {...navigationProps} /></aside>
        <article className="docs-article" aria-labelledby="docs-article-title">
          {searching ? (
            <>
              <p className="docs-eyebrow">Find a term</p>
              <h1 id="docs-article-title" ref={headingRef} tabIndex={-1}>Search results</h1>
              <p className="docs-search-count" role="status">{results.length} {results.length === 1 ? 'result' : 'results'} for “{query.trim()}”</p>
              {results.length ? (
                <ul className="docs-results">{results.map(result => (
                  <li key={result.id}>
                    <TopicLink id={result.id} onNavigate={navigate}>
                      <span><small>{result.category}</small><strong>{result.title}</strong>{result.definition && <p>{result.definition}</p>}</span>
                      <ArrowRight size={18} aria-hidden="true" />
                    </TopicLink>
                  </li>
                ))}</ul>
              ) : <p className="docs-muted">Try a term such as SPP, HARNESS, or Arc Goal, or browse the topics.</p>}
            </>
          ) : topicId === 'overview' ? (
            <>
              <p className="docs-eyebrow">The shared reference</p>
              <h1 id="docs-article-title" ref={headingRef} tabIndex={-1}>What each thing is.<br />How it all fits.</h1>
              <p className="docs-intro">A common understanding of SEIHouse’s core concepts, for people and models.</p>
              <div className="docs-category-index">
                {docsCategories.map(group => (
                  <section key={group.id}>
                    <h2>
                      <button type="button" className="docs-category-toggle" aria-expanded={!collapsedCategories.has(group.id)}
                        aria-controls={`docs-overview-topics-${group.id}`} onClick={() => toggleCategory(group.id)}>
                        <span>{group.title}</span><ChevronDown aria-hidden="true" size={17} />
                      </button>
                    </h2>
                    <div id={`docs-overview-topics-${group.id}`} hidden={collapsedCategories.has(group.id)}>
                      <p>{group.description}</p>
                      <ul>{group.topics.map(entry => <li key={entry.id}><TopicLink id={entry.id} onNavigate={navigate}>{entry.title}</TopicLink></li>)}</ul>
                    </div>
                  </section>
                ))}
              </div>
            </>
          ) : topic ? (
            <>
              <p className="docs-eyebrow"><TopicLink id="overview" onNavigate={navigate}>Docs</TopicLink><span aria-hidden="true"> / </span>{category?.title}</p>
              <h1 id="docs-article-title" ref={headingRef} tabIndex={-1}>{topic.title}</h1>
              <section className="docs-definition">
                <h2>What it is</h2>
                <p className={topic.definition ? undefined : 'docs-muted'}>{topic.definition ?? 'The definition for this term hasn’t been added yet.'}</p>
              </section>
              <section className="docs-definition">
                <h2>How it fits</h2>
                <p className={topic.howItFits ? undefined : 'docs-muted'}>{topic.howItFits ?? 'Its place in the product and its connections will be explained here.'}</p>
              </section>
              {!!topic.related?.length && <section className="docs-definition">
                <h2>Related terms</h2>
                <ul className="docs-related">{topic.related.map(id => <li key={id}><TopicLink id={id} onNavigate={navigate}>{findDocsTopic(id)?.title ?? id}</TopicLink></li>)}</ul>
              </section>}
              <TopicLink id="overview" onNavigate={navigate} className="docs-back-link">Browse all topics <ArrowRight size={16} aria-hidden="true" /></TopicLink>
            </>
          ) : (
            <>
              <p className="docs-eyebrow">Docs</p>
              <h1 id="docs-article-title" ref={headingRef} tabIndex={-1}>Topic not found</h1>
              <p className="docs-intro">This link doesn’t match a Docs topic.</p>
              <TopicLink id="overview" onNavigate={navigate} className="docs-back-link">Browse all topics <ArrowRight size={16} aria-hidden="true" /></TopicLink>
            </>
          )}
        </article>
      </div>
    </div>
  );
}
