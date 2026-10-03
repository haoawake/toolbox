import { config } from '../config';
import { formatDateTime } from '../lib/format';
import type { DataInfo } from '../lib/useToolbox';
import type { Owner } from '../types';
import { GithubIcon } from './icons';
import { Logo } from './Logo';

export function Footer({ owner, data, selfRepo }: { owner: Owner; data: DataInfo; selfRepo: string | null }) {
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
            安装包全部直接来自 GitHub Releases，数据每天自动更新一次。
            {data.updatedAt && <span className="footer-fresh">最近更新：{formatDateTime(data.updatedAt)}</span>}
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
