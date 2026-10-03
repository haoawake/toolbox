// 各处复用的小组件：复制按钮、终端代码块、带行内代码的文字、下载链接、提示条、空状态。

import { useEffect, useRef, useState, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import type { Asset } from '../types';
import { copyText } from '../lib/clipboard';

export function CopyButton({
  text,
  label = '复制',
  iconOnly = false,
  className = '',
}: {
  text: string;
  label?: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async () => {
    if (!(await copyText(text))) return;
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1600);
  };

  return (
    <button
      type="button"
      className={`copy-btn ${iconOnly ? 'icon-only' : ''} ${done ? 'is-done' : ''} ${className}`}
      onClick={onClick}
      aria-label={done ? '已复制' : label}
      title={done ? '已复制' : label}
    >
      {done ? <Check size={15} /> : <Copy size={15} />}
      <span className="copy-label">{done ? '已复制' : label}</span>
    </button>
  );
}

export function CodeBlock({ code }: { code: string }) {
  return (
    <div className="codeblock">
      <pre>
        <code>{code}</code>
      </pre>
      <CopyButton text={code} label="复制命令" iconOnly />
    </div>
  );
}

/** 把 `反引号` 包起来的部分渲染成行内代码 */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.length > 2 && p.startsWith('`') && p.endsWith('`') ? <code key={i}>{p.slice(1, -1)}</code> : p,
      )}
    </>
  );
}

type DownloadLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'onClick'> & {
  asset: Asset;
  onDownload?: (asset: Asset) => void;
};

/** GitHub 的下载地址会返回附件，点了浏览器直接开始下载，页面不会跳走 */
export function DownloadLink({ asset, onDownload, children, ...rest }: DownloadLinkProps) {
  return (
    <a href={asset.url} download={asset.name} rel="noopener" onClick={() => onDownload?.(asset)} {...rest}>
      {children}
    </a>
  );
}

export function Note({
  tone,
  icon,
  children,
}: {
  tone: 'ok' | 'info' | 'warn' | 'muted';
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`note tone-${tone}`}>
      {icon}
      <div>{children}</div>
    </div>
  );
}

export function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-ico">{icon}</span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
