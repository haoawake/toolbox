import { useEffect, useMemo, useRef } from 'react';
import { ChevronDown, CloudOff, RefreshCw, Search, SearchX, X } from 'lucide-react';
import type { ViewProject } from '../lib/projects';
import { Empty } from './bits';
import { ProjectCard, ProjectCardSkeleton } from './ProjectCard';

export type Filter = 'all' | 'installable' | 'source';
export type Sort = 'recommended' | 'updated' | 'stars' | 'name';

export interface CatalogState {
  filter: Filter;
  query: string;
  sort: Sort;
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'installable', label: '可一键安装' },
  { id: 'source', label: '源码项目' },
];

const SORTS: { id: Sort; label: string }[] = [
  { id: 'recommended', label: '推荐排序' },
  { id: 'updated', label: '最近更新' },
  { id: 'stars', label: '星标最多' },
  { id: 'name', label: '按名称' },
];

function sortProjects(list: ViewProject[], sort: Sort): ViewProject[] {
  const s = [...list];
  switch (sort) {
    case 'updated':
      return s.sort((a, b) => b.activityAt - a.activityAt);
    case 'stars':
      return s.sort((a, b) => b.stars - a.stars || b.activityAt - a.activityAt);
    case 'name':
      return s.sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-CN'));
    default:
      // 能直接装的排前面，其次看最近的动静
      return s.sort((a, b) => Number(b.installable) - Number(a.installable) || b.activityAt - a.activityAt);
  }
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function Catalog({
  projects,
  loading,
  failed,
  onRetry,
  state,
  onChange,
}: {
  projects: ViewProject[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  state: CatalogState;
  onChange: (s: CatalogState) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const { filter, query, sort } = state;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !isTyping(e.target) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const counts: Record<Filter, number> = {
    all: projects.length,
    installable: projects.filter((p) => p.installable).length,
    source: projects.filter((p) => !p.installable).length,
  };

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = projects.filter((p) => {
      if (filter === 'installable' && !p.installable) return false;
      if (filter === 'source' && p.installable) return false;
      if (!needle) return true;
      return [p.displayName, p.name, p.summary, p.description, p.language ?? '', ...p.topics].some((s) =>
        s.toLowerCase().includes(needle),
      );
    });
    return sortProjects(filtered, sort);
  }, [projects, filter, query, sort]);

  return (
    <section className="catalog container" aria-labelledby="catalog-title">
      <header className="catalog-head">
        <div>
          <div className="section-kicker">THE COLLECTION</div>
          <h2 className="section-title" id="catalog-title">
            全部项目
            {!loading && <span className="count">{list.length === projects.length ? projects.length : `${list.length} / ${projects.length}`}</span>}
          </h2>
        </div>
        <div className="catalog-tools">
          <div className="seg" role="group" aria-label="筛选">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => onChange({ ...state, filter: f.id })}
              >
                {f.label}
                {!loading && <span className="n">{counts[f.id]}</span>}
              </button>
            ))}
          </div>
          <label className="search">
            <Search size={16} className="search-ico" aria-hidden="true" />
            <input
              ref={input}
              type="search"
              value={query}
              placeholder="搜索工具、语言或标签"
              aria-label="搜索项目"
              onChange={(e) => onChange({ ...state, query: e.target.value })}
              onKeyDown={(e) => e.key === 'Escape' && onChange({ ...state, query: '' })}
            />
            {query ? (
              <button type="button" className="search-clear" aria-label="清空搜索" onClick={() => onChange({ ...state, query: '' })}>
                <X size={15} />
              </button>
            ) : (
              <kbd aria-hidden="true">/</kbd>
            )}
          </label>
          <div className="select">
            <select value={sort} aria-label="排序方式" onChange={(e) => onChange({ ...state, sort: e.target.value as Sort })}>
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown size={15} aria-hidden="true" />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="grid">
          {Array.from({ length: 6 }, (_, i) => (
            <ProjectCardSkeleton key={i} />
          ))}
        </div>
      ) : failed && projects.length === 0 ? (
        <Empty
          icon={<CloudOff size={24} />}
          title="暂时连不上 GitHub"
          action={
            <button type="button" className="btn" onClick={onRetry}>
              <RefreshCw size={16} />
              再试一次
            </button>
          }
        >
          可能是网络不太稳定，或者 GitHub 接口暂时限流了。稍等一会儿再刷新看看。
        </Empty>
      ) : list.length === 0 ? (
        <Empty
          icon={<SearchX size={24} />}
          title={query ? `没有找到「${query.trim()}」` : '这里暂时是空的'}
          action={
            (query || filter !== 'all') && (
              <button type="button" className="btn" onClick={() => onChange({ filter: 'all', query: '', sort })}>
                显示全部项目
              </button>
            )
          }
        >
          {query ? '换个关键词试试，比如工具的名字、编程语言或者用途。' : '换个筛选条件看看。'}
        </Empty>
      ) : (
        <div className="grid">
          {list.map((p, i) => (
            <ProjectCard key={p.fullName} project={p} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
