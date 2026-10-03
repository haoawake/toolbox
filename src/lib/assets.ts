// 从文件名判断安装包适用的系统、架构和类型，并为访客的电脑挑出最合适的一个。

import type { Arch, Asset, AssetOS, Release } from '../types';
import type { Platform } from './platform';

export type Kind =
  | 'setup'
  | 'exe'
  | 'msi'
  | 'msix'
  | 'zip'
  | 'archive'
  | 'dmg'
  | 'pkg'
  | 'appimage'
  | 'deb'
  | 'rpm'
  | 'flatpak'
  | 'snap'
  | 'apk'
  | 'ipa'
  | 'jar'
  | 'other';

export interface ClassifiedAsset extends Asset {
  /** null 表示校验文件之类的附属文件 */
  os: AssetOS | null;
  arch: Arch | null;
  kind: Kind;
  aux: boolean;
}

export const OS_ORDER: AssetOS[] = ['windows', 'macos', 'linux', 'android', 'ios', 'any'];

export const KIND_LABEL: Record<Kind, string> = {
  setup: '安装程序',
  exe: '免安装程序',
  msi: 'MSI 安装包',
  msix: 'MSIX 安装包',
  zip: 'ZIP 压缩包',
  archive: '压缩包',
  dmg: 'DMG 安装镜像',
  pkg: 'PKG 安装包',
  appimage: 'AppImage',
  deb: 'DEB 安装包',
  rpm: 'RPM 安装包',
  flatpak: 'Flatpak',
  snap: 'Snap',
  apk: 'APK 安装包',
  ipa: 'IPA',
  jar: 'Java 程序',
  other: '文件',
};

const MULTI_EXT = ['.app.tar.gz', '.app.zip', '.tar.gz', '.tar.xz', '.tar.bz2', '.tar.zst', '.msixbundle'];

function extOf(name: string): string {
  for (const e of MULTI_EXT) if (name.endsWith(e)) return e;
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i) : '';
}

/** 校验文件、签名、更新清单之类，不作为安装包推荐 */
const AUX =
  /\.(sha(1|224|256|384|512)(sum)?|md5|sig|asc|minisig|pem|crt|cert|blockmap|sbom|spdx|intoto\.jsonl|json|ya?ml|txt|sum)$|^(sha(1|256|512)sums?|checksums?|latest)([._-].*)?$/i;

function kindOf(ext: string, name: string): Kind {
  switch (ext) {
    case '.exe':
      return /setup|install/.test(name) ? 'setup' : 'exe';
    case '.msi':
      return 'msi';
    case '.msix':
    case '.msixbundle':
    case '.appx':
      return 'msix';
    case '.dmg':
      return 'dmg';
    case '.pkg':
      return 'pkg';
    case '.appimage':
      return 'appimage';
    case '.deb':
      return 'deb';
    case '.rpm':
      return 'rpm';
    case '.flatpak':
      return 'flatpak';
    case '.snap':
      return 'snap';
    case '.apk':
    case '.xapk':
    case '.aab':
      return 'apk';
    case '.ipa':
      return 'ipa';
    case '.jar':
      return 'jar';
    case '.zip':
    case '.app.zip':
      return 'zip';
    case '.7z':
    case '.rar':
    case '.tar':
    case '.tgz':
    case '.gz':
    case '.xz':
    case '.bz2':
    case '.tar.gz':
    case '.tar.xz':
    case '.tar.bz2':
    case '.tar.zst':
    case '.app.tar.gz':
      return 'archive';
    default:
      return 'other';
  }
}

