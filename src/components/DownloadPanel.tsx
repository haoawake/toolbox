import { ArrowUpRight, Bug, Check, CircleCheck, Download, FileArchive, Globe, Info, ShieldCheck, Smartphone, TriangleAlert } from 'lucide-react';
import { config } from '../config';
import { compat, digestHex, KIND_LABEL, type ClassifiedAsset } from '../lib/assets';
import { formatBytes, formatCount, formatDateTime, timeAgo } from '../lib/format';
import { archLabel, isDesktopOS, OS_LABEL, platformLabel } from '../lib/platform';
import { sourceZipUrl, type PanelTab, type ViewProject } from '../lib/projects';
import { usePlatform } from '../lib/usePlatform';
import { useNow } from '../lib/useNow';
import type { Asset, AssetOS } from '../types';
import { CodeBlock, CopyButton, DownloadLink, Note } from './bits';
import { OsSwitch } from './OsSwitch';

function CompatNote({ project: p, os, asset }: { project: ViewProject; os: AssetOS; asset: ClassifiedAsset }) {
  const platform = usePlatform();
  if (platform.mobile && isDesktopOS(os))
    return (
      <Note tone="info" icon={<Smartphone size={16} />}>
        你正在用手机浏览。这是电脑软件，建议在电脑上打开本页下载。
        <div className="note-action">
          <CopyButton text={location.href} label="复制本页链接" />
        </div>
      </Note>
    );

  const arch = archLabel(asset.arch, os);
  switch (compat(asset, platform)) {
    case 'match':
      return (
        <Note tone="ok" icon={<CircleCheck size={16} />}>
          已为你选好适合这台电脑的版本
        </Note>
      );
    case 'likely':
      return (
        <Note tone="info" icon={<Info size={16} />}>
          这个版本适用于{arch ? ` ${arch}的` : ''} {OS_LABEL[os]}。
          {os === 'macos' && asset.arch === 'arm64' && '不确定自己的 Mac？点屏幕左上角的苹果图标 →「关于本机」，看「芯片」一栏。'}
          {os === 'windows' && '不确定的话，打开「设置 → 系统 → 系统信息」看「系统类型」。'}
        </Note>
      );
    case 'emulated':
      return (
        <Note tone="info" icon={<Info size={16} />}>
          这是 {arch} 版本，可以在你的电脑上以兼容模式运行。
        </Note>
      );
    case 'mismatch':
      return (
        <Note tone="warn" icon={<TriangleAlert size={16} />}>
          这个安装包是 {arch} 版，可能没法在你的电脑（{platformLabel(platform)}）上运行。
        </Note>
      );
    case 'other-os': {
      if (!platform.os) return null;
      const mine = OS_LABEL[platform.os];
      return (
        <Note tone="muted" icon={<Info size={16} />}>
          这是 {OS_LABEL[os]} 版本，你现在用的是 {mine}。
          {!p.groups.byOS[platform.os]?.length && `这个项目暂时还没有 ${mine} 版。`}
        </Note>
      );
    }
    default:
      return null;
  }
}

function AssetBlock({
  project: p,
  os,
  asset,
  downloaded,
  onDownload,
  onPick,
}: {
  project: ViewProject;
  os: AssetOS;
  asset: ClassifiedAsset;
  downloaded: string | null;
  onDownload: (a: Asset) => void;
  onPick: (name: string) => void;
}) {
  const others = (p.groups.byOS[os] ?? []).filter((a) => a.name !== asset.name);
  const hex = digestHex(asset);
  const done = downloaded === asset.name;
  const arch = archLabel(asset.arch, os);

  return (
    <>
      <CompatNote project={p} os={os} asset={asset} />
      <DownloadLink asset={asset} className={`dl-main ${done ? 'is-done' : ''}`} onDownload={onDownload}>
        <span className="dl-main-ico">{done ? <Check size={21} /> : <Download size={21} />}</span>
        <span className="dl-main-text">
          <strong>{done ? '已开始下载' : `一键下载${os === 'any' ? '' : ` ${OS_LABEL[os]} 版`}`}</strong>
          <small className="mono">{asset.name}</small>
        </span>
        <span className="dl-main-size mono">{formatBytes(asset.size)}</span>
      </DownloadLink>
      {done && <p className="dl-hint">没反应？再点一次，或看看浏览器是否拦截了下载。</p>}
      {config.mirror && (
        <a className="dl-mirror" href={config.mirror + asset.url} rel="noopener noreferrer" onClick={() => onDownload(asset)}>
          下载太慢？试试加速镜像
        </a>
      )}
      <dl className="dl-facts">
        <div>
          <dt>类型</dt>
          <dd>{KIND_LABEL[asset.kind]}</dd>
        </div>
        <div>
          <dt>适用</dt>
          <dd>{os === 'any' ? '所有系统' : arch || OS_LABEL[os]}</dd>
        </div>
        <div>
          <dt>下载次数</dt>
          <dd>{formatCount(asset.downloads)}</dd>
        </div>
      </dl>
      {hex && (
        <div className="dl-sha">
          <span className="dl-sha-label">
            <ShieldCheck size={14} />
            SHA-256
          </span>
          <code className="mono" title={hex}>
            {hex.slice(0, 12)}…{hex.slice(-8)}
          </code>
          <CopyButton text={hex} label="复制校验值" iconOnly />
        </div>
      )}
      {others.length > 0 && (
        <div className="dl-alts">
          <h3 className="dl-sub">其他 {OS_LABEL[os]} 文件</h3>
          {others.map((a) => (
            <DownloadLink
              key={a.name}
              asset={a}
              className="dl-alt"
              onDownload={(x) => {
                onPick(x.name);
                onDownload(x);
              }}
            >
              <span className="mono">{a.name}</span>
              <span className="dl-alt-size">{formatBytes(a.size)}</span>
              <Download size={14} />
            </DownloadLink>
          ))}
        </div>
      )}
    </>
  );
}

