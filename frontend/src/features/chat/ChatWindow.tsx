import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { MessageSquare, Send, EyeOff, AlertTriangle, Loader2, Wifi, WifiOff } from 'lucide-react';

interface Message {
  id: string;
  roomId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    role: string;
    customerProfile?: { fullName: string } | null;
    creatorProfile?: { displayName: string } | null;
  };
}

interface Room {
  id: string;
  engagement: {
    id: string;
    amount: number;
    creatorId: string;
    customerId: string;
    requirement: {
      title: string;
    };
  };
}

export const ChatWindow: React.FC = () => {
  const location = useLocation();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const { showToast } = useToast();

  const { socket, connected, onlineUsers, fetchUnreadCount } = useSocket();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const typingTimeoutRef = useRef<any>(null);
  const isTypingRef = useRef(false);

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await apiClient.get('/api/chat/rooms');
      if (res.data?.success && isMountedRef.current) {
        setRooms(res.data.data);
        
        const stateRoomId = location.state?.roomId;
        if (stateRoomId) {
          setActiveRoomId(stateRoomId);
        } else if (res.data.data.length > 0) {
          setActiveRoomId(res.data.data[0].id);
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast('Failed to load active chat rooms', 'error');
    } finally {
      if (isMountedRef.current) setLoadingRooms(false);
    }
  };

  const fetchMessagesHistory = async (roomId: string) => {
    setLoadingMsgs(true);
    try {
      const res = await apiClient.get(`/api/chat/room/${roomId}/messages`);
      if (res.data?.success && isMountedRef.current) {
        setMessages(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load messages history:', err);
      showToast('Failed to load messages history', 'error');
    } finally {
      if (isMountedRef.current) setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchRooms();

    return () => {
      isMountedRef.current = false;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Socket room joining and event bindings on activeRoomId changes
  useEffect(() => {
    if (!socket || !activeRoomId) return;

    // Load static message history
    fetchMessagesHistory(activeRoomId);
    setPartnerTyping(false);

    // Join room on Socket.io server
    socket.emit('join_room', { roomId: activeRoomId }, (res: any) => {
      if (res && !res.success) {
        showToast(res.message || 'Failed to join chat channel', 'error');
      }
    });

    // Mark messages in this room as read immediately
    socket.emit('mark_messages_read', { roomId: activeRoomId });

    // Define listeners
    const handleMessageReceived = (data: { message: Message; filtered: boolean }) => {
      if (data.message.roomId === activeRoomId) {
        setMessages((prev) => [...prev, data.message]);
        
        // Auto-mark as read since the room is active
        socket.emit('mark_messages_read', { roomId: activeRoomId });
        fetchUnreadCount();
      }
    };

    const handleUserTyping = (data: { roomId: string; userId: string; isTyping: boolean }) => {
      if (data.roomId === activeRoomId) {
        const activeRoom = rooms.find((r) => r.id === activeRoomId);
        if (activeRoom) {
          const partnerId = activeRoom.engagement.creatorId === currentUser?.id
            ? activeRoom.engagement.customerId
            : activeRoom.engagement.creatorId;
          
          if (data.userId === partnerId) {
            setPartnerTyping(data.isTyping);
          }
        }
      }
    };

    const handleMessagesRead = (data: { roomId: string; userId: string }) => {
      if (data.roomId === activeRoomId) {
        // Update all user's sent messages in active room as read in client state
        setMessages((prev) =>
          prev.map((m) => (m.sender.id === currentUser?.id ? { ...m, isRead: true } : m))
        );
      }
    };

    // Bind listeners
    socket.on('message_received', handleMessageReceived);
    socket.on('user_typing', handleUserTyping);
    socket.on('messages_read', handleMessagesRead);

    return () => {
      // Leave room cleanup
      socket.off('message_received', handleMessageReceived);
      socket.off('user_typing', handleUserTyping);
      socket.off('messages_read', handleMessagesRead);
    };
  }, [socket, activeRoomId, rooms]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const handleTypingKeypress = () => {
    if (!socket || !activeRoomId) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', { roomId: activeRoomId, isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit('typing', { roomId: activeRoomId, isTyping: false });
      }
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomId || !text.trim() || !socket) return;

    const payloadText = text;
    setText(''); // clear input early for responsive UI

    // Emit send_message event
    socket.emit('send_message', { roomId: activeRoomId, content: payloadText }, (res: any) => {
      if (res.success) {
        setMessages((prev) => [...prev, res.data]);
        if (res.filtered) {
          showToast('Contact information removed for privacy safety.', 'warning');
        }
      } else {
        showToast(res.message || 'Failed to send message', 'error');
        setText(payloadText); // restore text if failed
      }
    });

    // Clear typing status
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('typing', { roomId: activeRoomId, isTyping: false });
    }
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  // Derive partner's presence
  let isPartnerOnline = false;
  let partnerName = 'Partner';
  if (activeRoom && currentUser) {
    const partnerId = activeRoom.engagement.creatorId === currentUser.id
      ? activeRoom.engagement.customerId
      : activeRoom.engagement.creatorId;
    isPartnerOnline = onlineUsers.includes(partnerId);
    partnerName = activeRoom.engagement.creatorId === currentUser.id ? 'Client' : 'Creator';
  }

  return (
    <div className="flex w-full h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-150 dark:border-gray-850 overflow-hidden animate-slide-in">
      {/* Rooms Sidebar */}
      <div className="w-80 border-r border-gray-150 dark:border-gray-850 flex flex-col h-full bg-gray-50 dark:bg-gray-900 bg-opacity-40">
        <div className="p-4 border-b border-gray-150 dark:border-gray-850 flex justify-between items-center">
          <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Conversation Rooms</h3>
          {connected ? (
            <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold bg-green-50 dark:bg-green-950/40 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-900/60">
              <Wifi className="w-3 h-3" /> Live
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/60 animate-pulse">
              <WifiOff className="w-3 h-3" /> Offline
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingRooms ? (
            <div className="text-center py-6 text-xs text-gray-400">Loading channels...</div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">No active chat channels. Initiate hire to activate chat.</div>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setActiveRoomId(room.id)}
                className={`w-full text-left p-3 rounded-xl text-sm transition-all ${
                  activeRoomId === room.id
                    ? 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400 font-bold'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-600 dark:text-gray-300'
                }`}
              >
                <div className="truncate">{room.engagement.requirement.title}</div>
                <div className="text-xs text-gray-450 mt-1">Escrow: ${room.engagement.amount}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Connection issue banner */}
        {!connected && (
          <div className="bg-red-500 text-white text-xs font-bold text-center py-2 px-4 flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 animate-bounce" />
            Connection lost. Attempting to reconnect to chat server...
          </div>
        )}

        {activeRoom ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-150 dark:border-gray-850 flex justify-between items-center bg-gray-50 dark:bg-gray-900 bg-opacity-50">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm truncate">{activeRoom.engagement.requirement.title}</h4>
                  <span
                    className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPartnerOnline
                        ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-450'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full mr-1 ${isPartnerOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {isPartnerOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
                <p className="text-xs text-gray-450 mt-0.5">Secure on-platform escrow channel</p>
              </div>
              <div className="flex items-center text-xs text-yellow-800 dark:text-yellow-450 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-250/20 px-3 py-1 rounded-full font-bold shrink-0">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Anti-Leak Filter Active
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMsgs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin w-8 h-8 text-green-500" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400">No messages. Send a message to start conversation.</div>
              ) : (
                messages.map((msg) => {
                  const isOwnMessage = msg.sender.id === currentUser?.id;
                  const isSystemAlert = msg.content.includes('[PHONE NUMBER REMOVED]') || msg.content.includes('[EMAIL REMOVED]');
                  const senderName = msg.sender.creatorProfile?.displayName || msg.sender.customerProfile?.fullName || msg.sender.role;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[70%] space-y-1 ${
                        isOwnMessage ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <span className="text-[10px] text-gray-400 px-1 font-bold">
                        {senderName} ({msg.sender.role.toLowerCase()})
                      </span>
                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isOwnMessage
                            ? 'bg-green-500 text-white rounded-tr-none'
                            : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-850'
                        }`}
                      >
                        {msg.content}
                      </div>

                      {/* Read Status Indicators */}
                      {isOwnMessage && (
                        <span className="text-[9px] text-gray-450 font-bold px-1 select-none">
                          {msg.isRead ? 'Read' : 'Sent'}
                        </span>
                      )}

                      {/* Display Alert tags warning if filter triggers */}
                      {isSystemAlert && (
                        <span className="flex items-center text-[10px] text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/50 p-1.5 px-3 rounded-lg mt-1 border border-yellow-200 dark:border-yellow-900/60 font-semibold shadow-sm animate-slide-in">
                          <EyeOff className="w-3.5 h-3.5 mr-1" />
                          Security block: Personal contact info filtered to prevent platform bypass.
                        </span>
                      )}
                    </div>
                  );
                })
              )}

              {/* Partner Typing Indicator */}
              {partnerTyping && (
                <div className="flex items-center space-x-1.5 mr-auto max-w-[70%] text-xs text-gray-400 dark:text-gray-500 font-semibold italic bg-gray-50 dark:bg-gray-900 bg-opacity-40 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-850 shadow-sm animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-green-500" />
                  {partnerName} is typing...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-150 dark:border-gray-850 flex gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  handleTypingKeypress();
                }}
                disabled={!connected}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                placeholder={connected ? "Write your secure message..." : "Reconnecting to server, please wait..."}
              />
              <button
                type="submit"
                disabled={!connected}
                className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-bold shadow-md active:scale-95 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-2">
            <MessageSquare className="w-16 h-16 text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-semibold">Select an active conversation channel to start secure chats.</p>
          </div>
        )}
      </div>
    </div>
  );
};
