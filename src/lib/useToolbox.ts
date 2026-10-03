// 数据来源：先读构建时生成的快照（秒开），再向 GitHub 实时查询最新版本（10 分钟内复用缓存）。
// 实时查询被限流或断网时，安静地退回快照。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { config } from '../config';
import type { Owner, Snapshot } from '../types';
import { readCache, readString, writeCache, writeString } from './cache';
import { fetchLive, RateLimitError, type LiveData } from './github';
import { mergeProjects, toView } from './projects';

const LIVE_KEY = `toolbox:live:v1:${config.owner.toLowerCase()}`;
const LIMIT_KEY = 'toolbox:rate-limited-until';
const TTL = (config.liveRefreshMinutes ?? 10) * 60_000;

export type SyncState = 'loading' | 'syncing' | 'live' | 'fallback' | 'error';

export interface SyncInfo {
  state: SyncState;
  /** 最近一次成功从 GitHub 实时获取数据的时间 */
  liveAt: number | null;
  snapshotAt: number | null;
  limitedUntil: number | null;
  message: string | null;
}

async function loadSnapshot(): Promise<Snapshot | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/snapshot.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const s = (await res.json()) as Snapshot;
    return s?.version === 1 ? s : null;
  } catch {
    return null;
  }
}

/** 部署在 <owner>.github.io/<repo>/ 时，<repo> 就是工具库自己，不用列出来 */
function selfRepoFromLocation(owner: string): string | null {
  if (location.hostname.toLowerCase() !== `${owner.toLowerCase()}.github.io`) return null;
  const seg = location.pathname.split('/').filter(Boolean)[0];
  return seg && !seg.includes('.') ? `${owner}/${seg}` : `${owner}/${owner}.github.io`;
}

export function useToolbox() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [booted, setBooted] = useState(false);
  const [live, setLive] = useState<LiveData | null>(null);
  const [sync, setSync] = useState<SyncInfo>({
    state: 'loading',
    liveAt: null,
    snapshotAt: null,
    limitedUntil: null,
    message: null,
  });
  const snapRef = useRef<Snapshot | null>(null);

  const refresh = useCallback(async (force: boolean) => {
    const snap = snapRef.current;
    const selfRepo = snap?.selfRepo ?? config.selfRepo ?? selfRepoFromLocation(config.owner);
    const cached = readCache<LiveData>(LIVE_KEY);

    if (!force && cached && Date.now() - cached.savedAt < TTL) {
      setLive(cached.value);
      setSync((s) => ({ ...s, state: 'live', liveAt: cached.value.fetchedAt, limitedUntil: null, message: null }));
      return;
    }

    const fallback = (limitedUntil: number | null, message: string) => {
      if (cached) setLive(cached.value);
      setSync((s) => ({
        ...s,
        state: snap || cached ? 'fallback' : 'error',
        liveAt: cached?.value.fetchedAt ?? null,
        limitedUntil,
        message,
      }));
    };

    const limited = Number(readString(LIMIT_KEY) ?? 0);
    if (limited > Date.now()) return fallback(limited, 'GitHub 接口暂时限流');

    setSync((s) => ({ ...s, state: 'syncing' }));
    try {
      const data = await fetchLive(config, selfRepo, !snap);
      data.owner ??= cached?.value.owner ?? null;
      setLive(data);
      writeCache(LIVE_KEY, data);
      writeString(LIMIT_KEY, data.limitedUntil ? String(data.limitedUntil) : null);
      setSync((s) => ({ ...s, state: 'live', liveAt: data.fetchedAt, limitedUntil: data.limitedUntil, message: null }));
    } catch (e) {
      if (e instanceof RateLimitError) {
        writeString(LIMIT_KEY, String(e.resetAt));
        fallback(e.resetAt, 'GitHub 接口暂时限流');
      } else {
        fallback(null, '暂时连不上 GitHub');
      }
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void loadSnapshot().then((s) => {
      if (!alive) return;
      snapRef.current = s;
      setSnapshot(s);
      setBooted(true);
      setSync((prev) => ({ ...prev, snapshotAt: s ? Date.parse(s.generatedAt) : null }));
      void refresh(false);
    });
    // 页面在后台放久了，切回来时顺便看看有没有新版本
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const c = readCache<LiveData>(LIVE_KEY);
      if (!c || Date.now() - c.savedAt >= TTL) void refresh(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh]);

  const projects = useMemo(() => mergeProjects(snapshot, live).map(toView), [snapshot, live]);

  const owner: Owner = live?.owner ??
    snapshot?.owner ?? {
      login: config.owner,
      name: config.owner,
      bio: '',
      avatarUrl: `https://github.com/${config.owner}.png`,
      url: `https://github.com/${config.owner}`,
    };

  const loading = !booted || (!snapshot && !live && sync.state !== 'error');
  const selfRepo = snapshot?.selfRepo ?? config.selfRepo ?? null;
  const forceRefresh = useCallback(() => refresh(true), [refresh]);

  return { loading, owner, projects, sync, refresh: forceRefresh, selfRepo };
}
