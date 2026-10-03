// 数据来源：GitHub Actions 每天抓一次 GitHub，生成 data/snapshot.json 并重新发布网页。
// 网页只读这份快照，不直接调用 GitHub 接口，所以访客再多也不会被限流，打开即是最新一次更新的结果。

import { useEffect, useMemo, useState } from 'react';
import { config } from '../config';
import type { Owner, Snapshot } from '../types';
import { toView } from './projects';

export interface DataInfo {
  state: 'loading' | 'ready' | 'error';
  /** 快照生成时间，也就是数据最近一次更新的时间 */
  updatedAt: number | null;
}

async function loadSnapshot(): Promise<Snapshot | null> {
  try {
    // no-cache：每次都向服务器确认一下，部署了新快照就能马上拿到
    const res = await fetch(`${import.meta.env.BASE_URL}data/snapshot.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const s = (await res.json()) as Snapshot;
    return s?.version === 1 ? s : null;
  } catch {
    return null;
  }
}

export function useToolbox() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [state, setState] = useState<DataInfo['state']>('loading');

  useEffect(() => {
    let alive = true;
    void loadSnapshot().then((s) => {
      if (!alive) return;
      setSnapshot(s);
      setState(s ? 'ready' : 'error');
    });
    return () => {
      alive = false;
    };
  }, []);

  const projects = useMemo(() => (snapshot?.projects ?? []).map(toView), [snapshot]);

  const owner: Owner = snapshot?.owner ?? {
    login: config.owner,
    name: config.owner,
    bio: '',
    avatarUrl: `https://github.com/${config.owner}.png`,
    url: `https://github.com/${config.owner}`,
  };

  const data: DataInfo = { state, updatedAt: snapshot ? Date.parse(snapshot.generatedAt) : null };
  const selfRepo = snapshot?.selfRepo ?? config.selfRepo ?? null;

  return { loading: state === 'loading', owner, projects, data, selfRepo };
}
