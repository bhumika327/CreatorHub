import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '../../lib/apiClient';
import { useToast } from '../../context/ToastContext';
import { MessageSquare, Send, EyeOff, AlertTriangle, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    email: string;
    role: string;
  };
}

interface Room {
  id: string;
  engagement: {
    id: string;
    amount: number;
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
  const { showToast } = useToast();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pollIntervalRef = useRef<any | null>(null);
  const isMountedRef = useRef(true);

  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await apiClient.get('/api/chat/rooms');
      if (res.data?.success && isMountedRef.current) {
        setRooms(res.data.data);
        
        // If navigated via contract with a target roomId in state
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

  const fetchMessages = async (roomId: string, append = false) => {
    if (!append) setLoadingMsgs(true);
    try {
      const lastMsg = messages[messages.length - 1];
      const params = lastMsg && append ? { lastMessageId: lastMsg.id } : {};

      const res = await apiClient.get(`/api/chat/room/${roomId}/messages`, { params });
      if (res.data?.success && isMountedRef.current) {
        const list = res.data.data;
        if (append) {
          if (list.length > 0) {
            setMessages((prev) => [...prev, ...list]);
          }
        } else {
          setMessages(list);
        }
      }
    } catch (err) {
      console.error('Failed to poll messages:', err);
    } finally {
      if (isMountedRef.current && !append) setLoadingMsgs(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchRooms();

    return () => {
      isMountedRef.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // Set up polling loop when active room changes
  useEffect(() => {
    // Clear any existing poll immediately
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (activeRoomId) {
      setMessages([]);
      fetchMessages(activeRoomId, false);

      // Register new periodic poll (3 seconds)
      pollIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchMessages(activeRoomId, true);
        }
      }, 3000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [activeRoomId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoomId || !text.trim()) return;

    const payloadText = text;
    setText(''); // clear input early for responsive UI

    try {
      const res = await apiClient.post(`/api/chat/room/${activeRoomId}/message`, {
        content: payloadText
      });

      if (res.data?.success && isMountedRef.current) {
        setMessages((prev) => [...prev, res.data.data]);
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Error sending message.', 'error');
    }
  };

  const activeRoom = rooms.find((r) => r.id === activeRoomId);

  return (
    <div className="flex w-full h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-150 dark:border-gray-850 overflow-hidden animate-slide-in">
      {/* Rooms Sidebar */}
      <div className="w-80 border-r border-gray-150 dark:border-gray-850 flex flex-col h-full bg-gray-50 dark:bg-gray-900 bg-opacity-40">
        <div className="p-4 border-b border-gray-150 dark:border-gray-850">
          <h3 className="font-bold text-xs text-gray-400 uppercase tracking-wider">Conversation Rooms</h3>
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
      <div className="flex-1 flex flex-col h-full">
        {activeRoom ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-150 dark:border-gray-850 flex justify-between items-center bg-gray-50 dark:bg-gray-900 bg-opacity-50">
              <div>
                <h4 className="font-bold text-sm">{activeRoom.engagement.requirement.title}</h4>
                <p className="text-xs text-gray-450 mt-0.5">Secure on-platform escrow channel</p>
              </div>
              <div className="flex items-center text-xs text-yellow-800 dark:text-yellow-450 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-250/20 px-3 py-1 rounded-full font-bold">
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
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[70%] space-y-1 ${
                        isOwnMessage ? 'ml-auto items-end' : 'mr-auto items-start'
                      }`}
                    >
                      <span className="text-[10px] text-gray-400 px-1 font-bold">{msg.sender.email}</span>
                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isOwnMessage
                            ? 'bg-green-500 text-white rounded-tr-none'
                            : 'bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-850'
                        }`}
                      >
                        {msg.content}
                      </div>

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
              <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-150 dark:border-gray-850 flex gap-2">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Write your secure message..."
              />
              <button
                type="submit"
                className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-bold shadow-md active:scale-95"
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
