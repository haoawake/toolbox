import { useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import { classify } from '../lib/assets';
import { formatBytes, formatDate, formatDateTime, releaseTitle } from '../lib/format';
import type { ViewProject } from '../lib/projects';
import type { Asset, Release } from '../types';
import { DownloadLink } from './bits';
import { OSIcon } from './icons';
import { RichHtml } from './RichHtml';

function ReleaseItem({
  project: p,
  release: r,
  isLatest,
  defaultOpen,
  onDownload,
}: {
  project: ViewProject;
  release: Release;
  isLatest: boolean;
  defaultOpen: boolean;
  onDownload: (a: Asset) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const title = releaseTitle(r.name, r.tag);
  const assets = useMemo(() => {
    const all = r.assets.map(classify);
    return [...all.filter((a) => !a.aux), ...all.filter((a) => a.aux)];
  }, [r.assets]);

  return (
    <article className={`rel ${open ? 'is-open' : ''}`}>
      <button type="button" className="rel-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="rel-tag mono">{r.tag}</span>
        {isLatest && <span className="badge ok">最新版</span>}
        {r.prerelease && <span className="badge warn">预发布</span>}
        <span className="rel-name">{title}</span>
        <time className="rel-date" dateTime={r.publishedAt} title={formatDateTime(r.publishedAt)}>
          {formatDate(r.publishedAt)}
        </time>
        <ChevronDown size={16} className="chev" aria-hidden="true" />
      </button>
      {open && (
        <div className="rel-body">
          {r.bodyHtml ? (
            <RichHtml html={r.bodyHtml} className="rel-notes" ctx={{ fullName: p.fullName, branch: p.defaultBranch }} />
          ) : (
            <p className="rel-empty">这个版本没有写更新说明。</p>
          )}
          {assets.length > 0 && (
            <div className="rel-assets">
              {assets.map((a) => (
                <DownloadLink
                  key={a.name}
                  asset={a}
                  className={`asset-chip ${a.aux ? 'is-aux' : ''}`}
                  title={`下载 ${a.name}`}
                  onDownload={onDownload}
                >
                  {a.os && <OSIcon os={a.os} size={13} />}
                  <span className="mono">{a.name}</span>
                  <span className="asset-size">{formatBytes(a.size)}</span>
                </DownloadLink>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export function ReleaseHistory({ project: p, onDownload }: { project: ViewProject; onDownload: (a: Asset) => void }) {
  return (
    <div className="history">
      {p.releases.map((r, i) => (
        <ReleaseItem
          key={r.tag}
          project={p}
          release={r}
          isLatest={r.tag === p.latest?.tag}
          defaultOpen={i === 0}
          onDownload={onDownload}
        />
      ))}
      <a className="history-more" href={`${p.url}/releases`} target="_blank" rel="noopener noreferrer">
        在 GitHub 上查看全部版本
        <ArrowUpRight size={14} />
      </a>
    </div>
  );
}
