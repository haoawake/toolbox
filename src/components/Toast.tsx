import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

export interface ToastInput {
  title: string;
  description?: ReactNode;
  tone?: 'success' | 'info' | 'warn';
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastItem extends ToastInput {
  id: number;
  leaving?: boolean;
}

const ToastContext = createContext<(t: ToastInput) => void>(() => {});

export const useToast = () => useContext(ToastContext);

let seq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((s) => s.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    window.setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 220);
  }, []);

  const push = useCallback(
    (t: ToastInput) => {
      const id = ++seq;
      setItems((s) => [...s.filter((x) => !x.leaving).slice(-2), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.duration ?? 6500);
    },
    [dismiss],
  );

  return (
    <ToastContext value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast tone-${t.tone ?? 'info'} ${t.leaving ? 'is-leaving' : ''}`}>
            <span className="toast-ico">
              {t.tone === 'success' ? <CircleCheck size={19} /> : t.tone === 'warn' ? <TriangleAlert size={19} /> : <Info size={19} />}
            </span>
            <div className="toast-body">
              <strong>{t.title}</strong>
              {t.description && <p>{t.description}</p>}
              {t.action && (
                <button
                  type="button"
                  className="toast-action"
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                >
                  {t.action.label} →
                </button>
              )}
            </div>
            <button type="button" className="toast-close" aria-label="关闭提示" onClick={() => dismiss(t.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext>
  );
}
