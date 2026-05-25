'use client';

import { useCallback, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export function useConfirmToast() {
  const [request, setRequest] = useState(null);

  const confirm = useCallback((options) => (
    new Promise((resolve) => {
      setRequest({
        title: options.title || 'Confirm action',
        message: options.message || '',
        confirmLabel: options.confirmLabel || 'Confirm',
        cancelLabel: options.cancelLabel || 'Cancel',
        tone: options.tone || 'default',
        resolve,
      });
    })
  ), []);

  const close = useCallback((value) => {
    setRequest((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  return {
    confirm,
    confirmationToast: request ? (
      <ConfirmToast request={request} onClose={close} />
    ) : null,
  };
}

function ConfirmToast({ request, onClose }) {
  const destructive = request.tone === 'danger';

  return (
    <div className="fixed left-1/2 top-20 z-[200] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2">
      <div className="rounded-2xl border border-white/15 bg-[#0b1930]/95 p-4 text-white shadow-2xl shadow-black/40 ring-1 ring-blue-300/10 backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
            destructive
              ? 'border-red-300/30 bg-red-500/15 text-red-200'
              : 'border-blue-300/30 bg-blue-500/15 text-blue-100'
          }`}
          >
            {destructive ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-black text-white">{request.title}</h3>
              <button
                type="button"
                onClick={() => onClose(false)}
                className="rounded-md p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
            {request.message && (
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-white/70">{request.message}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => onClose(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                {request.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => onClose(true)}
                className={`rounded-lg px-3.5 py-2 text-sm font-bold text-white shadow-lg transition ${
                  destructive
                    ? 'bg-red-600 shadow-red-900/25 hover:bg-red-500'
                    : 'bg-blue-600 shadow-blue-900/25 hover:bg-blue-500'
                }`}
              >
                {request.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
