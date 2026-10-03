import { useId } from 'react';

/** 夜空底色 + 一弯月亮 + 一颗星：皓（月光）子不困（熬夜） */
export function Logo({ size = 30 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="logo">
      <defs>
        <linearGradient id={`${id}bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a3160" />
          <stop offset="1" stopColor="#0a0d19" />
        </linearGradient>
        <linearGradient id={`${id}moon`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe7ae" />
          <stop offset="1" stopColor="#eaa73c" />
        </linearGradient>
        <mask id={`${id}cut`}>
          <rect width="64" height="64" fill="#fff" />
          <circle cx="40" cy="25" r="14" fill="#000" />
        </mask>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id}bg)`} />
      <circle cx="29" cy="34" r="17" fill={`url(#${id}moon)`} mask={`url(#${id}cut)`} />
      <path d="M47 11c.8 4.2 1.8 5.2 6 6-4.2.8-5.2 1.8-6 6-.8-4.2-1.8-5.2-6-6 4.2-.8 5.2-1.8 6-6z" fill="#fff6dc" />
      <circle cx="54" cy="31" r="1.4" fill="#fff6dc" opacity=".7" />
    </svg>
  );
}
