// 生成「傻瓜式」安装步骤：第一步永远是下载，后面按平台和安装包类型自动写，
// toolbox.config.json 里给项目写了 install 的话就用那份。

import type { AssetOS, InstallStep, ProjectOverride } from '../types';
import type { ClassifiedAsset } from './assets';
import { formatBytes } from './format';

export interface GuideStep extends InstallStep {
  /** download：带下载按钮的第一步；source：带源码下载按钮的第一步 */
  kind?: 'download' | 'source';
}

export interface Guide {
  steps: GuideStep[];
  trouble: InstallStep[];
}

export interface GuideProject {
  fullName: string;
  name: string;
  displayName: string;
  language: string | null;
  override: ProjectOverride;
  version: string | null;
}

/** 只替换认识的占位符，代码里原本的大括号不受影响 */
export function fill(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(asset|size|app|version|repo)\}/g, (_, k: string) => vars[k] ?? '');
}

function fillStep<T extends InstallStep>(s: T, vars: Record<string, string>): T {
  return {
    ...s,
    title: fill(s.title, vars),
    body: s.body && fill(s.body, vars),
    code: s.code && fill(s.code, vars),
    tip: s.tip && fill(s.tip, vars),
  };
}

const shellName = (name: string) => (/[^\w.@%+=:,/-]/.test(name) ? `"${name}"` : name);

// ---------------------------------------------------------------- 各平台的默认步骤

const winOpenFromStart: InstallStep = {
  title: '打开 {app}',
  body: '装好后在开始菜单里搜索「{app}」就能找到它，也可以用桌面快捷方式打开。',
};

function windowsSteps(a: ClassifiedAsset): InstallStep[] {
  switch (a.kind) {
    case 'setup':
      return [{ title: '运行安装程序', body: '双击下载好的 `{asset}`，按安装向导一路点「下一步」即可。' }, winOpenFromStart];
    case 'msi':
      return [{ title: '双击安装', body: '双击下载好的 `{asset}`，按提示完成安装。' }, winOpenFromStart];
    case 'msix':
      return [
        { title: '双击安装', body: '双击下载好的 `{asset}`，在弹出的窗口里点「安装」。需要 Windows 10 1809 或更新的版本。' },
        winOpenFromStart,
      ];
    case 'exe':
      return [
        {
          title: '放到一个固定的位置',
          body: '这是免安装版，不用安装。建议先把 `{asset}` 从「下载」移到一个长期存放的文件夹（比如 `D:\\Apps`），以后都从那里打开。',
        },
        {
          title: '双击运行',
          body: '双击 `{asset}` 就能直接用。想更方便的话，右键它 →「显示更多选项」→「发送到」→「桌面快捷方式」。',
        },
      ];
    case 'zip':
    case 'archive':
      return [
        {
          title: '解压到一个固定的位置',
          body: '在「下载」文件夹里右键 `{asset}` →「全部解压缩…」，选一个以后不会删的位置（比如 `D:\\Apps\\{app}`），点「提取」。',
          tip:
            a.kind === 'archive'
              ? 'Windows 11 可以直接右键解压 .7z / .rar；旧版本的 Windows 可以先装 7-Zip 或 Bandizip。'
              : '别在压缩包里直接双击运行，那样程序可能打不开，或者设置保存不下来。',
        },
        {
          title: '打开程序',
          body: '进入解压出来的文件夹，双击里面的 `.exe` 程序（一般和项目同名）。想更方便的话，右键它 →「显示更多选项」→「发送到」→「桌面快捷方式」。',
        },
      ];
    default:
      return genericSteps(a);
  }
}

const macFirstOpen: InstallStep = {
  title: '第一次打开',
  body: '打开「应用程序」，按住 Control 键点按「{app}」→ 选「打开」→ 在弹窗里再点「打开」。之后就能像普通应用一样双击打开了。',
  tip: 'macOS 15 起菜单里可能没有「打开」：先双击一次，再去「系统设置 → 隐私与安全性」，在页面底部点「仍要打开」。',
};

function macSteps(a: ClassifiedAsset): InstallStep[] {
  switch (a.kind) {
    case 'dmg':
      return [
        {
          title: '拖进「应用程序」',
          body: '双击下载好的 `{asset}`，在弹出的窗口里把「{app}」的图标拖到「Applications」文件夹上。拖完可以把桌面上的磁盘图标推出。',
        },
        macFirstOpen,
      ];
    case 'pkg':
      return [
        {
          title: '运行安装器',
          body: '双击下载好的 `{asset}`，按安装器的提示完成安装。',
          tip: '如果提示「无法打开」，按住 Control 键点按这个文件 → 选「打开」。',
        },
      ];
    case 'zip':
    case 'archive':
      return [
        { title: '解压并放进「应用程序」', body: '在「下载」里双击 `{asset}`，会解压出「{app}」应用。把它拖进「应用程序」文件夹。' },
        macFirstOpen,
      ];
    default:
      return genericSteps(a);
  }
}

