import { useEffect, useState } from 'react';
import { config } from '../config';
import { homeHref } from '../lib/router';
import type { Owner } from '../types';
import { GithubIcon } from './icons';
import { Logo } from './Logo';

/** 悬浮在页面顶部的玻璃胶囊导航 */
export function TopBar({ owner }: { owner: Owner }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`topbar ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container">
        <nav className="topbar-inner glass" aria-label="主导航">
          <a href={homeHref} className="brand" aria-label={`${config.site.title}首页`}>
            <Logo size={32} />
            <span className="brand-name">{config.site.title}</span>
          </a>
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
