import { useId } from 'react';

/** 墨色玻璃方块 + 一弯白月 + 一颗星：皓（月光）子不困（熬夜） */
export function Logo({ size = 30 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="logo">
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#30343f" />
          <stop offset="1" stopColor="#0b0c10" />
        </linearGradient>
        <linearGradient id={`${id}gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={`${id}cut`}>
          <rect width="64" height="64" fill="#fff" />
          <circle cx="40" cy="25" r="14" fill="#000" />
        </mask>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id}bg)`} />
      <circle cx="29" cy="34" r="17" fill="#fff" mask={`url(#${id}cut)`} />
      <path d="M47 11c.8 4.2 1.8 5.2 6 6-4.2.8-5.2 1.8-6 6-.8-4.2-1.8-5.2-6-6 4.2-.8 5.2-1.8 6-6z" fill="#fff" />
      <rect width="64" height="30" rx="16" fill={`url(#${id}gloss)`} />
    </svg>
  );
}