function linuxSteps(a: ClassifiedAsset, slug: string): InstallStep[] {
  const f = `~/Downloads/${shellName(a.name)}`;
  const open: InstallStep = { title: '打开 {app}', body: '在应用菜单里搜索「{app}」即可打开。' };
  switch (a.kind) {
    case 'appimage':
      return [{ title: '加上执行权限并运行', body: '打开终端，执行下面两行：', code: `chmod +x ${f}\n${f}` }];
    case 'deb':
      return [{ title: '安装', body: '打开终端，执行下面这行（Ubuntu / Debian）：', code: `sudo apt install ${f}` }, open];
    case 'rpm':
      return [{ title: '安装', body: '打开终端，执行下面这行（Fedora；其他发行版换成对应的包管理器）：', code: `sudo dnf install ${f}` }, open];
    case 'flatpak':
      return [{ title: '安装', body: '打开终端，执行：', code: `flatpak install ${f}` }, open];
    case 'snap':
      return [{ title: '安装', body: '打开终端，执行：', code: `sudo snap install --dangerous ${f}` }, open];
    case 'zip':
    case 'archive':
      return [
        {
          title: '解压',
          body: '打开终端，把它解压到 `~/Apps` 下：',
          code:
            a.kind === 'zip'
              ? `mkdir -p ~/Apps/${slug} && unzip ${f} -d ~/Apps/${slug}`
              : `mkdir -p ~/Apps/${slug} && tar -xf ${f} -C ~/Apps/${slug}`,
        },
        { title: '运行', body: '进入解压出来的目录，运行里面的可执行文件。提示权限不够的话，先对它执行一次 `chmod +x`。' },
      ];
    default:
      return genericSteps(a);
  }
}

function genericSteps(a: ClassifiedAsset): InstallStep[] {
  if (a.kind === 'zip' || a.kind === 'archive')
    return [
      { title: '解压', body: '把下载好的 `{asset}` 解压到一个固定的位置。' },
      { title: '按说明使用', body: '具体的运行方式请看「项目介绍」里的说明。' },
    ];
  if (a.kind === 'jar')
    return [{ title: '运行', body: '确认电脑装了 Java，然后双击 `{asset}`，或者在终端里执行：', code: `java -jar ${shellName(a.name)}` }];
  if (a.kind === 'apk')
    return [
      {
        title: '在手机上安装',
        body: '用手机打开本页下载，然后在通知栏或「文件管理 → 下载」里点开 `{asset}`，按提示安装。',
        tip: '如果提示「禁止安装未知来源的应用」，按提示允许浏览器安装应用就行。',
      },
    ];
  if (a.kind === 'ipa')
    return [{ title: '安装 IPA', body: 'IPA 需要借助 AltStore、Sideloadly 等工具自签安装，具体方法请看「项目介绍」。' }];
  return [{ title: '按说明使用', body: '具体的使用方式请看「项目介绍」里的说明。' }];
}

const DOWNLOAD_HINT: Record<AssetOS, string> = {
  windows: '下载好的文件在「下载」文件夹里，按 Ctrl+J 可以打开浏览器的下载列表。',
  macos: '下载好的文件在「访达 → 下载」里。',
  linux: '下载好的文件默认在 `~/Downloads` 里。',
  android: '下载好的文件可以在通知栏或「文件管理 → 下载」里找到。',
  ios: '',
  any: '',
};

// ---------------------------------------------------------------- 常见问题

