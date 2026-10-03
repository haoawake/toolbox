// 浏览器里直接向 GitHub 查询最新数据（不带 token，每个 IP 每小时 60 次）。
// 一次完整刷新 = 1 次仓库列表 + 每个项目 1 次 Release 列表。

import type { Owner, Release, RepoInfo, ToolboxConfig } from '../types';
import type { GhRelease, GhRepo, GhUser } from './normalize';
import { isListed, toOwner, toReleases, toRepoInfo } from './normalize';

const API = 'https://api.github.com';

export class RateLimitError extends Error {
  resetAt: number;
  constructor(resetAt: number) {
    super('GitHub 接口暂时限流');
    this.resetAt = resetAt;
  }
}

async function call(path: string, accept = 'application/vnd.github+json'): Promise<Response> {
  const res = await fetch(API + path, { headers: { Accept: accept } });
  if (res.status === 429 || (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')) {
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    throw new RateLimitError(reset ? reset * 1000 : Date.now() + 15 * 60_000);
  }
  return res;
}

async function json<T>(path: string, accept?: string): Promise<T | null> {
  const res = await call(path, accept);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub 返回 ${res.status}`);
  return (await res.json()) as T;
}

export interface LiveData {
  fetchedAt: number;
  owner: Owner | null;
  repos: RepoInfo[];
  /** 以小写的 owner/name 为键；没有这个键说明那个仓库这次没取到，沿用快照 */
  releases: Record<string, Release[]>;
  /** 刷新到一半被限流时，恢复的时间 */
  limitedUntil: number | null;
}

let inflight: Promise<LiveData> | null = null;

export function fetchLive(cfg: ToolboxConfig, selfRepo: string | null, needOwner: boolean): Promise<LiveData> {
  inflight ??= doFetchLive(cfg, selfRepo, needOwner).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function doFetchLive(cfg: ToolboxConfig, selfRepo: string | null, needOwner: boolean): Promise<LiveData> {
  const [user, own] = await Promise.all([
    needOwner ? json<GhUser>(`/users/${cfg.owner}`) : Promise.resolve(null),
    json<GhRepo[]>(`/users/${cfg.owner}/repos?type=owner&sort=pushed&per_page=100`),
  ]);
  if (!own) throw new Error(`GitHub 上找不到用户 ${cfg.owner}`);
  const extra = await Promise.all((cfg.extraRepos ?? []).map((full) => json<GhRepo>(`/repos/${full}`).catch(() => null)));

  const seen = new Set<string>();
  const listed: GhRepo[] = [];
  const add = (r: GhRepo | null, explicit: boolean) => {
    if (!r || seen.has(r.full_name.toLowerCase()) || !isListed(r, cfg, selfRepo, explicit)) return;
    seen.add(r.full_name.toLowerCase());
    listed.push(r);
  };
  own.forEach((r) => add(r, false));
  extra.forEach((r) => add(r, true));

  const releases: Record<string, Release[]> = {};
  let limitedUntil: number | null = null;
  await Promise.all(
    listed.map(async (r) => {
      try {
        const list = await json<GhRelease[]>(`/repos/${r.full_name}/releases?per_page=15`, 'application/vnd.github.html+json');
        releases[r.full_name.toLowerCase()] = toReleases(list ?? []);
      } catch (e) {
        if (e instanceof RateLimitError) limitedUntil = e.resetAt;
      }
    }),
  );

  return {
    fetchedAt: Date.now(),
    owner: user ? toOwner(user) : null,
    repos: listed.map((r) => toRepoInfo(r, cfg.owner)),
    releases,
    limitedUntil,
  };
}

const readmeMemo = new Map<string, Promise<string | null>>();

/** 快照里没有的新项目，打开详情页时再单独取 README */
export function fetchReadme(fullName: string): Promise<string | null> {
  let p = readmeMemo.get(fullName);
  if (!p) {
    p = call(`/repos/${fullName}/readme`, 'application/vnd.github.html+json').then((res) => {
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GitHub 返回 ${res.status}`);
      return res.text();
    });
    p.catch(() => readmeMemo.delete(fullName));
    readmeMemo.set(fullName, p);
  }
  return p;
}
