// 处理 GitHub 渲染好的 README / 更新说明：消毒、把相对链接改成 GitHub 上的绝对地址、
// 去掉和页面标题重复的第一个大标题，并给代码块加上复制按钮。

import DOMPurify from 'dompurify';
import { looseText } from './format';

export interface HtmlContext {
  fullName: string;
  branch: string;
  /** 如果第一个一级标题就是这些名字之一，就把它（以及它上面单独的 logo）去掉 */
  stripTitle?: string[];
}

const COPY_SVG =
  '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

const isAbsolute = (u: string) => /^[a-z][a-z0-9+.-]*:|^\/\//i.test(u);

function isLogoOnly(el: Element): boolean {
  return /^(P|DIV)$/.test(el.tagName) && el.querySelectorAll('img').length === 1 && !(el.textContent ?? '').trim();
}

function stripTitle(root: DocumentFragment, names: string[]) {
  const article = root.querySelector('article') ?? root;
  const head = Array.from(article.children)
    .slice(0, 4)
    .find((el) => (el.matches('.markdown-heading') ? !!el.querySelector('h1') : el.tagName === 'H1'));
  if (!head) return;
  const text = looseText(head.textContent ?? '');
  if (!names.some((n) => looseText(n) && text.includes(looseText(n)))) return;
  let prev = head.previousElementSibling;
  while (prev) {
    const el = prev;
    prev = prev.previousElementSibling;
    if (isLogoOnly(el)) el.remove();
  }
  head.remove();
}

const BADGE = /shields\.io|badgen\.net|badge|codecov|travis-ci|\/actions\/workflows\/|visitor|hits\./i;

export interface Screenshot {
  src: string;
  alt: string;
}

/** 从 README 里挑出像截图的图片（排除徽章、小图标和已经去掉的 logo），做成应用商店那样的预览 */
export function extractScreenshots(html: string, ctx: HtmlContext): Screenshot[] {
  const tpl = document.createElement('template');
  tpl.innerHTML = prepareHtml(html, ctx);
  const seen = new Set<string>();
  const shots: Screenshot[] = [];
  tpl.content.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') ?? '';
    const canonical = img.getAttribute('data-canonical-src') ?? '';
    const width = Number(img.getAttribute('width')) || Infinity;
    const height = Number(img.getAttribute('height')) || Infinity;
    if (!src || seen.has(src) || BADGE.test(src) || BADGE.test(canonical)) return;
    if (/\.svg(\?|$)/i.test(canonical || src) || width < 240 || height < 140) return;
    seen.add(src);
    shots.push({ src, alt: img.getAttribute('alt') ?? '' });
  });
  return shots.slice(0, 8);
}

export function prepareHtml(html: string, ctx: HtmlContext): string {
  const clean = DOMPurify.sanitize(html, {
    FORBID_TAGS: ['style', 'form', 'button', 'textarea', 'select'],
    FORBID_ATTR: ['style'],
  });
  const tpl = document.createElement('template');
  tpl.innerHTML = clean;
  const root = tpl.content;

  // README 不一定在仓库根目录，相对链接要以它所在的目录为基准
  const path = root.querySelector('[data-path]')?.getAttribute('data-path') ?? '';
  const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
  const rawBase = `https://raw.githubusercontent.com/${ctx.fullName}/${ctx.branch}/`;
  const blobBase = `https://github.com/${ctx.fullName}/blob/${ctx.branch}/`;
  const resolve = (u: string, base: string) => {
    try {
      return u.startsWith('/') ? new URL(u.slice(1), base).href : new URL(u, base + dir).href;
    } catch {
      return u;
    }
  };

  root.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !isAbsolute(src)) img.setAttribute('src', resolve(src, rawBase));
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
  });
  root.querySelectorAll('source[srcset]').forEach((s) => {
    const v = s.getAttribute('srcset')!;
    if (!isAbsolute(v)) s.setAttribute('srcset', resolve(v, rawBase));
  });
  root.querySelectorAll('a[href]').forEach((a) => {
    let href = a.getAttribute('href')!;
    if (href.startsWith('#')) return;
    if (!isAbsolute(href)) {
      href = resolve(href, blobBase);
      a.setAttribute('href', href);
    }
    if (/^https?:/i.test(href)) {
      a.setAttribute('target', '_blank');
      a.setAttribute('rel', 'noopener noreferrer');
    }
  });

  if (ctx.stripTitle?.length) stripTitle(root, ctx.stripTitle);

  root.querySelectorAll('pre').forEach((pre) => {
    let host = pre.parentElement;
    if (!host?.matches('.highlight, .snippet-clipboard-content')) {
      host = document.createElement('div');
      pre.replaceWith(host);
      host.appendChild(pre);
    }
    host.classList.add('md-code');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'md-copy';
    btn.setAttribute('aria-label', '复制代码');
    btn.title = '复制';
    btn.innerHTML = COPY_SVG;
    host.appendChild(btn);
  });

  return tpl.innerHTML;
}
