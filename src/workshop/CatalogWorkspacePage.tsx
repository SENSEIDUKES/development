import type { ReactNode } from 'react';

export function CatalogWorkspacePage({
  title,
  section,
  description,
  children,
}: {
  title: string;
  section: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="workshop-home">
      <div className="workshop-shell">
        <header className="workshop-header">
          <h1 className="workshop-title">{title}</h1>
          <p className="workshop-kicker">{section}</p>
          <p className="workshop-subtitle">{description}</p>
        </header>
        {children}
      </div>
    </main>
  );
}
