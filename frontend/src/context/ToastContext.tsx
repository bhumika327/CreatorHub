import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 shrink-0" />;
    }
  };

  const getTypeStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-green-200 dark:border-green-900 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-green-50/20';
      case 'error':
        return 'border-red-200 dark:border-red-900 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-red-50/20';
      case 'warning':
        return 'border-yellow-200 dark:border-yellow-900 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-yellow-50/20';
      default:
        return 'border-blue-200 dark:border-blue-900 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 shadow-blue-50/20';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Portal/Container Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-4 rounded-xl border shadow-xl pointer-events-auto transform translate-y-0 transition-all duration-300 animate-slide-in ${getTypeStyles(
              toast.type
            )}`}
            role="alert"
          >
            {getIcon(toast.type)}
            <div className="flex-1 text-sm font-semibold leading-relaxed">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
