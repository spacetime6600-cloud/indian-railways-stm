import React, { createContext, useState, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const ToastContext = createContext(null);

function Toast({ id, title, message, severity, onDismiss }) {
  const isError   = severity === 'critical';
  const isWarning = severity === 'warning' || severity === 'high';
  const isSuccess = severity === 'success' || severity === 'info';

  const borderColor = isError   ? 'border-red-500/50'
                    : isWarning ? 'border-[#FF9933]/50'
                    : 'border-emerald-500/40';
  const iconColor   = isError   ? 'text-red-400'
                    : isWarning ? 'text-[#FF9933]'
                    : 'text-emerald-400';
  const bgColor     = isError   ? 'bg-red-500/10'
                    : isWarning ? 'bg-[#FF9933]/10'
                    : 'bg-emerald-500/10';
  const icon        = isError   ? 'error'
                    : isWarning ? 'warning_amber'
                    : 'check_circle';

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0,  scale: 1 }}
      exit={{    opacity: 0, x: 80, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`w-80 bg-[#0f0f0f] border ${borderColor} rounded-xl shadow-2xl p-4 flex gap-3 items-start`}
    >
      <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <span className={`material-symbols-outlined text-sm ${iconColor}`}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white truncate">{title}</div>
        <div className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{message}</div>
      </div>
      <button onClick={() => onDismiss(id)} className="text-zinc-600 hover:text-white transition-colors flex-shrink-0">
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const showToast = useCallback((opts, duration = 6000) => {
    const id = ++counterRef.current;
    setToasts(prev => [...prev, { id, ...opts }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const container = typeof document !== 'undefined' ? document.body : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {container && ReactDOM.createPortal(
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
          <AnimatePresence>
            {toasts.map(t => (
              <div key={t.id} className="pointer-events-auto">
                <Toast {...t} onDismiss={dismiss} />
              </div>
            ))}
          </AnimatePresence>
        </div>,
        container
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}
