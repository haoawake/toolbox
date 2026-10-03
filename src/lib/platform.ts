import type { Arch, AssetOS, OS } from '../types';

export interface Platform {
  os: OS | null;
  arch: Arch | null;
  /** arch 是确定检测到的，还是猜的 */
  archSure: boolean;
  mobile: boolean;
}

interface UAData {
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; bitness?: string }>;
}

const uaData = (): UAData | undefined => (navigator as Navigator & { userAgentData?: UAData }).userAgentData;

/** 只看 User-Agent，同步返回，首屏先用它 */
export function detectBasic(): Platform {
  const ua = navigator.userAgent;
  const plat = uaData()?.platform ?? '';
  let os: OS | null = null;
  if (/android/i.test(ua)) os = 'android';
  else if (/iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) os = 'ios';
  else if (/windows/i.test(ua) || plat === 'Windows') os = 'windows';
  else if (/mac os x|macintosh/i.test(ua) || plat === 'macOS') os = 'macos';
  else if (/cros/i.test(ua)) os = null;
  else if (/linux/i.test(ua) || plat === 'Linux') os = 'linux';

  let arch: Arch | null = null;
  let archSure = false;
  if (/arm64|aarch64/i.test(ua)) {
    arch = 'arm64';
    archSure = true;
  } else if (os === 'linux' && /x86_64|amd64/i.test(ua)) {
    arch = 'x64';
    archSure = true;
  } else if (os === 'windows') {
    // Windows on ARM 的浏览器也常自称 x64，不过 x64 程序在上面照样能跑，按 x64 处理没问题
    arch = /wow64|win64|x64/i.test(ua) ? 'x64' : 'x86';
    archSure = /win64|x64/i.test(ua);
  }
  return { os, arch, archSure, mobile: os === 'android' || os === 'ios' };
}

function webglRenderer(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return r;
  } catch {
    return '';
  }
}

/** 进一步确认 CPU 架构：Chromium 系浏览器直接问，Mac 上的其他浏览器看显卡型号 */
export async function detectPlatform(): Promise<Platform> {
  const base = detectBasic();
  if (!base.os || base.mobile) return base;

  const data = uaData();
  if (data?.getHighEntropyValues) {
    try {
      const v = await data.getHighEntropyValues(['architecture', 'bitness']);
      if (v.architecture === 'arm') return { ...base, arch: 'arm64', archSure: true };
      if (v.architecture === 'x86') return { ...base, arch: v.bitness === '32' ? 'x86' : 'x64', archSure: true };
    } catch {
      /* 拿不到就继续猜 */
    }
  }

  if (base.os === 'macos') {
    const gpu = webglRenderer();
    if (/apple m\d/i.test(gpu)) return { ...base, arch: 'arm64', archSure: true };
    if (/intel|amd|radeon|nvidia/i.test(gpu)) return { ...base, arch: 'x64', archSure: true };
    // Safari 会把显卡统一报成 "Apple GPU"。现在大多数 Mac 都是 Apple 芯片，先按它猜
    return { ...base, arch: 'arm64', archSure: false };
  }
  return base;
}

export const OS_LABEL: Record<AssetOS | 'source', string> = {
  windows: 'Windows',
  macos: 'macOS',
  linux: 'Linux',
  android: 'Android',
  ios: 'iOS',
  any: '通用',
  source: '源码',
};

export function archLabel(arch: Arch | null, os?: AssetOS | null): string {
  switch (arch) {
    case 'x64':
      return os === 'macos' ? 'Intel 芯片' : '64 位';
    case 'arm64':
      return os === 'macos' ? 'Apple 芯片' : 'ARM64';
    case 'x86':
      return '32 位';
    case 'universal':
      return os === 'macos' ? 'Intel 与 Apple 芯片通用' : '通用';
    default:
      return '';
  }
}

export function platformLabel(p: Platform): string {
  if (!p.os) return '未知系统';
  const arch = p.archSure ? archLabel(p.arch, p.os) : '';
  return arch ? `${OS_LABEL[p.os]} · ${arch}` : OS_LABEL[p.os];
}

export const isDesktopOS = (os: AssetOS | 'source'): boolean => os === 'windows' || os === 'macos' || os === 'linux';
