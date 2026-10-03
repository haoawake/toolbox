import { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, CloudOff } from 'lucide-react';
import { fetchReadme } from '../lib/github';
import type { ViewProject } from '../lib/projects';
import { Empty } from './bits';
import { RichHtml } from './RichHtml';

type State = { status: 'loading' } | { status: 'ready'; html: string | null } | { status: 'error' };

export function Readme({ project: p }: { project: ViewProject }) {
  const known = p.readmeHtml;
  const [state, setState] = useState<State>(known === undefined ? { status: 'loading' } : { status: 'ready', html: known });

  useEffect(() => {
    if (known !== undefined) {
      setState({ status: 'ready', html: known });
      return;
    }
    // 快照里没有的新项目，现取一次
    let alive = true;
    setState({ status: 'loading' });
    fetchReadme(p.fullName)
      .then((html) => alive && setState({ status: 'ready', html }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [p.fullName, known]);

  const repoLink = (
    <a className="btn" href={p.url} target="_blank" rel="noopener noreferrer">
      去 GitHub 看看
      <ArrowUpRight size={16} />
    </a>
  );

  if (state.status === 'loading')
    return (
      <div className="readme-skeleton" aria-label="正在加载介绍">
        {[92, 100, 76, 0, 60, 100, 88, 94, 40].map((w, i) =>
          w ? <div key={i} className="skeleton" style={{ width: `${w}%`, height: 13 }} /> : <div key={i} style={{ height: 12 }} />,
        )}
      </div>
    );
  if (state.status === 'error')
    return (
      <Empty icon={<CloudOff size={24} />} title="介绍暂时加载不出来" action={repoLink}>
        GitHub 接口可能暂时限流了，可以直接去仓库主页看 README。
      </Empty>
    );
  if (!state.html)
    return (
      <Empty icon={<BookOpen size={24} />} title="这个项目还没有写 README" action={repoLink}>
        可以去仓库里看看代码，或者给作者提个 Issue 催更。
      </Empty>
    );
  return (
    <RichHtml
      html={state.html}
      className="readme"
      ctx={{ fullName: p.fullName, branch: p.defaultBranch, stripTitle: [p.displayName, p.name] }}
    />
  );
}
