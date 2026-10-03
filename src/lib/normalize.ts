// 把 GitHub API 的原始数据整理成站内结构。快照脚本和浏览器实时刷新都走这里，保证两边结果一致。
// 注意：这个文件会被 Node 直接运行，只能 import type，不能引入别的运行时模块。

import type { Asset, Owner, ProjectOverride, Release, RepoInfo, ToolboxConfig } from '../types';

export interface GhUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
}

export interface GhRepo {
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  homepage: string | null;
  html_url: string;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  license: { spdx_id: string | null; name: string } | null;
  archived: boolean;
  fork: boolean;
  private: boolean;
  created_at: string;
  pushed_at: string;
}

export interface GhAsset {
  name: string;
  label: string | null;
  size: number;
  download_count: number;
  browser_download_url: string;
  content_type: string;
  digest?: string | null;
  state: string;
  updated_at: string;
}

export interface GhRelease {
  tag_name: string;
  name: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  created_at: string;
  html_url: string;
  body_html?: string;
  assets: GhAsset[];
}

export function projectKey(fullName: string, owner: string): string {
  const [o, n] = fullName.split('/');
  return o.toLowerCase() === owner.toLowerCase() ? n : `${o}~${n}`;
}

export function overrideFor(cfg: ToolboxConfig, key: string, fullName: string): ProjectOverride {
  const all = cfg.projects ?? {};
  return all[key] ?? all[fullName] ?? all[fullName.toLowerCase()] ?? {};
}

export function toOwner(u: GhUser): Owner {
  return {
    login: u.login,
    name: u.name || u.login,
    bio: u.bio || '',
    avatarUrl: u.avatar_url,
    url: u.html_url,
  };
}

export function toRepoInfo(r: GhRepo, owner: string): RepoInfo {
  const spdx = r.license?.spdx_id;
  return {
    key: projectKey(r.full_name, owner),
    fullName: r.full_name,
    owner: r.owner.login,
    name: r.name,
    description: (r.description || '').trim(),
    homepage: r.homepage?.trim() || null,
    url: r.html_url,
    language: r.language,
    topics: r.topics ?? [],
    stars: r.stargazers_count,
    forks: r.forks_count,
    openIssues: r.open_issues_count,
    defaultBranch: r.default_branch,
    license: spdx && spdx !== 'NOASSERTION' ? spdx : r.license ? r.license.name : null,
    archived: r.archived,
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
  };
}

function toAsset(a: GhAsset): Asset {
  return {
    name: a.name,
    label: a.label || '',
    size: a.size,
    downloads: a.download_count ?? 0,
    url: a.browser_download_url,
    contentType: a.content_type || '',
    digest: a.digest ?? null,
    updatedAt: a.updated_at,
  };
}

export function toReleases(list: GhRelease[]): Release[] {
  return list
    .filter((r) => !r.draft)
    .map((r) => ({
      tag: r.tag_name,
      name: (r.name || r.tag_name).trim(),
      publishedAt: r.published_at || r.created_at,
      url: r.html_url,
      prerelease: r.prerelease,
      bodyHtml: r.body_html || '',
      assets: (r.assets || []).filter((a) => a.state === 'uploaded').map(toAsset),
    }))
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

/** 和 GitHub 的「Latest」一致：最新的正式版；只有预发布版时退而取最新的预发布版 */
export function latestRelease(releases: Release[]): Release | null {
  return releases.find((r) => !r.prerelease) ?? releases[0] ?? null;
}

export function sumDownloads(releases: Release[]): number {
  let total = 0;
  for (const r of releases) for (const a of r.assets) total += a.downloads;
  return total;
}

/** 判断一个仓库要不要出现在工具库里。explicit 表示它是在 extraRepos 里点名加进来的 */
export function isListed(r: GhRepo, cfg: ToolboxConfig, selfRepo: string | null, explicit: boolean): boolean {
  if (r.private) return false;
  if (r.fork && !explicit && !cfg.includeForks) return false;
  const full = r.full_name.toLowerCase();
  if (selfRepo && full === selfRepo.toLowerCase()) return false;
  // 个人主页 README 仓库（和用户名同名）不是工具
  if (!explicit && r.name.toLowerCase() === r.owner.login.toLowerCase()) return false;
  const hidden = (cfg.hidden ?? []).map((s) => s.toLowerCase());
  if (hidden.includes(r.name.toLowerCase()) || hidden.includes(full)) return false;
  if (overrideFor(cfg, projectKey(r.full_name, cfg.owner), r.full_name).hidden) return false;
  return true;
}
