import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { extractScreenshots, type Screenshot } from '../lib/html';
import type { ViewProject } from '../lib/projects';

function Lightbox({
  shots,
  index,
  onIndex,
  onClose,
}: {
  shots: Screenshot[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const shot = shots[index];
  const many = shots.length > 1;
  const go = (d: number) => onIndex((index + d + shots.length) % shots.length);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="lightbox"
      aria-label="截图预览"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === 'ArrowRight') go(1);
        if (e.key === 'ArrowLeft') go(-1);
      }}
    >
      <figure>
        <img src={shot.src} alt={shot.alt} />
        {(shot.alt || many) && (
          <figcaption>
            {shot.alt}
            {many && <span className="mono">{`${index + 1} / ${shots.length}`}</span>}
          </figcaption>
        )}
      </figure>
      <button type="button" className="lightbox-close icon-btn" aria-label="关闭预览" onClick={() => ref.current?.close()}>
        <X size={18} />
      </button>
      {many && (
        <>
          <button type="button" className="lightbox-nav is-prev icon-btn" aria-label="上一张" onClick={() => go(-1)}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" className="lightbox-nav is-next icon-btn" aria-label="下一张" onClick={() => go(1)}>
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </dialog>
  );
}

export function Screenshots({ project: p }: { project: ViewProject }) {
  const [open, setOpen] = useState<number | null>(null);
  const shots = useMemo(
    () =>
      p.readmeHtml
        ? extractScreenshots(p.readmeHtml, { fullName: p.fullName, branch: p.defaultBranch, stripTitle: [p.displayName, p.name] })
        : [],
    [p.readmeHtml, p.fullName, p.defaultBranch, p.displayName, p.name],
  );
  if (!shots.length) return null;

  return (
    <section className="shots" aria-label="预览">
      <h2 className="dl-sub">预览</h2>
      <div className="shots-row">
        {shots.map((s, i) => (
          <button key={s.src} type="button" className="shot" onClick={() => setOpen(i)} aria-label={`放大查看${s.alt ? `：${s.alt}` : `第 ${i + 1} 张截图`}`}>
            <img src={s.src} alt={s.alt} loading="lazy" decoding="async" />
          </button>
        ))}
      </div>
      {open !== null && <Lightbox shots={shots} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </section>
  );
}
