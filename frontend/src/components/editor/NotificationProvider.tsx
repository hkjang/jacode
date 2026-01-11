'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface NotificationContextType {
  notifications: Notification[];
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  dismissNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

interface NotificationProviderProps {
  children: React.ReactNode;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

export function NotificationProvider({ children, position = 'bottom-right' }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = String(Date.now());
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto dismiss
    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        dismissNotification(id);
      }, duration);
    }
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, dismissNotification }}>
      {children}
      
      {/* Notification Container */}
      <div className={cn('fixed z-50 flex flex-col gap-2 max-w-sm', positionClasses[position])}>
        {notifications.map(notification => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onDismiss={() => dismissNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'border-l-green-500 bg-green-50 dark:bg-green-950/30',
  error: 'border-l-red-500 bg-red-50 dark:bg-red-950/30',
  warning: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
  info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30',
};

const iconColors = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

function NotificationToast({
  notification,
  onDismiss,
}: {
  notification: Notification;
  onDismiss: () => void;
}) {
  const Icon = icons[notification.type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 bg-background border border-l-4 rounded-lg shadow-lg animate-in slide-in-from-right',
        colors[notification.type]
      )}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', iconColors[notification.type])} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{notification.title}</div>
        {notification.message && (
          <div className="text-xs text-muted-foreground mt-0.5">{notification.message}</div>
        )}
        {notification.action && (
          <button
            className="mt-2 text-xs font-medium text-primary hover:underline"
            onClick={notification.action.onClick}
          >
            {notification.action.label}
          </button>
        )}
      </div>
      <button
        className="p-0.5 rounded hover:bg-accent transition-colors"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default NotificationProvider;