export function classify(a: Asset): ClassifiedAsset {
  const n = a.name.toLowerCase();
  const ext = extOf(n);
  const tokens = new Set(n.split(/[^a-z0-9]+/).filter(Boolean));
  const has = (...t: string[]) => t.some((x) => tokens.has(x));
  const aux = AUX.test(n) || (has('src', 'source', 'sources') && !['.exe', '.msi', '.dmg', '.apk'].includes(ext));

  let os: AssetOS | null = null;
  if (!aux) {
    if (['.apk', '.aab', '.xapk'].includes(ext) || has('android')) os = 'android';
    else if (ext === '.ipa' || has('ios', 'iphone', 'ipad')) os = 'ios';
    // 注意 darwin 里含有 win，所以 macOS 要先判断，而且按整词匹配
    else if (['.dmg', '.pkg', '.app.zip', '.app.tar.gz'].includes(ext) || has('mac', 'macos', 'osx', 'macosx', 'darwin', 'apple'))
      os = 'macos';
    else if (['.exe', '.msi', '.msix', '.msixbundle', '.appx'].includes(ext) || has('win', 'windows', 'win32', 'win64', 'msvc', 'mingw', 'mingw64'))
      os = 'windows';
    else if (['.appimage', '.deb', '.rpm', '.flatpak', '.snap'].includes(ext) || has('linux', 'ubuntu', 'debian', 'fedora', 'gnu', 'musl'))
      os = 'linux';
    else os = 'any';
  }

  let arch: Arch | null = null;
  if (/arm64|aarch64|armv8|apple[-_ ]?silicon/.test(n)) arch = 'arm64';
  else if (/universal/.test(n)) arch = 'universal';
  else if (/x86[-_]?64|x64|amd64|win64|intel/.test(n)) arch = 'x64';
  else if (/i[3-6]86|ia32|\bx86\b|32[-_]?bit/.test(n)) arch = 'x86';

  return { ...a, os, arch, kind: kindOf(ext, n), aux };
}

export interface AssetGroups {
  byOS: Partial<Record<AssetOS, ClassifiedAsset[]>>;
  /** 有安装包的平台，按常用程度排序 */
  order: AssetOS[];
  aux: ClassifiedAsset[];
}

export function groupAssets(release: Release | null): AssetGroups {
  const byOS: Partial<Record<AssetOS, ClassifiedAsset[]>> = {};
  const aux: ClassifiedAsset[] = [];
  for (const a of release?.assets ?? []) {
    const c = classify(a);
    if (c.aux || !c.os) aux.push(c);
    else (byOS[c.os] ??= []).push(c);
  }
  return { byOS, order: OS_ORDER.filter((os) => byOS[os]?.length), aux };
}

/** 每个平台上更推荐哪种安装包（越靠前越好） */
const PREF: Record<AssetOS, Kind[]> = {
  windows: ['setup', 'msi', 'msix', 'exe', 'zip', 'archive'],
  macos: ['dmg', 'pkg', 'zip', 'archive'],
  linux: ['appimage', 'deb', 'rpm', 'flatpak', 'snap', 'archive', 'zip'],
  android: ['apk'],
  ios: ['ipa'],
  any: ['zip', 'archive', 'jar', 'exe'],
};

function archScore(a: ClassifiedAsset, p: Platform, os: AssetOS): number {
  const fallback: Arch = os === 'macos' ? 'arm64' : 'x64';
  const mine = p.os === os ? (p.arch ?? fallback) : fallback;
  if (!a.arch) return 2;
  if (a.arch === 'universal' || a.arch === mine) return 3;
  if (mine === 'x64' && a.arch === 'x86') return 1.5;
  if (mine === 'arm64' && a.arch === 'x64') return 1;
  return 0;
}

/** 在某个平台的安装包里挑出最适合访客电脑的一个：先看架构，再看安装包类型 */
export function pickAsset(list: ClassifiedAsset[] | undefined, p: Platform, os: AssetOS): ClassifiedAsset | null {
  if (!list?.length) return null;
  const pref = PREF[os];
  let best: ClassifiedAsset | null = null;
  let bestScore = -Infinity;
  for (const a of list) {
    const k = pref.indexOf(a.kind);
    const score = archScore(a, p, os) * 100 + (k === -1 ? 0 : pref.length - k);
    if (score > bestScore) {
      best = a;
      bestScore = score;
    }
  }
  return best;
}

export type Compat = 'match' | 'likely' | 'emulated' | 'mismatch' | 'other-os';

/** 这个安装包能不能在访客的电脑上用。通用包返回 null（不做判断） */
export function compat(a: ClassifiedAsset, p: Platform): Compat | null {
  if (a.os === 'any' || !a.os) return null;
  if (!p.os || a.os !== p.os) return 'other-os';
  if (!a.arch || a.arch === 'universal') return 'match';
  if (!p.arch || !p.archSure) return 'likely';
  if (a.arch === p.arch || (p.arch === 'x64' && a.arch === 'x86')) return 'match';
  if (p.arch === 'arm64' && a.arch !== 'arm64' && (p.os === 'macos' || p.os === 'windows')) return 'emulated';
  return 'mismatch';
}

export const digestHex = (a: Asset): string | null => a.digest?.replace(/^sha256:/i, '') ?? null;
