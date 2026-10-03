import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { writeString } from './cache';

export type Theme = 'light' | 'dark';

const KEY = 'toolbox:theme';
const media = () => matchMedia('(prefers-color-scheme: dark)');

function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return media().matches ? 'dark' : 'light';
}

/** 返回当前主题和切换函数。切换时从点击位置展开一个圆形过渡（浏览器支持的话） */
export function useTheme(): [Theme, (origin?: { x: number; y: number }) => void] {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  useEffect(() => {
    const m = media();
    const onChange = () => {
      if (!document.documentElement.dataset.theme) setTheme(m.matches ? 'dark' : 'light');
    };
    m.addEventListener('change', onChange);
    return () => m.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#07090f' : '#f6f4ef');
  }, [theme]);

  const toggle = useCallback(
    (origin?: { x: number; y: number }) => {
      const next: Theme = theme === 'dark' ? 'light' : 'dark';
      const root = document.documentElement;
      const apply = () => {
        root.dataset.theme = next;
        writeString(KEY, next);
        flushSync(() => setTheme(next));
      };
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!document.startViewTransition || reduce) return apply();
      root.style.setProperty('--vt-x', `${origin?.x ?? innerWidth / 2}px`);
      root.style.setProperty('--vt-y', `${origin?.y ?? 0}px`);
      root.classList.add('theme-vt');
      const vt = document.startViewTransition(apply);
      void vt.finished.finally(() => root.classList.remove('theme-vt'));
    },
    [theme],
  );

  return [theme, toggle];
}
