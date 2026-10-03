import { ArrowUpRight, BookOpen } from 'lucide-react';
import type { ViewProject } from '../lib/projects';
import { Empty } from './bits';
import { RichHtml } from './RichHtml';

export function Readme({ project: p }: { project: ViewProject }) {
  if (!p.readmeHtml)
    return (
      <Empty
        icon={<BookOpen size={24} />}
        title="这个项目还没有写 README"
        action={
          <a className="btn" href={p.url} target="_blank" rel="noopener noreferrer">
            去 GitHub 看看
            <ArrowUpRight size={16} />
          </a>
        }
      >
        可以去仓库里看看代码，或者给作者提个 Issue 催更。
      </Empty>
    );
  return (
    <RichHtml
      html={p.readmeHtml}
      className="readme"
      ctx={{ fullName: p.fullName, branch: p.defaultBranch, stripTitle: [p.displayName, p.name] }}
    />
  );
}
