'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, Image as ImageIcon, Paperclip, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { apiClient } from '@/lib/api/api-client';

interface Message {
  id: number;
  task_id: string;
  sender_id: number;
  message: string;
  created_at: string;
  sender: {
    id: number;
    name: string;
    email: string;
  };
}

export function TaskDiscussionPanel({ taskId, currentUserId }: { taskId: string, currentUserId?: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typists, setTypists] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 1. Fetch initial messages
    const fetchMessages = async () => {
      try {
        // Assume NEXT_PUBLIC_API_URL is handled via proxy or absolute path
        const res = await apiClient.get(`/tasks/${taskId}/discussions`);
        setMessages(res.data as Message[]);
        // Mark as read when opening panel
        await apiClient.post(`/tasks/${taskId}/discussions/read`);
      } catch (err) {
        console.error('Error fetching discussions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();

    // 2. Initialize Socket.IO
    const token = localStorage.getItem('authToken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // We strip /api from URL if it exists, since socket connects to base origin
    const socketUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '') : apiUrl;
    
    socketRef.current = io(socketUrl, {
      auth: { token },
      withCredentials: true
    });

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join_task_room', { taskId });
    });

    socketRef.current.on('new_message', (message: Message) => {
      setMessages((prev) => [...prev, message]);
      
      // Auto-read incoming messages while panel is open
      if (message.sender_id !== currentUserId) {
        apiClient.post(`/tasks/${taskId}/discussions/read`).catch(console.error);
      }
    });

    socketRef.current.on('message_deleted', (data: { messageId: number }) => {
      setMessages((prev) => prev.filter(m => m.id !== data.messageId));
    });

    socketRef.current.on('typing', (data: { userId: number, userName: string }) => {
      setTypists(prev => {
        const next = new Set(prev);
        next.add(data.userName);
        return next;
      });
    });

    socketRef.current.on('stop_typing', (data: { userId: number, userName: string }) => {
      setTypists(prev => {
        const next = new Set(prev);
        // Note: We need a mapping from ID to Name, or just rely on clear timeouts
        next.clear();
        return next;
      });
    });

    return () => {
      socketRef.current?.emit('leave_task_room', { taskId });
      socketRef.current?.disconnect();
    };
  }, [taskId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    // Handle typing indicator
    if (!isTyping) {
      setIsTyping(true);
      // We pass some placeholder name since we might not have user object here
      socketRef.current?.emit('typing', { taskId, userName: 'Someone' });
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('stop_typing', { taskId });
    }, 1000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const messageText = inputValue.trim();
    setInputValue('');
    setIsTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketRef.current?.emit('stop_typing', { taskId });

    try {
      await apiClient.post(`/tasks/${taskId}/discussions`, { message: messageText });
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[600px] bg-gray-50/50 rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Discussion</h3>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-medium">
          {messages.length} messages
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-10 flex flex-col items-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Send className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">No discussion yet</p>
            <p className="text-sm text-gray-400 mt-1">Start the conversation about this task.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group`}>
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs mr-2 flex-shrink-0">
                    {msg.sender.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <span className="text-xs text-gray-500 mb-1 ml-1 font-medium">{msg.sender.name}</span>
                  )}
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm shadow-sm whitespace-pre-wrap break-words ${
                      isMe
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                    }`}
                  >
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typists.size > 0 && (
        <div className="px-4 py-2 text-xs text-gray-500 italic bg-white border-t border-gray-50">
          Someone is typing...
        </div>
      )}

      {/* Input Form */}
      <div className="p-4 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder="Type a message (use @ to mention)..."
            className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-full pl-4 pr-24 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
          />
          <div className="absolute right-1.5 flex items-center gap-1">
            <button
              type="button"
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
