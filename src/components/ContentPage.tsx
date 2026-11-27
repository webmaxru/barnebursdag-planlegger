import { useEffect, useState } from 'react';
import Footer from './Footer';

type ContentPageProps = { path: string };

type Page = {
  path: string;
  section: string;
  title: string;
  description: string;
  lead: string;
  eyebrow: string;
  dates: string;
  breadcrumbs: string;
  html: string;
};

// Content pages (guides, recipes, trust pages) live in content/**/*.md. In production every page is
// prerendered to its own static HTML by scripts/prerender.mjs; this component is the dev-server and
// fallback renderer, reading the same generated public/content.json (scripts/build-content.mjs).
const CONTENT_PREFIXES = ['/guider', '/oppskrifter', '/om-kakeklar', '/nytt', '/om-utvikleren', '/personvern', '/vilkar', '/kontakt'];

export function isContentPath(path: string) {
  return CONTENT_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
}

let cache: Page[] | null = null;
async function loadPages(): Promise<Page[]> {
  if (cache) return cache;
  const res = await fetch('/content.json');
  if (!res.ok) throw new Error(`content.json ${res.status}`);
  cache = (await res.json()) as Page[];
  return cache;
}

export default function ContentPage({ path }: ContentPageProps) {
  const [page, setPage] = useState<Page | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');

  useEffect(() => {
    let alive = true;
    loadPages()
      .then((pages) => {
        if (!alive) return;
        const found = pages.find((p) => p.path === path) || null;
        setPage(found);
        setState(found ? 'ok' : 'missing');
      })
      .catch(() => alive && setState('error'));
    return () => {
      alive = false;
    };
  }, [path]);

  useEffect(() => {
    if (!page) return;
    document.title = `${page.title} · Kakeklar`;
    document.querySelector('meta[name="description"]')?.setAttribute('content', page.description);
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://kakeklar.no${page.path}`);
  }, [page]);

  return (
    <div className="content-page">
      <nav className="site-nav" aria-label="Hovedmeny">
        <a className="content-back" href="/">← Til Kakeklar</a>
        <a href="/guider">Guider</a>
        <a href="/oppskrifter">Oppskrifter</a>
      </nav>
      {page && <div dangerouslySetInnerHTML={{ __html: page.breadcrumbs }} />}
      <header className="content-header">
        <p className="hero-eyebrow">{page?.eyebrow ?? 'Kakeklar'}</p>
        <h1>{page?.title ?? (state === 'loading' ? 'Laster …' : 'Fant ikke siden')}</h1>
        {page && <p>{page.lead || page.description}</p>}
        {page?.dates && <p className="content-meta">{page.dates}</p>}
      </header>
      <main className="content-body">
        {page && <div dangerouslySetInnerHTML={{ __html: page.html }} />}
        {state === 'missing' && (
          <p>
            Siden finnes ikke. Prøv <a href="/">kalkulatoren</a> eller <a href="/guider">guidene</a>.
          </p>
        )}
        {state === 'error' && <p>Kunne ikke laste innholdet. Kjør <code>npm run content</code> og last siden på nytt.</p>}
      </main>
      <Footer />
    </div>
  );
}
