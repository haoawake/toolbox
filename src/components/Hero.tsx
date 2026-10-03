import type { CSSProperties } from 'react';
import { ArrowDown, ArrowUpRight, Download } from 'lucide-react';
import { config } from '../config';
import { formatBytes, formatCount, looseText, releaseTitle, timeAgo } from '../lib/format';
import { OS_LABEL } from '../lib/platform';
import { quickDownload, type ViewProject } from '../lib/projects';
import { projectHref } from '../lib/router';
import { usePlatform } from '../lib/usePlatform';
import { useNow } from '../lib/useNow';
import type { Owner } from '../types';
import { DownloadLink } from './bits';
import { OSIcon } from './icons';
import { ProjectIcon } from './ProjectIcon';
import { useDownloadNotice } from './useDownloadNotice';

const delay = (i: number) => ({ '--i': i }) as CSSProperties;

function pickSpotlight(projects: ViewProject[]): { project: ViewProject; label: string } | null {
  const featured = config.featured && projects.find((p) => p.key === config.featured);
  if (featured) return { project: featured, label: '站长推荐' };
  const latest = projects
    .filter((p) => p.installable && p.latest)
    .sort((a, b) => Date.parse(b.latest!.publishedAt) - Date.parse(a.latest!.publishedAt))[0];
  return latest ? { project: latest, label: '最新发布' } : null;
}

/** 像应用商店「Today」那样的大卡片，背后用应用图标本身晕出一团颜色 */
function Featured({ project: p, label }: { project: ViewProject; label: string }) {
  const platform = usePlatform();
  const now = useNow(60_000);
  const notify = useDownloadNotice();
  const quick = quickDownload(p, platform);
  const latest = p.latest!;
  // 发布标题只是项目名的话（「同声传译 Live Interpreter」），就不重复显示了
  const raw = releaseTitle(latest.name, latest.tag);
  const title = [p.displayName, p.name].some((n) => looseText(raw).includes(looseText(n))) ? '' : raw;

  return (
    <article className="featured glass reveal" style={delay(4)}>
      {p.iconUrl && <img className="featured-aura" src={p.iconUrl} alt="" aria-hidden="true" />}
      <div className="featured-main">
        <div className="featured-label">
          <span className="live-dot" aria-hidden="true" />
          {label}
          <span className="featured-time">· {timeAgo(latest.publishedAt, now)}</span>
        </div>
        <a className="featured-app" href={projectHref(p.key)}>
          <ProjectIcon project={p} size={84} />
          <div className="featured-heading">
            <h2 className="featured-name">{p.displayName}</h2>
            <div className="featured-sub">
              <span className="badge ver mono">{latest.tag}</span>
              {p.groups.order.map((os) => (
                <span key={os} className="plat">
                  <OSIcon os={os} size={12} />
                  {OS_LABEL[os]}
                </span>
              ))}
            </div>
          </div>
        </a>
        {title && <p className="featured-release">{title}</p>}
        {p.summary && <p className="featured-desc">{p.summary}</p>}
      </div>
      <div className="featured-cta">
        {quick ? (
          <DownloadLink asset={quick.asset} className="btn btn-primary btn-lg" onDownload={(a) => notify(p, a)}>
            <Download size={18} />
            下载 {OS_LABEL[quick.os]} 版
          </DownloadLink>
        ) : (
          <a className="btn btn-primary btn-lg" href={projectHref(p.key)}>
            <Download size={18} />
            去下载
          </a>
        )}
        <a className="btn btn-lg" href={projectHref(p.key)}>
          查看详情
          <ArrowUpRight size={17} />
        </a>
        {quick && (
          <p className="featured-note mono">
            {quick.asset.name} · {formatBytes(quick.asset.size)}
          </p>
        )}
      </div>
    </article>
  );
}

export function Hero({ owner, projects, loading }: { owner: Owner; projects: ViewProject[]; loading: boolean }) {
  const now = useNow(60_000);
  const { title, highlight, tagline } = config.site;
  const at = highlight ? title.indexOf(highlight) : -1;
  const installable = projects.filter((p) => p.installable).length;
  const downloads = projects.reduce((s, p) => s + p.downloadsTotal, 0);
  const lastActivity = projects.reduce((m, p) => Math.max(m, p.activityAt), 0);
  const spot = pickSpotlight(projects);
  const dash = loading ? '—' : null;

  const toCatalog = () => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <section className="hero container">
      <div className="hero-head">
        <a className="hero-owner glass reveal" href={owner.url} target="_blank" rel="noopener noreferrer">
          <img src={owner.avatarUrl} alt="" width={26} height={26} />
          <span>{owner.name}</span>
          <span className="hero-owner-at">@{owner.login}</span>
        </a>
        <h1 className="hero-title reveal" style={delay(1)}>
          {at >= 0 ? (
            <>
              {title.slice(0, at)}
              <span className="hl">{highlight}</span>
              {title.slice(at + highlight!.length)}
            </>
          ) : (
            title
          )}
        </h1>
        <p className="hero-tagline reveal" style={delay(2)}>
          {tagline}
        </p>
        <div className="hero-actions reveal" style={delay(3)}>
          <button type="button" className="btn btn-primary btn-lg" onClick={toCatalog}>
            浏览全部工具
            <ArrowDown size={17} />
          </button>
          <a className="btn btn-lg" href={owner.url} target="_blank" rel="noopener noreferrer">
            GitHub 主页
            <ArrowUpRight size={17} />
          </a>
        </div>
        <dl className="hero-stats glass reveal" style={delay(4)}>
          <div>
            <dt>收录项目</dt>
            <dd>{dash ?? projects.length}</dd>
          </div>
          <div>
            <dt>可一键安装</dt>
            <dd>{dash ?? installable}</dd>
          </div>
          <div>
            <dt>累计下载</dt>
            <dd>{dash ?? formatCount(downloads)}</dd>
          </div>
          <div>
            <dt>最近更新</dt>
            <dd>{dash ?? (lastActivity ? timeAgo(lastActivity, now) : '—')}</dd>
          </div>
        </dl>
      </div>

      {spot ? (
        <Featured project={spot.project} label={spot.label} />
      ) : loading ? (
        <div className="featured glass featured-skeleton" aria-hidden="true">
          <div>
            <div className="skeleton" style={{ width: 120, height: 14 }} />
            <div style={{ display: 'flex', gap: 20, marginTop: 20, alignItems: 'center' }}>
              <div className="skeleton" style={{ width: 84, height: 84, borderRadius: 22 }} />
              <div className="skeleton" style={{ width: 200, height: 26 }} />
            </div>
            <div className="skeleton" style={{ width: '70%', height: 14, marginTop: 22 }} />
          </div>
          <div className="skeleton" style={{ width: 230, height: 50, borderRadius: 999 }} />
        </div>
      ) : null}
    </section>
  );
}
