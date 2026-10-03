import { useEffect, useMemo, useRef } from 'react';
import { copyText } from '../lib/clipboard';
import { prepareHtml, type HtmlContext } from '../lib/html';

/** 显示 GitHub 渲染的 Markdown：代码块可复制，页内锚点平滑滚动（不打断 hash 路由） */
export function RichHtml({ html, ctx, className = '' }: { html: string; ctx: HtmlContext; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const titles = ctx.stripTitle?.join('\u0000') ?? '';
  const prepared = useMemo(
    () => prepareHtml(html, { fullName: ctx.fullName, branch: ctx.branch, stripTitle: titles ? titles.split('\u0000') : undefined }),
    [html, ctx.fullName, ctx.branch, titles],
  );

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element;
      const copy = target.closest<HTMLButtonElement>('.md-copy');
      if (copy) {
        const pre = copy.parentElement?.querySelector('pre');
        if (pre)
          void copyText(pre.innerText.replace(/\n$/, '')).then((ok) => {
            if (!ok) return;
            copy.classList.add('is-done');
            window.setTimeout(() => copy.classList.remove('is-done'), 1500);
          });
        return;
      }
      const a = target.closest('a');
      const href = a?.getAttribute('href');
      if (!a || !href?.startsWith('#')) return;
      e.preventDefault();
      let id = href.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        /* 保持原样 */
      }
      const el =
        root.querySelector(`[id="user-content-${CSS.escape(id)}"]`) ??
        root.querySelector(`[id="${CSS.escape(id)}"]`) ??
        root.querySelector(`[name="${CSS.escape(id)}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [prepared]);

  return <div ref={ref} className={`markdown-body ${className}`} dangerouslySetInnerHTML={{ __html: prepared }} />;
}
