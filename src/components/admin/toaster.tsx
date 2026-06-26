'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'success' | 'danger';
type ToastInput = { title: string; description?: string; variant?: Variant };
type Toast = ToastInput & { id: number };

const ToastCtx = createContext<(t: ToastInput) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

/**
 * Minimal, dependency-free toast surface. Wrap the admin shell content once;
 * call `useToast()()` from any client component to fire a toast.
 */
export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (t: ToastInput) => {
      const id = ++counter.current;
      setToasts((cur) => [...cur, { ...t, id }]);
      window.setTimeout(() => dismiss(id), 3200);
    },
    [dismiss],
  );

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={cn('rz-toast pointer-events-auto text-left', t.variant ?? 'default')}
            role="status"
          >
            <p className="text-sm font-semibold">{t.title}</p>
            {t.description ? <p className="mt-0.5 text-xs opacity-80">{t.description}</p> : null}
          </button>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
