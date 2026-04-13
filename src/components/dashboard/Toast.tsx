import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, X, AlertCircle } from 'lucide-react';
import { NotificationState } from '../../types/dashboard';

interface ToastContextType {
  showToast: (type: NotificationState['type'], title: string, message: string) => void;
  hideToast: () => void;
  notification: NotificationState;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const toastConfig = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-800 dark:text-emerald-200',
    iconBg: 'bg-emerald-100 dark:bg-emerald-800/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    Icon: CheckCircle2,
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/40',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-800 dark:text-red-200',
    iconBg: 'bg-red-100 dark:bg-red-800/60',
    iconColor: 'text-red-600 dark:text-red-400',
    Icon: AlertTriangle,
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/40',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-800 dark:text-amber-200',
    iconBg: 'bg-amber-100 dark:bg-amber-800/60',
    iconColor: 'text-amber-600 dark:text-amber-400',
    Icon: AlertCircle,
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/40',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-800 dark:text-blue-200',
    iconBg: 'bg-blue-100 dark:bg-blue-800/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
    Icon: Info,
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    type: 'info',
    title: '',
    message: '',
  });

  const showToast = useCallback((type: NotificationState['type'], title: string, message: string) => {
    setNotification({ show: true, type, title, message });
    if (type !== 'error') {
      setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
    }
  }, []);

  const hideToast = useCallback(() => {
    setNotification(prev => ({ ...prev, show: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, notification }}>
      {children}
      <Toast notification={notification} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProps {
  notification: NotificationState;
  onClose: () => void;
}

function Toast({ notification, onClose }: ToastProps) {
  if (!notification.show) return null;

  const config = toastConfig[notification.type];
  const Icon = config.Icon;

  return (
    <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-full duration-300">
      <div className={`flex items-start gap-4 p-4 rounded-2xl shadow-2xl border min-w-[320px] ${config.bg} ${config.border} ${config.text}`}>
        <div className={`p-2 rounded-xl ${config.iconBg} ${config.iconColor}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm">{notification.title}</h4>
          <p className="text-xs mt-1 opacity-90">{notification.message}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-black/5 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
