/**
 * 拉取 GitHub 数据，生成 public/data/snapshot.json，并把项目图标下载到 public/data/icons/。
 *
 *   npm run snapshot
 *
 * 设置环境变量 GITHUB_TOKEN 可以把接口限额从每小时 60 次提到 5000 次（GitHub Actions 里会自动提供）。
 * 网页打开时会先显示这份快照，再实时向 GitHub 查询最新版本，所以快照稍微旧一点也没关系。
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Project, Snapshot, ToolboxConfig } from '../src/types.ts';
import type { GhRelease, GhRepo, GhUser } from '../src/lib/normalize.ts';
import { isListed, overrideFor, sumDownloads, toOwner, toReleases, toRepoInfo } from '../src/lib/normalize.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'data');
const ICON_DIR = join(OUT_DIR, 'icons');
const API = 'https://api.github.com';
/** 快照里保留多少个版本的更新说明（下载总数仍按全部版本统计） */
const HISTORY = 15;
const MAX_ICON_BYTES = 1.5 * 1024 * 1024;
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

const config = JSON.parse(await readFile(join(ROOT, 'toolbox.config.json'), 'utf8')) as ToolboxConfig;

class RateLimited extends Error {}

let calls = 0;

async function gh(path: string, accept = 'application/vnd.github+json'): Promise<Response> {
  calls++;
  const res = await fetch(API + path, {
    headers: {
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'haoawake-toolbox-snapshot',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if ((res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0') {
    const reset = new Date(Number(res.headers.get('x-ratelimit-reset')) * 1000);
    throw new RateLimited(
      `GitHub 接口限流了，${reset.toLocaleTimeString('zh-CN')} 后恢复。设置 GITHUB_TOKEN 环境变量可以提高限额。`,
    );
  }
  return res;
}

async function getJson<T>(path: string, accept?: string): Promise<T | null> {
  const res = await gh(path, accept);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path} → ${res.status} ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

async function getAll<T>(path: string, accept?: string, maxPages = 10): Promise<T[]> {
  const out: T[] = [];
  const sep = path.includes('?') ? '&' : '?';
  for (let page = 1; page <= maxPages; page++) {
    const batch = await getJson<T[]>(`${path}${sep}per_page=100&page=${page}`, accept);
    if (!batch) break;
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

function warn(msg: string) {
  console.warn(`  ! ${msg}`);
}

async function soft<T>(what: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof RateLimited) throw e;
    warn(`${what}：${(e as Error).message}`);
    return fallback;
  }
}

const encodePath = (path: string) => path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');

/** 取 GitHub 渲染好的 README HTML。path 为空时用仓库默认的 README */
async function getReadme(fullName: string, path: string | null): Promise<string | null> {
  const url = path ? `/repos/${fullName}/contents/${encodePath(path)}` : `/repos/${fullName}/readme`;
  const res = await gh(url, 'application/vnd.github.html+json');
  if (res.status === 404) return path ? getReadme(fullName, null) : null;
  if (!res.ok) throw new Error(`README → ${res.status}`);
  return res.text();
}

const ZH_README = /^readme[._-](zh([-_](cn|hans|sg))?|cn|chs|chinese)\.(md|markdown)$/i;

async function getTree(fullName: string, branch: string): Promise<string[] | null> {
  const tree = await getJson<{ tree: { path: string; type: string }[] }>(
    `/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
  return tree ? tree.tree.filter((t) => t.type === 'blob').map((t) => t.path) : null;
}

// ---------------------------------------------------------------- 图标

const ICON_NAME = /(^|\/)(app[-_]?icon|icon|logo|favicon)([-_@.]?\d+(?:x\d+)?)?\.(png|svg|webp|jpe?g)$/i;
const SKIP_DIR =
  /(^|\/)(node_modules|vendor|third[-_]?party|dist|build|out|coverage|tests?|fixtures|examples?|screenshots?)\//i;

/** 在仓库文件里挑一个最像应用图标的文件 */
function pickIcon(paths: string[]): string | null {
  let best: { path: string; score: number } | null = null;
  for (const path of paths) {
    const m = path.match(ICON_NAME);
    if (!m || SKIP_DIR.test(path)) continue;
    const depth = path.split('/').length - 1;
    if (depth > 3) continue;
    const base = m[2].toLowerCase();
    const size = Number(m[3]?.match(/\d+/)?.[0] ?? NaN);
    const ext = m[4].toLowerCase();
    let score = base.includes('icon') && base !== 'favicon' ? 30 : base === 'logo' ? 22 : 12;
    score -= depth * 4;
    score += ext === 'svg' ? 4 : ext === 'png' ? 3 : 0;
    if (size >= 128 && size <= 512) score += 6;
    else if (size > 512) score += 2;
    else if (size >= 16 && size < 64) score -= 8;
    if (!best || score > best.score) best = { path, score };
  }
  return best?.path ?? null;
}

async function saveIcon(key: string, fullName: string, branch: string, path: string): Promise<string | null> {
  const url = /^https?:\/\//i.test(path)
    ? path
    : `https://raw.githubusercontent.com/${fullName}/${branch}/${encodePath(path)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'haoawake-toolbox-snapshot' } });
  if (!res.ok) throw new Error(`下载图标 ${url} → ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_ICON_BYTES) throw new Error(`图标 ${path} 太大（${(buf.length / 1048576).toFixed(1)} MB）`);
  const ext = (path.match(/\.(png|svg|webp|jpe?g|gif)(?:$|\?)/i)?.[1] ?? 'png').toLowerCase();
  const file = `${key.replace(/[^a-z0-9._-]+/gi, '_')}.${ext}`;
  await writeFile(join(ICON_DIR, file), buf);
  return `data/icons/${file}`;
}

// ---------------------------------------------------------------- 主流程

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

async function buildProject(repo: GhRepo): Promise<Project> {
  const info = toRepoInfo(repo, config.owner);
  const o = overrideFor(config, info.key, info.fullName);
  const [rawReleases, files] = await Promise.all([
    getAll<GhRelease>(`/repos/${info.fullName}/releases`, 'application/vnd.github.html+json', 5),
    soft(`${info.fullName} 的文件列表`, () => getTree(info.fullName, info.defaultBranch), null),
  ]);
  const readmePath = o.readme ?? files?.find((f) => ZH_README.test(f)) ?? null;
  const iconPath = o.icon ?? (files ? pickIcon(files) : null);
  const readmeHtml = await soft(`${info.fullName} 的 README`, () => getReadme(info.fullName, readmePath), null);
  const releases = toReleases(rawReleases);
  const icon = iconPath
    ? await soft(`${info.fullName} 的图标`, () => saveIcon(info.key, info.fullName, info.defaultBranch, iconPath), null)
    : null;
  return {
    ...info,
    releases: releases.slice(0, HISTORY),
    downloadsTotal: sumDownloads(releases),
    readmeHtml,
    icon,
  };
}

async function main() {
  const owner = config.owner;
  const selfRepo = config.selfRepo || process.env.GITHUB_REPOSITORY || null;
  console.log(`拉取 ${owner} 的公开仓库${token ? '（已使用 token）' : '（未设置 GITHUB_TOKEN，限额每小时 60 次）'}…`);

  const user = await getJson<GhUser>(`/users/${owner}`);
  if (!user) throw new Error(`GitHub 上找不到用户「${owner}」，检查 toolbox.config.json 里的 owner。`);

  const own = await getAll<GhRepo>(`/users/${owner}/repos?type=owner&sort=pushed`);
  const extra = await Promise.all(
    (config.extraRepos ?? []).map((full) =>
      soft(`额外仓库 ${full}`, () => getJson<GhRepo>(`/repos/${full}`), null),
    ),
  );

  const seen = new Set<string>();
  const repos: GhRepo[] = [];
  const add = (r: GhRepo, explicit: boolean) => {
    const k = r.full_name.toLowerCase();
    if (seen.has(k) || !isListed(r, config, selfRepo, explicit)) return;
    seen.add(k);
    repos.push(r);
  };
  own.forEach((r) => add(r, false));
  extra.forEach((r) => r && add(r, true));

  await rm(ICON_DIR, { recursive: true, force: true });
  await mkdir(ICON_DIR, { recursive: true });

  const projects = await mapLimit(repos, 4, buildProject);
  const snapshot: Snapshot = {
    version: 1,
    generatedAt: new Date().toISOString(),
    owner: toOwner(user),
    selfRepo,
    projects,
  };
  await writeFile(join(OUT_DIR, 'snapshot.json'), JSON.stringify(snapshot));

  console.log(`\n收录 ${projects.length} 个项目（共调用接口 ${calls} 次）：`);
  for (const p of projects) {
    const latest = p.releases.find((r) => !r.prerelease) ?? p.releases[0];
    const parts = [
      latest ? `${latest.tag}，${latest.assets.length} 个文件` : '无 Release',
      p.readmeHtml ? 'README ✓' : 'README ✗',
      p.icon ? '图标 ✓' : '图标 ✗',
    ];
    console.log(`  · ${p.fullName.padEnd(32)} ${parts.join(' · ')}`);
  }
  console.log(`\n已写入 public/data/snapshot.json`);
}

main().catch((e: Error) => {
  console.error(`\n生成快照失败：${e.message}`);
  process.exit(1);
});
