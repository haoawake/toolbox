// 快照脚本（Node）和网页共用的数据结构。这里只放类型，保证 Node 直接运行 .ts 时可以被完整擦除。

export type OS = 'windows' | 'macos' | 'linux' | 'android' | 'ios';
/** 安装包适用的平台；any 表示文件名里看不出平台（通常是跨平台的包） */
export type AssetOS = OS | 'any';
export type Arch = 'x64' | 'arm64' | 'x86' | 'universal';

export interface Asset {
  name: string;
  label: string;
  size: number;
  downloads: number;
  url: string;
  contentType: string;
  /** 形如 sha256:abcd…；老的 Release 没有这个字段 */
  digest: string | null;
  updatedAt: string;
}

export interface Release {
  tag: string;
  name: string;
  publishedAt: string;
  url: string;
  prerelease: boolean;
  bodyHtml: string;
  assets: Asset[];
}

export interface RepoInfo {
  /** 路由用的键：自己的仓库就是仓库名，别人的仓库是 owner~name */
  key: string;
  fullName: string;
  owner: string;
  name: string;
  description: string;
  homepage: string | null;
  url: string;
  language: string | null;
  topics: string[];
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  license: string | null;
  archived: boolean;
  createdAt: string;
  pushedAt: string;
}

export interface Project extends RepoInfo {
  /** 最新的在前，已去掉草稿 */
  releases: Release[];
  downloadsTotal: number;
  /** GitHub 渲染好的 README；null 表示仓库没有 README，undefined 表示还没取 */
  readmeHtml?: string | null;
  /** 站内图标路径（相对站点根目录）或绝对 URL */
  icon: string | null;
}

export interface Owner {
  login: string;
  name: string;
  bio: string;
  avatarUrl: string;
  url: string;
}

export interface Snapshot {
  version: 1;
  generatedAt: string;
  owner: Owner;
  /** 工具库自己的仓库，不在列表里展示 */
  selfRepo: string | null;
  projects: Project[];
}

// ---------------------------------------------------------------- 配置

export interface InstallStep {
  title: string;
  /** 支持 `行内代码`，以及 {asset} {app} {version} 占位符 */
  body?: string;
  code?: string;
  tip?: string;
}

export interface ProjectOverride {
  displayName?: string;
  tagline?: string;
  /** 仓库里的相对路径，或完整的图片 URL */
  icon?: string;
  /** 展示哪个 README（仓库里的相对路径）；不填时优先用 README.zh-CN.md 这类中文版 */
  readme?: string;
  /** 安装后的应用名，用在 macOS 的 .app 路径等地方 */
  appName?: string;
  homepage?: string;
  hidden?: boolean;
  requirements?: string[];
  /** 自定义安装步骤（接在自动生成的「下载」一步后面），按平台区分；source 是「获取源码」页的步骤 */
  install?: Partial<Record<AssetOS | 'source', InstallStep[]>>;
  /** 追加的常见问题，按平台区分 */
  troubleshooting?: Partial<Record<AssetOS | 'source', InstallStep[]>>;
}

export interface ToolboxConfig {
  owner: string;
  site: {
    title: string;
    highlight?: string;
    eyebrow?: string;
    tagline: string;
  };
  includeForks?: boolean;
  hidden?: string[];
  extraRepos?: string[];
  featured?: string;
  selfRepo?: string;
  /** 下载加速前缀，例如 https://example.com/ ，留空则不显示 */
  mirror?: string;
  liveRefreshMinutes?: number;
  projects?: Record<string, ProjectOverride>;
}
