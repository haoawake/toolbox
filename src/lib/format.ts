const rtf = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });

/** 「刚刚」「3分钟前」「昨天」「上个月」… */
export function timeAgo(input: string | number | null | undefined, now = Date.now()): string {
  if (input == null || input === '') return '';
  const t = typeof input === 'number' ? input : Date.parse(input);
  if (Number.isNaN(t)) return '';
  const diff = (t - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return '刚刚';
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 604800) return rtf.format(Math.round(diff / 86400), 'day');
  if (abs < 2629800) return rtf.format(Math.round(diff / 604800), 'week');
  if (abs < 31557600) return rtf.format(Math.round(diff / 2629800), 'month');
  return rtf.format(Math.round(diff / 31557600), 'year');
}

const dateFmt = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (input: string | number) => dateFmt.format(new Date(input));
export const formatDateTime = (input: string | number) => dateTimeFmt.format(new Date(input));
export const formatTime = (input: string | number) => timeFmt.format(new Date(input));

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function formatCount(n: number): string {
  if (n < 10000) return n.toLocaleString('zh-CN');
  return `${(n / 10000).toFixed(n < 100000 ? 1 : 0).replace(/\.0$/, '')} 万`;
}

/** 比较文字时忽略大小写、空格和标点 */
export const looseText = (s: string) => s.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');

/** 去掉 Release 标题里重复的版本号：「v3.7.2 — 今日清单页…」→「今日清单页…」 */
export function releaseTitle(name: string, tag: string): string {
  const stripped = name
    .replace(tag, '')
    .replace(/^[\s—–\-:：·|,，]+|[\s—–\-:：·|,，]+$/g, '')
    .trim();
  return stripped;
}
