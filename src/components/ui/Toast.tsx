import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const remove = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg animate-slide-up min-w-[280px] max-w-md ${
              t.type === 'success' ? 'bg-emerald-600 text-white' : t.type === 'error' ? 'bg-brand-600 text-white' : 'bg-slate-900 text-white'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0" />}
            {t.type === 'info' && <Info className="h-5 w-5 shrink-0" />}
            <p className="text-sm font-medium flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="shrink-0 opacity-80 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
