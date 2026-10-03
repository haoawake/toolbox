import { useState, type CSSProperties } from 'react';
import type { ViewProject } from '../lib/projects';

function hue(s: string): number {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.codePointAt(0)!) % 360;
  return h;
}

/** 有图标用图标，没有的话用名字首字生成一个渐变色块 */
export function ProjectIcon({ project, size = 52 }: { project: ViewProject; size?: number }) {
  const [broken, setBroken] = useState(false);
  const style = { '--s': `${size}px`, '--h': hue(project.name) } as CSSProperties;

  if (project.iconUrl && !broken) {
    return (
      <span className="picon has-img" style={style}>
        <img src={project.iconUrl} alt="" width={size} height={size} loading="lazy" decoding="async" onError={() => setBroken(true)} />
      </span>
    );
  }
  const letter = Array.from(project.displayName.trim())[0]?.toUpperCase() ?? '?';
  return (
    <span className="picon is-mono" style={style} aria-hidden="true">
      {letter}
    </span>
  );
}
