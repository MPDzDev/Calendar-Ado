import React, { useEffect, useState } from 'react';

const TOAST_STYLES = {
  loading: {
    card:
      'border-slate-300 bg-white/95 text-slate-800 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-100',
    badge: 'border-slate-300 text-slate-600 dark:border-slate-500 dark:text-slate-200',
    accent: 'text-slate-500 dark:text-slate-300',
    icon: '...',
    label: 'loading',
  },
  info: {
    card:
      'border-blue-200 bg-white/95 text-slate-800 dark:border-blue-500/40 dark:bg-slate-800/95 dark:text-slate-100',
    badge: 'border-blue-300 text-blue-600 dark:border-blue-500 dark:text-blue-200',
    accent: 'text-blue-700 dark:text-blue-300',
    icon: 'i',
    label: 'info',
  },
  success: {
    card:
      'border-emerald-200 bg-white/95 text-slate-800 dark:border-emerald-500/40 dark:bg-slate-800/95 dark:text-slate-100',
    badge:
      'border-emerald-300 text-emerald-700 dark:border-emerald-500 dark:text-emerald-200',
    accent: 'text-emerald-700 dark:text-emerald-300',
    icon: 'ok',
    label: 'done',
  },
  error: {
    card:
      'border-red-200 bg-white/95 text-slate-800 dark:border-red-500/40 dark:bg-slate-800/95 dark:text-slate-100',
    badge: 'border-red-300 text-red-700 dark:border-red-500 dark:text-red-200',
    accent: 'text-red-700 dark:text-red-300',
    icon: '!',
    label: 'error',
  },
};

export default function ToastStack({ toasts = [], onDismiss, onAction }) {
  const [expandedInfoId, setExpandedInfoId] = useState(null);

  useEffect(() => {
    if (expandedInfoId && !toasts.some((toast) => toast.id === expandedInfoId)) {
      setExpandedInfoId(null);
    }
  }, [toasts, expandedInfoId]);

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-[70] pointer-events-none flex w-[min(26rem,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => {
        const tone = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
        const showInfo = expandedInfoId === toast.id;
        return (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            className={`pointer-events-auto rounded-xl border shadow-lg backdrop-blur-sm ${tone.card}`}
          >
            <div className="flex items-start gap-3 p-3">
              <div
                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${tone.badge}`}
                aria-hidden="true"
              >
                {toast.type === 'loading' ? (
                  <span className="inline-flex h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <span className="text-[11px] font-bold uppercase">{tone.icon}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">{toast.message}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {toast.actionLabel && typeof toast.onAction === 'function' && (
                    <button
                      type="button"
                      className="rounded-full border border-blue-300 bg-blue-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-blue-700 dark:border-blue-500"
                      onClick={() => onAction && onAction(toast)}
                    >
                      {toast.actionLabel}
                    </button>
                  )}
                  {toast.infoText && (
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                      onClick={() =>
                        setExpandedInfoId((prev) => (prev === toast.id ? null : toast.id))
                      }
                      title={toast.infoText}
                      aria-expanded={showInfo}
                      aria-label="Show blacklist details"
                    >
                      i
                    </button>
                  )}
                  <span className={`text-[11px] uppercase tracking-wide ${tone.accent}`}>
                    {tone.label}
                  </span>
                </div>
                {toast.infoText && showInfo && (
                  <p className="mt-2 rounded-md bg-black/5 px-2 py-1 text-xs leading-snug text-slate-700 dark:bg-white/10 dark:text-slate-200">
                    {toast.infoText}
                  </p>
                )}
              </div>

              <button
                type="button"
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-base leading-none text-slate-500 transition hover:bg-black/5 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={() => onDismiss && onDismiss(toast.id)}
                aria-label="Dismiss notification"
              >
                x
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
