import { useEffect, useState } from 'react';
import { LoaderCircle, RefreshCw } from 'lucide-react';
import { config } from '../config';
import { formatTime, timeAgo } from '../lib/format';
import { homeHref } from '../lib/router';
import { useNow } from '../lib/useNow';
import type { SyncInfo } from '../lib/useToolbox';
import type { Owner } from '../types';
import { GithubIcon } from './icons';
import { Logo } from './Logo';

function describe(sync: SyncInfo, now: number) {
  switch (sync.state) {
    case 'loading':
    case 'syncing':
      return { tone: 'busy', text: '同步中', detail: '正在向 GitHub 查询最新版本…' };
    case 'live':
      return {
        tone: 'ok',
        text: '已是最新',
        detail: `${timeAgo(sync.liveAt, now)}从 GitHub 获取了最新版本。点一下重新检查。`,
      };
    case 'fallback': {
      const at = sync.liveAt ?? sync.snapshotAt;
      const until = sync.limitedUntil && sync.limitedUntil > now ? `，大约 ${formatTime(sync.limitedUntil)} 恢复` : '';
      return {
        tone: 'warn',
        text: '离线数据',
        detail: `${sync.message ?? '暂时连不上 GitHub'}${until}。现在显示的是${at ? ` ${timeAgo(at, now)}` : '之前'}的数据，下载不受影响。`,
      };
    }
    default:
      return { tone: 'err', text: '连接失败', detail: '暂时连不上 GitHub，点一下重试。' };
  }
}

/** 悬浮在页面顶部的玻璃胶囊导航 */
export function TopBar({ sync, onRefresh, owner }: { sync: SyncInfo; onRefresh: () => void; owner: Owner }) {
  const [scrolled, setScrolled] = useState(false);
  const now = useNow(30_000);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const s = describe(sync, now);
  const busy = sync.state === 'loading' || sync.state === 'syncing';
  const limited = (sync.limitedUntil ?? 0) > now;

  return (
    <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container">
        <nav className="topbar-inner glass" aria-label="主导航">
          <a href={homeHref} className="brand" aria-label={`${config.site.title}首页`}>
            <Logo size={32} />
            <span className="brand-name">{config.site.title}</span>
          </a>

          <button
            type="button"
            className={`sync-pill tone-${s.tone}`}
            onClick={onRefresh}
            disabled={busy || limited}
            title={s.detail}
            aria-label={`${s.text}。${s.detail}`}
          >
            <span className="sync-dot" aria-hidden="true" />
            <span className="sync-text">{s.text}</span>
            {busy ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : <RefreshCw size={13} aria-hidden="true" />}
          </button>

          <a
            className="icon-btn"
            href={owner.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="作者的 GitHub 主页"
            title="作者的 GitHub 主页"
          >
            <GithubIcon size={18} />
          </a>
        </nav>
      </div>
    </header>
  );
}
