'use client';

import { useEffect, useState } from 'react';
import { Bell, X, Info, AlertTriangle, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useSocket } from '@/providers/SocketProvider';
import { toast } from 'sonner';

interface Notification {
  id: string;
  message: string;
  type: string; // 'announcement', 'policy_update', 'info', etc.
  level?: 'info' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

export function NotificationCenter() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    const handleNotification = (data: { message: string, type: string, details?: any, timestamp?: string }) => {
      const newNotif: Notification = {
        id: Math.random().toString(36).substr(2, 9),
        message: data.message,
        type: data.type,
        level: data.details?.type || 'info', // 'type' inside details is the level for announcements
        timestamp: data.timestamp || new Date().toISOString(),
        read: false,
      };

      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Toast handling
      if (data.type === 'announcement') {
        const description = data.details?.type === 'error' ? 'Critical Announcement' 
                          : data.details?.type === 'warning' ? 'Important Announcement' 
                          : 'System Announcement';
        
        toast(data.message, { 
          description,
          duration: data.details?.type === 'error' ? 10000 : 5000, // Longer for errors
          icon: data.details?.type === 'error' ? <AlertOctagon className="text-destructive h-4 w-4" /> 
              : data.details?.type === 'warning' ? <AlertTriangle className="text-yellow-500 h-4 w-4" /> 
              : <Info className="text-blue-500 h-4 w-4" />
        });
      } else if (data.type === 'policy_update') {
        toast.info(data.message, { description: 'Editor policy updated.' });
      } else {
        toast(data.message);
      }
    };

    socket.on('notification', handleNotification);

    return () => {
      socket.off('notification', handleNotification);
    };
  }, [socket]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) {
        // Optional: mark all as read automatically on open?
        // Let's keep manual "Mark all read" or auto-mark on click.
        // For now, just reset badge if we consider opening as "glancing"
      }
    }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h4 className="font-semibold leading-none">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="xs" onClick={markAllRead} className="text-xs h-6">
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 flex gap-3 hover:bg-muted/50 transition-colors ${!notif.read ? 'bg-muted/20' : ''}`}
                >
                  <div className="mt-1">
                    {notif.level === 'error' ? <AlertOctagon className="h-4 w-4 text-destructive" /> :
                     notif.level === 'warning' ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> :
                     <Info className="h-4 w-4 text-blue-500" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={`text-sm ${!notif.read ? 'font-medium' : ''}`}>{notif.message}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(notif.timestamp).toLocaleTimeString()}</span>
                      <span className="capitalize">{notif.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => deleteNotification(notif.id, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
