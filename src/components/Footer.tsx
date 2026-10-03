import { config } from '../config';
import { formatDateTime, timeAgo } from '../lib/format';
import { useNow } from '../lib/useNow';
import type { SyncInfo } from '../lib/useToolbox';
import type { Owner } from '../types';
import { GithubIcon } from './icons';
import { Logo } from './Logo';

export function Footer({ owner, sync, selfRepo }: { owner: Owner; sync: SyncInfo; selfRepo: string | null }) {
  const now = useNow(60_000);
  const freshness = sync.liveAt
    ? `最近一次同步：${timeAgo(sync.liveAt, now)}`
    : sync.snapshotAt
      ? `数据快照：${formatDateTime(sync.snapshotAt)}`
      : '';

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Logo size={34} />
          <div>
            <strong>{config.site.title}</strong>
            <p>{config.site.tagline}</p>
          </div>
        </div>
        <div className="footer-meta">
          <p>
            安装包全部直接来自 GitHub Releases，有新版本会自动出现在这里。
            {freshness && <span className="footer-fresh">{freshness}</span>}
          </p>
          <p className="footer-links">
            <a href={owner.url} target="_blank" rel="noopener noreferrer">
              <GithubIcon size={14} />@{owner.login}
            </a>
            {selfRepo && (
              <a href={`https://github.com/${selfRepo}`} target="_blank" rel="noopener noreferrer">
                工具库源码
              </a>
            )}
          </p>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} {owner.name}</span>
        {owner.bio && <span className="footer-motto">{owner.bio}</span>}
      </div>
    </footer>
  );
}
