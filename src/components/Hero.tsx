import type { CSSProperties } from 'react';
import { ArrowUpRight, Download } from 'lucide-react';
import { config } from '../config';
import { formatBytes, formatCount, looseText, releaseTitle, timeAgo } from '../lib/format';
import { OS_LABEL } from '../lib/platform';
import { quickDownload, type ViewProject } from '../lib/projects';
import { projectHref } from '../lib/router';
import { usePlatform } from '../lib/usePlatform';
import { useNow } from '../lib/useNow';
import type { Owner } from '../types';
import { DownloadLink } from './bits';
import { OSIcon, Sparkle } from './icons';
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

function Spotlight({ project: p, label }: { project: ViewProject; label: string }) {
  const platform = usePlatform();
  const now = useNow(60_000);
  const notify = useDownloadNotice();
  const quick = quickDownload(p, platform);
  const latest = p.latest!;
  // 发布标题只是项目名的话（「同声传译 Live Interpreter」），就不重复显示了
  const raw = releaseTitle(latest.name, latest.tag);
  const title = [p.displayName, p.name].some((n) => looseText(raw).includes(looseText(n))) ? '' : raw;

  return (
    <div className="spot-wrap reveal" style={delay(3)}>
      <div className="spot-stack" aria-hidden="true" />
      <article className="spot">
        <div className="spot-top">
          <span className="spot-label">
            <span className="pulse" aria-hidden="true" />
            {label}
          </span>
          <time dateTime={latest.publishedAt}>{timeAgo(latest.publishedAt, now)}</time>
        </div>
        <a className="spot-main" href={projectHref(p.key)}>
          <ProjectIcon project={p} size={64} />
          <div className="spot-heading">
            <h2 className="spot-name">{p.displayName}</h2>
            <span className="badge gold mono">{latest.tag}</span>
          </div>
        </a>
        {title && <p className="spot-release">{title}</p>}
        {p.summary && <p className="spot-desc">{p.summary}</p>}
        <div className="chips">
          {p.groups.order.map((os) => (
            <span key={os} className="plat">
              <OSIcon os={os} size={12} />
              {OS_LABEL[os]}
            </span>
          ))}
        </div>
        <div className="spot-actions">
          {quick ? (
            <DownloadLink asset={quick.asset} className="btn btn-primary" onDownload={(a) => notify(p, a)}>
              <Download size={17} />
              下载 {OS_LABEL[quick.os]} 版<span className="btn-sub">{formatBytes(quick.asset.size)}</span>
            </DownloadLink>
          ) : (
            <a className="btn btn-primary" href={projectHref(p.key)}>
              <Download size={17} />
              去下载
            </a>
          )}
          <a className="btn btn-ghost" href={projectHref(p.key)}>
            看看详情
            <ArrowUpRight size={16} />
          </a>
        </div>
      </article>
    </div>
  );
}

export function Hero({ owner, projects, loading }: { owner: Owner; projects: ViewProject[]; loading: boolean }) {
  const now = useNow(60_000);
  const { title, highlight, eyebrow, tagline } = config.site;
  const at = highlight ? title.indexOf(highlight) : -1;
  const installable = projects.filter((p) => p.installable).length;
  const downloads = projects.reduce((s, p) => s + p.downloadsTotal, 0);
  const lastActivity = projects.reduce((m, p) => Math.max(m, p.activityAt), 0);
  const spot = pickSpotlight(projects);
  const dash = loading ? '—' : null;

  return (
    <section className="hero container">
      <div className="hero-copy">
        {eyebrow && (
          <div className="eyebrow reveal">
            <span className="eyebrow-moon" aria-hidden="true" />
            {eyebrow}
          </div>
        )}
        <h1 className="hero-title reveal" style={delay(1)}>
          {at >= 0 ? (
            <>
              {title.slice(0, at)}
              <span className="hl-wrap">
                <span className="hl">{highlight}</span>
                <Sparkle className="hl-spark" size={18} />
              </span>
              {title.slice(at + highlight!.length)}
            </>
          ) : (
            title
          )}
        </h1>
        <p className="hero-tagline reveal" style={delay(2)}>
          {tagline}
        </p>
        {owner.bio && (
          <figure className="hero-quote reveal" style={delay(3)}>
            <blockquote>{owner.bio}</blockquote>
            <figcaption>
              <img src={owner.avatarUrl} alt="" width={24} height={24} />
              <a href={owner.url} target="_blank" rel="noopener noreferrer">
                {owner.name} · @{owner.login}
              </a>
            </figcaption>
          </figure>
        )}
        <dl className="hero-stats reveal" style={delay(4)}>
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

      <div className="hero-aside">
        <div className="moon" aria-hidden="true" />
        {spot ? (
          <Spotlight project={spot.project} label={spot.label} />
        ) : loading ? (
          <div className="spot-wrap">
            <div className="spot spot-skeleton">
              <div className="skeleton" style={{ width: '40%', height: 14 }} />
              <div className="skeleton" style={{ width: 64, height: 64, borderRadius: 16, marginTop: 20 }} />
              <div className="skeleton" style={{ width: '80%', height: 14, marginTop: 20 }} />
              <div className="skeleton" style={{ width: '100%', height: 44, marginTop: 24, borderRadius: 13 }} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
