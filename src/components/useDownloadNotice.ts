import { useCallback } from 'react';
import type { Asset } from '../types';
import { formatBytes } from '../lib/format';
import type { ViewProject } from '../lib/projects';
import { projectHref } from '../lib/router';
import { useToast } from './Toast';

/** 在首页点了下载：提示已开始，并给一个跳到安装步骤的入口 */
export function useDownloadNotice() {
  const toast = useToast();
  return useCallback(
    (p: ViewProject, a: Asset) =>
      toast({
        tone: 'success',
        title: '已经开始下载',
        description: `${a.name}（${formatBytes(a.size)}）。下好之后，跟着安装步骤走就行。`,
        action: {
          label: '查看安装步骤',
          onClick: () => {
            location.hash = projectHref(p.key, 'install');
          },
        },
      }),
    [toast],
  );
}
