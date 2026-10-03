import { useEffect, useRef } from 'react';
import type { Theme } from '../lib/theme';

interface Star {
  x: number;
  y: number;
  r: number;
  a: number;
  speed: number;
  phase: number;
}

interface Meteor {
  x: number;
  y: number;
  start: number;
}

/** 背景星空：深色主题下星星会慢慢闪，偶尔划过一颗流星；浅色主题只剩淡淡的墨点 */
export function Starfield({ theme }: { theme: Theme }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const css = getComputedStyle(document.documentElement);
    const rgb = css.getPropertyValue('--star-rgb').trim() || '255, 255, 255';
    const maxAlpha = parseFloat(css.getPropertyValue('--star-alpha')) || 0.8;
    const dark = theme === 'dark';

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let meteor: Meteor | null = null;
    let nextMeteor = performance.now() + 5000 + Math.random() * 7000;
    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(Math.round((w * h) / (dark ? 6500 : 11000)), 420);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() ** 2.2 * 1.25 + 0.3,
        a: 0.25 + Math.random() * 0.75,
        speed: 0.4 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
      }));
      draw(performance.now());
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = `rgb(${rgb})`;
      for (const s of stars) {
        const twinkle = reduce ? 1 : 0.55 + 0.45 * Math.sin((t / 1000) * s.speed + s.phase);
        ctx.globalAlpha = s.a * twinkle * maxAlpha;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (meteor) {
        const p = (t - meteor.start) / 1100;
        if (p >= 1) meteor = null;
        else {
          const len = 140;
          const x = meteor.x - p * 360;
          const y = meteor.y + p * 180;
          const grad = ctx.createLinearGradient(x, y, x + len, y - len / 2);
          grad.addColorStop(0, `rgba(${rgb}, ${0.9 * Math.sin(p * Math.PI)})`);
          grad.addColorStop(1, `rgba(${rgb}, 0)`);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = grad;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + len, y - len / 2);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 40) return; // 25fps 足够了，省电
      last = t;
      if (dark && !meteor && t > nextMeteor) {
        meteor = { x: w * (0.45 + Math.random() * 0.55), y: h * Math.random() * 0.35, start: t };
        nextMeteor = t + 9000 + Math.random() * 14000;
      }
      draw(t);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === 'visible' && !reduce) raf = requestAnimationFrame(loop);
    };

    resize();
    if (!reduce) raf = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [theme]);

  return <canvas ref={ref} className="starfield" aria-hidden="true" />;
}
