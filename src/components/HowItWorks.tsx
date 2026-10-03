import { Download, ListChecks, MousePointerClick } from 'lucide-react';

const STEPS = [
  { icon: MousePointerClick, title: '挑一个工具', text: '每个工具都有介绍和更新日志，先看看合不合用。' },
  { icon: Download, title: '一键下载', text: '自动认出你的电脑，给最合适的最新版。' },
  { icon: ListChecks, title: '跟着步骤装好', text: '每一步都写清楚了，遇到问题也有解法。' },
];

export function HowItWorks() {
  return (
    <section className="how container" aria-label="使用方法">
      {STEPS.map(({ icon: Icon, title, text }, i) => (
        <div className="how-item" key={title}>
          <span className="how-ico">
            <Icon size={19} />
          </span>
          <div>
            <strong>
              <span className="how-num">0{i + 1}</span>
              {title}
            </strong>
            <p>{text}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
