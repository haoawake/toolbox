import { useEffect, useState } from 'react';
import type { CatalogState } from './components/Catalog';
import { Footer } from './components/Footer';
import { Starfield } from './components/Starfield';
import { ToastProvider } from './components/Toast';
import { TopBar } from './components/TopBar';
import { config } from './config';
import { useRoute } from './lib/router';
import { useTheme } from './lib/theme';
import { PlatformContext, usePlatformDetection } from './lib/usePlatform';
import { useToolbox } from './lib/useToolbox';
import { Home } from './pages/Home';
import { ProjectPage } from './pages/ProjectPage';

export default function App() {
  const platform = usePlatformDetection();
  const [theme, toggleTheme] = useTheme();
  const route = useRoute();
  const { loading, owner, projects, sync, refresh, selfRepo } = useToolbox();
  // 放在这里而不是首页里，从详情页返回时搜索和筛选还在
  const [catalog, setCatalog] = useState<CatalogState>({ filter: 'all', query: '', sort: 'recommended' });

  const current = route.page === 'project' ? projects.find((p) => p.key.toLowerCase() === route.key.toLowerCase()) : null;
  useEffect(() => {
    document.title = current ? `${current.displayName} · ${config.site.title}` : config.site.title;
  }, [current]);

  return (
    <PlatformContext value={platform}>
      <ToastProvider>
        <div className="backdrop" aria-hidden="true">
          <div className="backdrop-glow" />
          <Starfield theme={theme} />
          <div className="backdrop-grain" />
        </div>
        <TopBar sync={sync} onRefresh={refresh} theme={theme} onToggleTheme={toggleTheme} ownerUrl={owner.url} />
        <div id="main">
          {route.page === 'home' ? (
            <Home
              owner={owner}
              projects={projects}
              loading={loading}
              failed={sync.state === 'error'}
              onRetry={refresh}
              catalog={catalog}
              onCatalog={setCatalog}
            />
          ) : (
            <ProjectPage projectKey={route.key} tab={route.tab} projects={projects} loading={loading} />
          )}
        </div>
        <Footer owner={owner} sync={sync} selfRepo={selfRepo} />
      </ToastProvider>
    </PlatformContext>
  );
}