function SourceBlock({ project: p }: { project: ViewProject }) {
  return (
    <>
      {!p.installable && (
        <p className="dl-lead">
          作者还没有给这个项目打包安装程序，可以下载源码自己运行{p.homepage ? '，或者直接在线使用' : ''}。
        </p>
      )}
      {p.homepage && (
        <a className="dl-main" href={p.homepage} target="_blank" rel="noopener noreferrer">
          <span className="dl-main-ico">
            <Globe size={21} />
          </span>
          <span className="dl-main-text">
            <strong>在线使用</strong>
            <small className="mono">{p.homepage.replace(/^https?:\/\//, '')}</small>
          </span>
          <ArrowUpRight size={18} />
        </a>
      )}
      <a className={`dl-main ${p.homepage ? 'is-secondary' : ''}`} href={sourceZipUrl(p)} rel="noopener">
        <span className="dl-main-ico">
          <FileArchive size={21} />
        </span>
        <span className="dl-main-text">
          <strong>下载源码 ZIP</strong>
          <small>{p.latest ? `${p.latest.tag} 版本的源码` : `${p.defaultBranch} 分支的最新代码`}</small>
        </span>
      </a>
      <div>
        <h3 className="dl-sub">或者用 Git 克隆</h3>
        <CodeBlock code={`git clone https://github.com/${p.fullName}.git`} />
      </div>
    </>
  );
}

export function DownloadPanel({
  project: p,
  tab,
  onTab,
  asset,
  onPick,
  downloaded,
  onDownload,
}: {
  project: ViewProject;
  tab: PanelTab;
  onTab: (t: PanelTab) => void;
  asset: ClassifiedAsset | null;
  onPick: (name: string) => void;
  downloaded: string | null;
  onDownload: (a: Asset) => void;
}) {
  const now = useNow(60_000);
  const latest = p.latest;
  const tabs: PanelTab[] = [...p.groups.order, 'source'];

  return (
    <section className="dl" aria-label="下载">
      <header className="dl-head">
        {latest && p.installable ? (
          <>
            <div className="dl-ver">
              <span className="mono">{latest.tag}</span>
              {latest.prerelease ? <span className="badge warn">预发布</span> : <span className="badge ok">最新版</span>}
            </div>
            <time className="dl-date" dateTime={latest.publishedAt} title={formatDateTime(latest.publishedAt)}>
              {timeAgo(latest.publishedAt, now)}发布
            </time>
          </>
        ) : (
          <div className="dl-ver">获取这个项目</div>
        )}
      </header>

      {p.installable && (
        <div className="dl-seg">
          <OsSwitch tabs={tabs} value={tab} onChange={onTab} />
        </div>
      )}

      <div className="dl-body">
        {tab === 'source' || !asset ? (
          <SourceBlock project={p} />
        ) : (
          <AssetBlock project={p} os={tab} asset={asset} downloaded={downloaded} onDownload={onDownload} onPick={onPick} />
        )}
      </div>

      {p.override.requirements?.length ? (
        <div className="dl-req">
          <h3 className="dl-sub">使用前需要</h3>
          <ul>
            {p.override.requirements.map((r) => (
              <li key={r}>
                <Check size={14} />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <footer className="dl-links">
        {p.releases.length > 0 ? (
          <a href={`${p.url}/releases`} target="_blank" rel="noopener noreferrer">
            GitHub 发布页
            <ArrowUpRight size={13} />
          </a>
        ) : (
          <a href={p.url} target="_blank" rel="noopener noreferrer">
            GitHub 仓库
            <ArrowUpRight size={13} />
          </a>
        )}
        <a href={`${p.url}/issues`} target="_blank" rel="noopener noreferrer">
          <Bug size={13} />
          反馈问题
        </a>
      </footer>
    </section>
  );
}
