import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken, addTokenChangeListener } from '../lib/tokenStore';
import { apiClient } from '../lib/apiClient';
import { useToast } from './ToastContext';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  onlineUsers: string[];
  fetchUnreadCount: () => Promise<void>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const { showToast } = useToast();
  const socketRef = useRef<Socket | null>(null);

  const fetchUnreadCount = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const res = await apiClient.get('/api/notifications/unread-count');
      if (res.data?.success) {
        setUnreadCount(res.data.data.count);
      }
    } catch (err) {
      console.error('Failed to fetch unread notification count:', err);
    }
  };

  useEffect(() => {
    const handleTokenChange = (token: string | null) => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }

      if (token) {
        const newSocket = io('http://localhost:5000', {
          auth: { token },
          autoConnect: true,
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: Infinity
        });

        newSocket.on('connect', () => {
          setConnected(true);
          console.log('[Socket.io] Connected to server.');
          fetchUnreadCount();
        });

        newSocket.on('disconnect', (reason) => {
          setConnected(false);
          console.log('[Socket.io] Disconnected:', reason);
        });

        newSocket.on('connect_error', (err) => {
          console.error('[Socket.io] Connection error:', err.message);
          setConnected(false);
        });

        newSocket.on('notification', (notification) => {
          setUnreadCount((prev) => prev + 1);
          showToast(`🔔 ${notification.title}: ${notification.message}`, 'info');
        });

        newSocket.on('online_users_list', (list: string[]) => {
          setOnlineUsers(list);
        });

        newSocket.on('user_presence', ({ userId, status }: { userId: string; status: 'online' | 'offline' }) => {
          setOnlineUsers((prev) => {
            if (status === 'online') {
              return prev.includes(userId) ? prev : [...prev, userId];
            } else {
              return prev.filter((id) => id !== userId);
            }
          });
        });

        socketRef.current = newSocket;
        setSocket(newSocket);
      }
    };

    const unsubscribe = addTokenChangeListener(handleTokenChange);

    // Bootstrap if token is already present (e.g. from local memory)
    const currentToken = getAccessToken();
    if (currentToken) {
      handleTokenChange(currentToken);
    }

    return () => {
      unsubscribe();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [showToast]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        unreadCount,
        setUnreadCount,
        onlineUsers,
        fetchUnreadCount
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