function troubleFor(os: AssetOS, a: ClassifiedAsset, knownApp: boolean): InstallStep[] {
  if (os === 'windows') {
    const list: InstallStep[] = [
      {
        title: '弹出「Windows 已保护你的电脑」',
        body: '个人开发者的软件通常没有购买代码签名证书，所以会看到这个提示。点「更多信息」→「仍要运行」即可。',
      },
      {
        title: '浏览器说这个文件「不常下载」，或者拦截了它',
        body: '打开浏览器的下载列表（Ctrl+J），在这个文件右边点「…」→「保留」。',
      },
    ];
    if (a.kind === 'zip' || a.kind === 'archive')
      list.push({
        title: '双击没反应、闪退，或者提示缺少文件',
        body: '确认已经把整个压缩包解压出来（而不是在压缩包里直接打开），再看看杀毒软件有没有把文件隔离。',
      });
    return list;
  }
  if (os === 'macos') {
    const list: InstallStep[] = [
      knownApp
        ? {
            title: '提示「已损坏，无法打开」或「无法验证开发者」',
            body: '打开「终端」（在启动台里搜索“终端”），粘贴下面这行后回车，再重新打开应用。',
            code: 'xattr -cr "/Applications/{app}.app"',
          }
        : {
            title: '提示「已损坏，无法打开」或「无法验证开发者」',
            body: '打开「终端」，输入下面的命令（末尾有一个空格），再把应用图标拖进终端窗口，路径会自动填好，然后回车。',
            code: 'xattr -cr ',
          },
    ];
    if (a.arch === 'arm64')
      list.push({
        title: '提示「无法在此 Mac 上运行」',
        body: '这个安装包只适用于 Apple 芯片（M1 及以后）的 Mac。点屏幕左上角的苹果图标 →「关于本机」，看「芯片」一栏：如果写的是 Intel，就用不了这个版本。',
      });
    if (a.arch === 'x64')
      list.push({
        title: '提示需要安装 Rosetta',
        body: '这是 Intel 版本，在 Apple 芯片的 Mac 上第一次打开时会提示安装 Rosetta，点「安装」就行。',
      });
    return list;
  }
  if (os === 'linux') {
    const list: InstallStep[] = [{ title: '提示 Permission denied', body: '文件没有执行权限，先执行一次 `chmod +x` 再运行。' }];
    if (a.kind === 'appimage')
      list.push({ title: '提示缺少 FUSE、AppImage 打不开', body: '较新的 Ubuntu 需要先装 libfuse2：', code: 'sudo apt install libfuse2' });
    return list;
  }
  return [];
}

// ---------------------------------------------------------------- 对外接口

export function installGuide(p: GuideProject, os: AssetOS, a: ClassifiedAsset): Guide {
  const app = p.override.appName || p.displayName;
  const vars = { asset: a.name, size: formatBytes(a.size), app, version: p.version ?? '', repo: p.fullName };
  const auto =
    os === 'windows'
      ? windowsSteps(a)
      : os === 'macos'
        ? macSteps(a)
        : os === 'linux'
          ? linuxSteps(a, p.name.toLowerCase())
          : genericSteps(a);
  const download: GuideStep = {
    kind: 'download',
    title: '下载安装包',
    body: `点下面的按钮下载 \`{asset}\`（{size}）。${DOWNLOAD_HINT[os]}`,
  };
  const steps = [download, ...(p.override.install?.[os] ?? auto)];
  const trouble = [...(p.override.troubleshooting?.[os] ?? []), ...troubleFor(os, a, !!p.override.appName)];
  return { steps: steps.map((s) => fillStep(s, vars)), trouble: trouble.map((s) => fillStep(s, vars)) };
}

function languageTip(lang: string | null): string | undefined {
  switch (lang) {
    case 'Python':
    case 'Jupyter Notebook':
      return '这是 Python 项目，一般要先装好 Python 3（python.org），再按说明安装依赖（常见的是 `pip install -r requirements.txt`）。';
    case 'TypeScript':
    case 'JavaScript':
    case 'Vue':
    case 'Svelte':
      return '这是 Node.js 项目，一般要先装好 Node.js（nodejs.org），再在项目目录里运行 `npm install`。';
    case 'HTML':
    case 'CSS':
      return '这是网页项目，解压后可以先试试用浏览器打开里面的 `index.html`。';
    case 'Rust':
      return '这是 Rust 项目，要先装好 Rust（rustup.rs），一般用 `cargo run --release` 运行。';
    case 'Go':
      return '这是 Go 项目，要先装好 Go（go.dev），一般用 `go run .` 运行。';
    case 'Java':
    case 'Kotlin':
      return '这是 JVM 项目，要先装好 JDK，再按说明用 Gradle 或 Maven 构建。';
    case 'C#':
      return '这是 .NET 项目，要先装好 .NET SDK，一般用 `dotnet run` 运行。';
    default:
      return undefined;
  }
}

export function sourceGuide(p: GuideProject): Guide {
  const vars = { asset: '', size: '', app: p.override.appName || p.displayName, version: p.version ?? '', repo: p.fullName };
  const download: GuideStep = {
    kind: 'source',
    title: '下载源码',
    body: '点下面的按钮下载源码压缩包；装了 Git 的话，也可以直接克隆：',
    code: `git clone https://github.com/${p.fullName}.git`,
  };
  const custom = p.override.install?.source;
  const rest: InstallStep[] = custom ?? [
    {
      title: '照着 README 运行',
      body: '每个项目的运行方式不一样，请照着「项目介绍」里的说明来。',
      tip: languageTip(p.language),
    },
  ];
  const trouble = p.override.troubleshooting?.source ?? [];
  return { steps: [download, ...rest].map((s) => fillStep(s, vars)), trouble: trouble.map((s) => fillStep(s, vars)) };
}
