import { createContext, useContext, useEffect, useState } from 'react';
import { detectBasic, detectPlatform, type Platform } from './platform';

export const PlatformContext = createContext<Platform>({ os: null, arch: null, archSure: false, mobile: false });

export const usePlatform = () => useContext(PlatformContext);

/** 先用 User-Agent 马上给出结果，再异步确认 CPU 架构 */
export function usePlatformDetection(): Platform {
  const [platform, setPlatform] = useState<Platform>(detectBasic);
  useEffect(() => {
    let alive = true;
    void detectPlatform().then((p) => alive && setPlatform(p));
    return () => {
      alive = false;
    };
  }, []);
  return platform;
}
