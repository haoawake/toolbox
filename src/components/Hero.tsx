import type { CSSProperties } from 'react';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { config } from '../config';
import { formatCount, timeAgo } from '../lib/format';
import type { ViewProject } from '../lib/projects';
import { useNow } from '../lib/useNow';
import type { Owner } from '../types';

const delay = (i: number) => ({ '--i': i }) as CSSProperties;

export function Hero({ owner, projects, loading }: { owner: Owner; projects: ViewProject[]; loading: boolean }) {
  const now = useNow(60_000);
  const { title, highlight, tagline } = config.site;
  const at = highlight ? title.indexOf(highlight) : -1;
  const installable = projects.filter((p) => p.installable).length;
  const downloads = projects.reduce((s, p) => s + p.downloadsTotal, 0);
  const lastActivity = projects.reduce((m, p) => Math.max(m, p.activityAt), 0);
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
    </section>
  );
}
