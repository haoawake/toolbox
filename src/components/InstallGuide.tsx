import { Bug, Check, ChevronDown, CircleHelp, Download, FileArchive, Lightbulb, PartyPopper, Star } from 'lucide-react';
import type { ClassifiedAsset } from '../lib/assets';
import { formatBytes } from '../lib/format';
import { installGuide, sourceGuide } from '../lib/install';
import { OS_LABEL } from '../lib/platform';
import { guideProject, sourceZipUrl, type PanelTab, type ViewProject } from '../lib/projects';
import type { Asset } from '../types';
import { CodeBlock, DownloadLink, RichText } from './bits';
import { OsSwitch } from './OsSwitch';

export function InstallGuide({
  project: p,
  tab,
  onTab,
  asset,
  downloaded,
  onDownload,
}: {
  project: ViewProject;
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  asset: ClassifiedAsset | null;
  downloaded: string | null;
  onDownload: (a: Asset) => void;
}) {
  const source = tab === 'source' || !asset;
  const guide = source ? sourceGuide(guideProject(p)) : installGuide(guideProject(p), tab, asset);
  const done = !!asset && downloaded === asset.name;

  return (
    <div className="guide">
      <div className="guide-head">
        <div>
          <h2 className="guide-title">{source ? '获取源码' : `${OS_LABEL[tab]} 安装指南`}</h2>
          <p className="guide-lead">
            {source ? '适合想自己运行、或者想改改代码的同学。' : `跟着下面 ${guide.steps.length} 步走，几分钟就能装好。`}
          </p>
        </div>
        {p.installable && <OsSwitch tabs={[...p.groups.order, 'source']} value={tab} onChange={onTab} compact />}
      </div>

      <ol className="steps">
        {guide.steps.map((s, i) => {
          const isDone = s.kind === 'download' && done;
          return (
            <li key={`${tab}-${i}`} className={`step ${isDone ? 'is-done' : ''}`}>
              <span className="step-num" aria-hidden="true">
                {isDone ? <Check size={18} strokeWidth={3} /> : i + 1}
              </span>
              <div className="step-content">
                <h3 className="step-title">
                  <span className="sr-only">第 {i + 1} 步：</span>
                  {s.title}
                </h3>
                {s.body && (
                  <p className="step-body">
                    <RichText text={s.body} />
                  </p>
                )}
                {s.kind === 'download' && asset && (
                  <DownloadLink asset={asset} className="btn btn-primary step-dl" onDownload={onDownload}>
                    <Download size={17} />
                    {isDone ? '再下载一次' : '点这里下载'}
                    <span className="btn-sub">{formatBytes(asset.size)}</span>
                  </DownloadLink>
                )}
                {s.kind === 'source' && (
                  <a className="btn btn-primary step-dl" href={sourceZipUrl(p)} rel="noopener">
                    <FileArchive size={17} />
                    下载源码 ZIP
                  </a>
                )}
                {s.code && <CodeBlock code={s.code} />}
                {s.tip && (
                  <div className="tip">
                    <Lightbulb size={16} />
                    <p>
                      <RichText text={s.tip} />
                    </p>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {guide.trouble.length > 0 && (
        <section className="trouble-wrap">
          <h3 className="trouble-title">
            <CircleHelp size={18} />
            遇到问题？
          </h3>
          <div className="trouble">
            {guide.trouble.map((t, i) => (
              <details key={`${tab}-${i}`}>
                <summary>
                  <span className="trouble-q" aria-hidden="true">
                    ?
                  </span>
                  <span>{t.title}</span>
                  <ChevronDown size={16} className="chev" aria-hidden="true" />
                </summary>
                <div className="trouble-body">
                  {t.body && (
                    <p>
                      <RichText text={t.body} />
                    </p>
                  )}
                  {t.code && <CodeBlock code={t.code} />}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <div className="finish">
        <PartyPopper size={24} />
        <div className="finish-text">
          <strong>装好啦？</strong>
          <p>觉得好用的话，去 GitHub 点个 Star；遇到 bug 也欢迎提 Issue。</p>
        </div>
        <div className="finish-actions">
          <a className="btn" href={p.url} target="_blank" rel="noopener noreferrer">
            <Star size={15} />
            点个 Star
          </a>
          <a className="btn btn-ghost" href={`${p.url}/issues/new`} target="_blank" rel="noopener noreferrer">
            <Bug size={15} />
            反馈问题
          </a>
        </div>
      </div>
    </div>
  );
}
