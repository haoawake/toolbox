import { Catalog, type CatalogState } from '../components/Catalog';
import { Hero } from '../components/Hero';
import type { ViewProject } from '../lib/projects';
import type { Owner } from '../types';

export function Home({
  owner,
  projects,
  loading,
  failed,
  onRetry,
  catalog,
  onCatalog,
}: {
  owner: Owner;
  projects: ViewProject[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  catalog: CatalogState;
  onCatalog: (s: CatalogState) => void;
}) {
  return (
    <main className="home">
      <Hero owner={owner} projects={projects} loading={loading} />
      <Catalog projects={projects} loading={loading} failed={failed} onRetry={onRetry} state={catalog} onChange={onCatalog} />
    </main>
  );
}
