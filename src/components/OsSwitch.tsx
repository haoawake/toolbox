import { OS_LABEL } from '../lib/platform';
import type { PanelTab } from '../lib/projects';
import { usePlatform } from '../lib/usePlatform';
import { OSIcon } from './icons';

export function OsSwitch({
  tabs,
  value,
  onChange,
  compact = false,
}: {
  tabs: PanelTab[];
  value: PanelTab;
  onChange: (t: PanelTab) => void;
  compact?: boolean;
}) {
  const platform = usePlatform();
  return (
    <div className={`os-seg ${compact ? 'is-compact' : ''}`} role="radiogroup" aria-label="选择你的系统">
      {tabs.map((t) => (
        <button key={t} type="button" role="radio" aria-checked={value === t} onClick={() => onChange(t)}>
          <OSIcon os={t} size={14} />
          <span>{OS_LABEL[t]}</span>
          {platform.os === t && <span className="here" title="你正在用的系统" aria-label="（你的系统）" />}
        </button>
      ))}
    </div>
  );
}
