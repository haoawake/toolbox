import type { CSSProperties, PointerEvent } from 'react';
import { ArrowUpRight, Clock, Download, Star } from 'lucide-react';
import { formatBytes, formatCount, formatDateTime, timeAgo } from '../lib/format';
import { langColor } from '../lib/lang';
import { OS_LABEL } from '../lib/platform';
import { quickDownload, type ViewProject } from '../lib/projects';
import { projectHref } from '../lib/router';
import { usePlatform } from '../lib/usePlatform';
import { useNow } from '../lib/useNow';
import { DownloadLink } from './bits';
import { OSIcon } from './icons';
import { ProjectIcon } from './ProjectIcon';
import { useDownloadNotice } from './useDownloadNotice';

// 鼠标在卡片上移动时，光晕跟着走
function trackPointer(e: PointerEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
}

export function ProjectCard({ project: p, index }: { project: ViewProject; index: number }) {
  const platform = usePlatform();
  const now = useNow(60_000);
  const notify = useDownloadNotice();
  const quick = quickDownload(p, platform);
  const quickLabel = quick ? `下载 ${OS_LABEL[quick.os]} 版 · ${formatBytes(quick.asset.size)}` : '';

  return (
    <article className="card reveal" style={{ '--i': Math.min(index, 8) } as CSSProperties} onPointerMove={trackPointer}>
      <div className="card-top">
        <ProjectIcon project={p} size={52} />
        <div className="card-heading">
          <h3 className="card-name">
            <a href={projectHref(p.key)} className="stretched">
              {p.displayName}
            </a>
          </h3>
          <div className="card-repo mono">{p.fullName}</div>
        </div>
        {p.installable && p.latest ? <span className="badge ver mono">{p.latest.tag}</span> : <span className="badge">源码</span>}
      </div>

      <p className={`card-desc ${p.summary ? '' : 'is-empty'}`}>
        {p.summary || (p.readmeHtml === null ? '这个项目还没有写介绍。' : '还没有一句话简介，点进来看看 README 吧。')}
      </p>

      {(p.installable || p.topics.length > 0) && (
        <div className="chips">
          {p.installable
            ? p.groups.order.map((os) => (
                <span key={os} className="plat">
                  <OSIcon os={os} size={12} />
                  {OS_LABEL[os]}
                </span>
              ))
            : p.topics.slice(0, 3).map((t) => (
                <span key={t} className="topic">
                  #{t}
                </span>
              ))}
          {!p.installable && p.topics.length > 3 && <span className="topic is-more">+{p.topics.length - 3}</span>}
        </div>
      )}

      <footer className="card-foot">
        {p.language && (
          <span className="meta">
            <span className="lang-dot" style={{ background: langColor(p.language) }} />
            {p.language}
          </span>
        )}
        {p.stars > 0 && (
          <span className="meta" title={`${p.stars} 个星标`}>
            <Star size={13} />
            {formatCount(p.stars)}
          </span>
        )}
        {p.downloadsTotal > 0 && (
          <span className="meta" title={`累计下载 ${p.downloadsTotal} 次`}>
            <Download size={13} />
            {formatCount(p.downloadsTotal)}
          </span>
        )}
        <span className="meta" title={`最近更新：${formatDateTime(p.activityAt)}`}>
          <Clock size={13} />
          {timeAgo(p.activityAt, now)}
        </span>
        {quick ? (
          <DownloadLink
            asset={quick.asset}
            className="get-btn"
            data-tip={quickLabel}
            aria-label={`${p.displayName}：${quickLabel}`}
            onDownload={(a) => notify(p, a)}
          >
            <Download size={14} strokeWidth={2.4} />
            下载
          </DownloadLink>
        ) : (
          <span className="get-btn is-ghost" aria-hidden="true">
            查看
            <ArrowUpRight size={14} strokeWidth={2.4} />
          </span>
        )}
      </footer>
    </article>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="card is-skeleton" aria-hidden="true">
      <div className="card-top">
        <div className="skeleton" style={{ width: 52, height: 52, borderRadius: 14 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '55%', height: 16 }} />
          <div className="skeleton" style={{ width: '38%', height: 12, marginTop: 8 }} />
        </div>
      </div>
      <div>
        <div className="skeleton" style={{ height: 12 }} />
        <div className="skeleton" style={{ height: 12, marginTop: 8, width: '85%' }} />
        <div className="skeleton" style={{ height: 12, marginTop: 8, width: '60%' }} />
      </div>
      <div className="card-foot">
        <div className="skeleton" style={{ width: 120, height: 12 }} />
      </div>
    </div>
  );
}
