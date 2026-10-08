import { useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Archive, Clock, Download, Globe, Scale, SearchX, Star } from 'lucide-react';
import { Empty } from '../components/bits';
import { DownloadPanel } from '../components/DownloadPanel';
import { GithubIcon } from '../components/icons';
import { InstallGuide } from '../components/InstallGuide';
import { ProjectIcon } from '../components/ProjectIcon';
import { Readme } from '../components/Readme';
import { ReleaseHistory } from '../components/ReleaseHistory';
import { Screenshots } from '../components/Screenshots';
import { useToast } from '../components/Toast';
import { pickAsset } from '../lib/assets';
import { formatBytes, formatCount, formatDateTime, timeAgo } from '../lib/format';
import { langColor } from '../lib/lang';
import { defaultPanelTab, type PanelTab, type ViewProject } from '../lib/projects';
import { homeHref, projectHref, replaceHash, type Tab } from '../lib/router';
import { usePlatform } from '../lib/usePlatform';
import { useNow } from '../lib/useNow';
import type { Asset } from '../types';

function ProjectView({ project: p, routeTab }: { project: ViewProject; routeTab: Tab | null }) {
  const platform = usePlatform();
  const toast = useToast();
  const now = useNow(60_000);
  const tabsRef = useRef<HTMLDivElement>(null);

  // 平台：默认按访客的电脑选，用户手动切换过就不再自动改
  const [chosen, setChosen] = useState<PanelTab | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState<string | null>(null);
  const panelTab = chosen && (chosen === 'source' || p.groups.byOS[chosen]?.length) ? chosen : defaultPanelTab(p, platform);
  const list = panelTab === 'source' ? [] : (p.groups.byOS[panelTab] ?? []);
  const asset = (picked ? list.find((a) => a.name === picked) : undefined) ?? (panelTab === 'source' ? null : pickAsset(list, platform, panelTab));

  const defaultTab: Tab = p.readmeHtml === null ? 'install' : 'readme';
  const tab: Tab = routeTab === 'history' && !p.releases.length ? defaultTab : (routeTab ?? defaultTab);
  const setTab = (t: Tab) => replaceHash(projectHref(p.key, t === defaultTab ? null : t));

  const chooseTab = (t: PanelTab) => {
    setChosen(t);
    setPicked(null);
  };

  const showGuide = () => {
    const el = tabsRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 64 || top > window.innerHeight * 0.55) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onDownload = (a: Asset) => {
    setDownloaded(a.name);
    toast({
      tone: 'success',
      title: '已经开始下载',
      description: `${a.name}（${formatBytes(a.size)}）。下面就是安装步骤，跟着做就行。`,
    });
    if (tab !== 'install') setTab('install');
    requestAnimationFrame(showGuide);
  };

  const onDownloadOld = (a: Asset) =>
    toast({ tone: 'success', title: '已经开始下载', description: `${a.name}（${formatBytes(a.size)}）` });

  const tabItems: { id: Tab; label: string; count?: string }[] = [
    { id: 'readme', label: '项目介绍' },
    { id: 'install', label: p.installable ? '安装指南' : '获取源码' },
    ...(p.releases.length
      ? [{ id: 'history' as Tab, label: '版本历史', count: `${p.releases.length}${p.releases.length >= 15 ? '+' : ''}` }]
      : []),
  ];

  const meta: ReactNode[] = [];
  if (p.language)
    meta.push(
      <span key="lang">
        <span className="lang-dot" style={{ background: langColor(p.language) }} />
        {p.language}
      </span>,
    );
  meta.push(
    <span key="stars">
      <Star size={14} />
      {formatCount(p.stars)} 个星标
    </span>,
  );
  if (p.downloadsTotal > 0)
    meta.push(
      <span key="dl">
        <Download size={14} />
        累计下载 {formatCount(p.downloadsTotal)} 次
      </span>,
    );
  meta.push(
    <span key="time" title={formatDateTime(p.activityAt)}>
      <Clock size={14} />
      {timeAgo(p.activityAt, now)}更新
    </span>,
  );
  if (p.license)
    meta.push(
      <span key="license">
        <Scale size={14} />
        {p.license}
      </span>,
    );
  if (p.archived)
    meta.push(
      <span key="archived" className="is-warn">
        <Archive size={14} />
        已归档，不再更新
      </span>,
    );

  return (
    <main className="project container">
      <nav className="crumbs" aria-label="位置">
        <a href={homeHref} className="back">
          <ArrowLeft size={16} />
          工具库
        </a>
        <span className="crumb-sep" aria-hidden="true">
          /
        </span>
        <span className="crumb-current">{p.displayName}</span>
      </nav>

      <header className="p-head">
        <ProjectIcon project={p} size={96} />
        <div className="p-head-main">
          <h1 className="p-title">{p.displayName}</h1>
          <a className="p-repo mono" href={p.url} target="_blank" rel="noopener noreferrer">
            <GithubIcon size={13} />
            {p.fullName}
          </a>
          {p.summary && <p className="p-summary">{p.summary}</p>}
          <div className="p-meta">{meta}</div>
          {p.topics.length > 0 && (
            <div className="topics">
              {p.topics.map((t) => (
                <span key={t} className="topic">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="p-actions">
          {p.homepage && (
            <a className="btn" href={p.homepage} target="_blank" rel="noopener noreferrer">
              <Globe size={16} />
              在线使用
            </a>
          )}
          <a className="btn" href={p.url} target="_blank" rel="noopener noreferrer">
            <GithubIcon size={16} />
            GitHub 仓库
          </a>
          {p.key === 'ipad-remote-desktop' && (
            <>
              <a
                className="btn"
                href="https://github.com/haoawake/ipad-remote-desktop/releases/tag/android-v0.1.0"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={16} />
                Android APK（免费）
              </a>
              <a
                className="btn"
                href="https://github.com/haoawake/ipad-remote-desktop/releases/tag/ipad-v0.1.0"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download size={16} />
                iPad App（IPA）
              </a>
            </>
          )}
        </div>
      </header>

      <Screenshots project={p} />

      <div className="p-body">
        <div className="p-main">
          <div className="tabs" role="tablist" aria-label="项目内容" ref={tabsRef}>
            {tabItems.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="tab-panel"
                className="tab"
                onClick={() => setTab(t.id)}
              >
                {t.label}
                {t.count && <span className="count">{t.count}</span>}
              </button>
            ))}
          </div>
          <div className="tab-panel" role="tabpanel" id="tab-panel" aria-labelledby={`tab-${tab}`} key={tab}>
            {tab === 'readme' && <Readme project={p} />}
            {tab === 'install' && (
              <InstallGuide project={p} tab={panelTab} onTab={chooseTab} asset={asset} downloaded={downloaded} onDownload={onDownload} />
            )}
            {tab === 'history' && <ReleaseHistory project={p} onDownload={onDownloadOld} />}
          </div>
        </div>
        <aside className="p-side">
          <DownloadPanel
            project={p}
            tab={panelTab}
            onTab={chooseTab}
            asset={asset}
            onPick={setPicked}
            downloaded={downloaded}
            onDownload={onDownload}
          />
        </aside>
      </div>
    </main>
  );
}

function ProjectSkeleton() {
  return (
    <main className="project container" aria-busy="true">
      <div className="crumbs">
        <div className="skeleton" style={{ width: 90, height: 14 }} />
      </div>
      <div className="p-head">
        <div className="skeleton" style={{ width: 88, height: 88, borderRadius: 22 }} />
        <div>
          <div className="skeleton" style={{ width: '40%', height: 34 }} />
          <div className="skeleton" style={{ width: '25%', height: 13, marginTop: 12 }} />
          <div className="skeleton" style={{ width: '80%', height: 15, marginTop: 18 }} />
        </div>
      </div>
      <div className="p-body">
        <div className="readme-skeleton">
          {[100, 90, 96, 70].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: `${w}%`, height: 13 }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 320, borderRadius: 24 }} />
      </div>
    </main>
  );
}

export function ProjectPage({
  projectKey,
  tab,
  projects,
  loading,
}: {
  projectKey: string;
  tab: Tab | null;
  projects: ViewProject[];
  loading: boolean;
}) {
  const p = projects.find((x) => x.key.toLowerCase() === projectKey.toLowerCase());
  if (p) return <ProjectView key={p.fullName} project={p} routeTab={tab} />;
  if (loading) return <ProjectSkeleton />;
  return (
    <main className="project container">
      <div className="notfound">
        <Empty
          icon={<SearchX size={24} />}
          title="没找到这个项目"
          action={
            <a className="btn btn-primary" href={homeHref}>
              <ArrowLeft size={16} />
              回到工具库
            </a>
          }
        >
          它可能改了名字、被设为私有，或者被作者藏起来了。
        </Empty>
      </div>
    </main>
  );
}
