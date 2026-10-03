import { config } from '../config';
import type { AssetOS, Project, ProjectOverride, Release } from '../types';
import { groupAssets, pickAsset, type AssetGroups, type ClassifiedAsset } from './assets';
import { latestRelease, overrideFor } from './normalize';
import type { Platform } from './platform';

export interface ViewProject extends Project {
  displayName: string;
  summary: string;
  override: ProjectOverride;
  latest: Release | null;
  groups: AssetGroups;
  /** 最新版本里有能直接下载的安装包 */
  installable: boolean;
  iconUrl: string | null;
  /** 最近一次动静（发版或推送代码）的时间戳 */
  activityAt: number;
}

export type PanelTab = AssetOS | 'source';

const isUrl = (s: string) => /^https?:\/\//i.test(s);

function resolveIcon(p: Project, o: ProjectOverride): string | null {
  if (p.icon) return isUrl(p.icon) ? p.icon : import.meta.env.BASE_URL + p.icon;
  if (o.icon)
    return isUrl(o.icon)
      ? o.icon
      : `https://raw.githubusercontent.com/${p.fullName}/${p.defaultBranch}/${o.icon.replace(/^\/+/, '')}`;
  return null;
}

export function toView(p: Project): ViewProject {
  const override = overrideFor(config, p.key, p.fullName);
  const latest = latestRelease(p.releases);
  const groups = groupAssets(latest);
  return {
    ...p,
    homepage: override.homepage ?? p.homepage,
    displayName: override.displayName || p.name,
    summary: override.tagline || p.description,
    override,
    latest,
    groups,
    installable: groups.order.length > 0,
    iconUrl: resolveIcon(p, override),
    activityAt: Math.max(Date.parse(p.pushedAt) || 0, latest ? Date.parse(latest.publishedAt) : 0),
  };
}

/** 详情页默认选中哪个平台 */
export function defaultPanelTab(p: ViewProject, pf: Platform): PanelTab {
  if (!p.installable) return 'source';
  if (pf.os && p.groups.byOS[pf.os]?.length) return pf.os;
  if (p.groups.byOS.any?.length) return 'any';
  return p.groups.order[0];
}

/** 卡片上的快捷下载：只有访客的系统有对应安装包时才给 */
export function quickDownload(p: ViewProject, pf: Platform): { os: AssetOS; asset: ClassifiedAsset } | null {
  if (!pf.os || pf.mobile || !p.installable) return null;
  const os: AssetOS | null = p.groups.byOS[pf.os]?.length ? pf.os : p.groups.byOS.any?.length ? 'any' : null;
  if (!os) return null;
  const asset = pickAsset(p.groups.byOS[os], pf, os);
  return asset ? { os, asset } : null;
}

const encodeRef = (ref: string) => ref.split('/').map(encodeURIComponent).join('/');

export function sourceZipUrl(p: ViewProject): string {
  return p.latest
    ? `https://github.com/${p.fullName}/archive/refs/tags/${encodeRef(p.latest.tag)}.zip`
    : `https://github.com/${p.fullName}/archive/refs/heads/${encodeRef(p.defaultBranch)}.zip`;
}

export function guideProject(p: ViewProject) {
  return {
    fullName: p.fullName,
    name: p.name,
    displayName: p.displayName,
    language: p.language,
    override: p.override,
    version: p.latest?.tag ?? null,
  };
}
