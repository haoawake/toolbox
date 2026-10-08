import type { ViewProject } from '../lib/projects';
import { projectHref } from '../lib/router';
import { ProjectIcon } from '../components/ProjectIcon';
import { CloudOff, RefreshCw } from 'lucide-react';

// Keep the home page a single-screen app launcher. Newly published repositories
// still appear automatically; this map only supplies concise display subtitles.
const subtitles: Record<string, string> = {
  'neu-helper': '校园课程、作业与日程助手',
  'live-interpreter': '实时翻译与双语字幕',
  'ipad-remote-desktop': '用 iPad 远程操控电脑',
  'career-radar': '职位搜索与简历工作台',
  'lan-transfer': '局域网跨设备文件互传',
  'disk-lens': '扫描、整理和清理磁盘',
  'omni-convert': '图片、视频和文档格式转换',
  'linkedin-cn-translator': 'LinkedIn 档案自动翻译',
  'BluetoothPhoneAudio-OneClick': '让手机声音从电脑播放',
};

export function Home({
  projects,
  loading,
  failed,
  onRetry,
}: {
  projects: ViewProject[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
}) {
  return (
    <main className="home-launcher container">
      <header className="launcher-heading">
        <p className="launcher-eyebrow">HAOAWAKE / TOOLBOX</p>
        <h1>
          全部应用
          <span className="launcher-count">{loading ? '…' : `${projects.length} 个`}</span>
        </h1>
        <p className="launcher-subtitle">选择一个应用，查看介绍与下载。</p>
      </header>

      {failed && projects.length === 0 ? (
        <div className="launcher-error" role="alert">
          <CloudOff size={26} />
          <strong>暂时无法加载应用</strong>
          <button className="btn" type="button" onClick={onRetry}>
            <RefreshCw size={15} />
            重试
          </button>
        </div>
      ) : (
        <div className="launcher-grid" aria-label="全部应用" aria-busy={loading}>
          {loading
            ? Array.from({ length: 9 }, (_, i) => (
                <div className="launcher-item launcher-placeholder" key={i} aria-hidden="true">
                  <span className="launcher-placeholder-icon skeleton" />
                  <span className="launcher-placeholder-name skeleton" />
                </div>
              ))
            : projects.map((p) => (
                <a
                  key={p.fullName}
                  className="launcher-item"
                  href={projectHref(p.key)}
                  aria-label={`${p.displayName}，查看介绍与下载`}
                  title={p.displayName}
                >
                  <ProjectIcon project={p} size={48} />
                  <span className="launcher-name">{p.displayName}</span>
                  <span className="launcher-description">{subtitles[p.name] || p.summary || '查看应用介绍与下载'}</span>
                </a>
              ))}
        </div>
      )}
    </main>
  );
}
