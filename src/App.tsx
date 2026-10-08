import { useEffect } from 'react';
import { Footer } from './components/Footer';
import { ToastProvider } from './components/Toast';
import { TopBar } from './components/TopBar';
import { config } from './config';
import { useRoute } from './lib/router';
import { PlatformContext, usePlatformDetection } from './lib/usePlatform';
import { useToolbox } from './lib/useToolbox';
import { Home } from './pages/Home';
import { ProjectPage } from './pages/ProjectPage';

export default function App() {
  const platform = usePlatformDetection();
  const route = useRoute();
  const { loading, owner, projects, data, selfRepo } = useToolbox();
  const isHome = route.page === 'home';
  const current = route.page === 'project' ? projects.find((p) => p.key.toLowerCase() === route.key.toLowerCase()) : null;

  useEffect(() => {
    document.title = current ? `${current.displayName} · ${config.site.title}` : config.site.title;
  }, [current]);

  return (
    <PlatformContext value={platform}>
      <ToastProvider>
        <div className="backdrop" aria-hidden="true">
          <span className="blob b1" />
          <span className="blob b2" />
          <span className="blob b3" />
          <span className="blob b4" />
        </div>
        <TopBar owner={owner} />
        <div id="main" className={isHome ? 'is-home' : undefined}>
          {isHome ? (
            <Home
              projects={projects}
              loading={loading}
              failed={data.state === 'error'}
              onRetry={() => location.reload()}
            />
          ) : (
            <ProjectPage projectKey={route.key} tab={route.tab} projects={projects} loading={loading} />
          )}
        </div>
        {!isHome && <Footer owner={owner} data={data} selfRepo={selfRepo} />}
      </ToastProvider>
    </PlatformContext>
  );
}
