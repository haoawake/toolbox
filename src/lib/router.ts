// 基于 hash 的路由：#/ 首页，#/p/<项目>[/install|/history] 详情页。
// 用 hash 是为了在 GitHub Pages 上任何子路径都能直接刷新、直接分享链接。

import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

export type Tab = 'readme' | 'install' | 'history';
const TABS: Tab[] = ['readme', 'install', 'history'];

export type Route = { page: 'home' } | { page: 'project'; key: string; tab: Tab | null };

export function parseHash(hash: string): Route {
  let h = hash.replace(/^#\/?/, '');
  try {
    h = decodeURIComponent(h);
  } catch {
    /* 保持原样 */
  }
  const [a, b, c] = h.split('/');
  if (a === 'p' && b) return { page: 'project', key: b, tab: TABS.includes(c as Tab) ? (c as Tab) : null };
  return { page: 'home' };
}

export const homeHref = '#/';
export const projectHref = (key: string, tab?: Tab | null) => `#/p/${encodeURIComponent(key)}${tab ? `/${tab}` : ''}`;

const NAV_EVENT = 'toolbox:navigate';

/** 切换标签页之类的小跳转：改地址但不产生新的历史记录 */
export function replaceHash(href: string) {
  history.replaceState(history.state, '', href);
  window.dispatchEvent(new Event(NAV_EVENT));
}

const pageId = (r: Route) => (r.page === 'home' ? 'home' : `p:${r.key.toLowerCase()}`);
let homeScroll = 0;

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    let current = parseHash(location.hash);

    const onChange = () => {
      const next = parseHash(location.hash);
      const pageChanged = pageId(next) !== pageId(current);
      if (current.page === 'home' && pageChanged) homeScroll = window.scrollY;
      current = next;
      const apply = () => {
        flushSync(() => setRoute(next));
        if (pageChanged) window.scrollTo(0, next.page === 'home' ? homeScroll : 0);
      };
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (pageChanged && !reduce && document.startViewTransition) document.startViewTransition(apply);
      else apply();
    };

    window.addEventListener('hashchange', onChange);
    window.addEventListener(NAV_EVENT, onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener(NAV_EVENT, onChange);
    };
  }, []);

  return route;
}
