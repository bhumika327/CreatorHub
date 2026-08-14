import React, { useEffect, useState } from 'react';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { Bell, BellOff, Check, CheckCheck, Loader2, Calendar } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const NotificationsList: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { showToast } = useToast();
  const { fetchUnreadCount, setUnreadCount } = useSocket();

  const fetchNotifications = async (targetPage = 1) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/notifications', {
        params: { page: targetPage, limit: 10 }
      });
      if (res.data?.success) {
        setNotifications(res.data.data.list);
        setTotalPages(res.data.data.totalPages);
        setPage(targetPage);
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load notifications history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await apiClient.put(`/api/notifications/${id}/read`);
      if (res.data?.success) {
        setNotifications((prev) =>
          prev.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif))
        );
        // Recalculate socket badge count
        fetchUnreadCount();
        showToast('Notification marked as read', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update notification status', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await apiClient.post('/api/notifications/read-all');
      if (res.data?.success) {
        setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
        setUnreadCount(0);
        showToast('All notifications marked as read', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to mark all notifications read', 'error');
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 animate-slide-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center">
            <Bell className="w-7 h-7 mr-2 text-green-500" />
            Notifications Log
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Stay up to date with proposal bids, contract events, and system updates.
          </p>
        </div>
        
        {notifications.some(n => !n.isRead) && (
          <button
            onClick={handleMarkAllRead}
            id="btn-mark-all-read"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40 border border-green-200 dark:border-green-900/60 rounded-xl transition-all active:scale-95"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
        )}
      </div>

      {loading && notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-850 shadow-sm">
          <Loader2 className="w-10 h-10 animate-spin text-green-500" />
          <p className="text-xs text-gray-400 mt-3 font-semibold">Fetching alerts history...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-850 shadow-sm text-gray-450 space-y-3">
          <BellOff className="w-16 h-16 text-gray-300 dark:text-gray-700" />
          <p className="text-sm font-semibold">Your notifications queue is empty.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-150 dark:border-gray-850 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-850">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-5 transition-all flex items-start justify-between gap-4 ${
                  notif.isRead
                    ? 'bg-white dark:bg-gray-800'
                    : 'bg-green-50/20 dark:bg-green-950/10'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {!notif.isRead && (
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" title="Unread" />
                    )}
                    <h4 className={`text-sm font-bold truncate ${notif.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}`}>
                      {notif.title}
                    </h4>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                    {notif.message}
                  </p>
                  <div className="flex items-center text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-2 gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(notif.createdAt)}
                  </div>
                </div>

                {!notif.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    id={`btn-read-${notif.id}`}
                    title="Mark as read"
                    className="p-1.5 hover:bg-green-50 dark:hover:bg-green-950/40 text-gray-400 hover:text-green-500 dark:hover:text-green-400 border border-gray-200 dark:border-gray-750 hover:border-green-250 dark:hover:border-green-900 rounded-lg transition-all active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                disabled={page === 1}
                onClick={() => fetchNotifications(page - 1)}
                className="px-4 py-2 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-750 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 disabled:opacity-50 transition-all"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => fetchNotifications(page + 1)}
                className="px-4 py-2 text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-750 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 disabled:opacity-50 transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
