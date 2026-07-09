'use client';

import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/lib/hooks/useToast';
import {
  fetchMyTaskMessages, sendMyTaskMessage, deleteMyTaskMessage, markMyTaskRead,
  type MyTaskMessage,
} from '@/lib/api/myTasks';

/**
 * Real-time chat for a My Task — its OWN Socket.IO room (mytask_<id>) and its OWN
 * REST endpoints (/my-tasks/:id/messages). Membership is enforced server-side on
 * both the room join and the REST calls; a non-member sees an access-denied state.
 */
export function MyTaskChat({ taskId, currentUserId }: { taskId: number; currentUserId?: number }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<MyTaskMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [input, setInput] = useState('');
  const [typists, setTypists] = useState<Set<string>>(new Set());
  const [isTyping, setIsTyping] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const meRef = useRef<number | undefined>(currentUserId);
  meRef.current = currentUserId;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setDenied(false);
    setMessages([]);

    (async () => {
      try {
        const msgs = await fetchMyTaskMessages(taskId);
        if (!mounted) return;
        setMessages(msgs);
        markMyTaskRead(taskId).catch(() => {});
      } catch (err: any) {
        const code = err?.statusCode ?? err?.status ?? err?.response?.status;
        if (code === 403) setDenied(true);
        else console.error('Failed to load chat', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const token = localStorage.getItem('authToken');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socketUrl = apiUrl.endsWith('/api') ? apiUrl.replace('/api', '') : apiUrl;
    const socket = io(socketUrl, { auth: { token }, withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => socket.emit('join_mytask_room', { taskId }));
    socket.on('error', (e: any) => {
      if (typeof e?.message === 'string' && e.message.toLowerCase().includes('unauthor')) setDenied(true);
    });
    socket.on('mytask_new_message', (m: MyTaskMessage) => {
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      if (m.sender_id !== meRef.current) markMyTaskRead(taskId).catch(() => {});
    });
    socket.on('mytask_message_deleted', (d: { messageId: number }) => {
      setMessages((prev) => prev.filter((x) => x.id !== d.messageId));
    });
    socket.on('mytask_typing', (d: { userName: string }) => {
      if (d?.userName) setTypists((prev) => new Set(prev).add(d.userName));
    });
    socket.on('mytask_stop_typing', () => setTypists(new Set()));

    return () => {
      mounted = false;
      socket.emit('leave_mytask_room', { taskId });
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      socketRef.current?.emit('mytask_typing', { taskId, userName: 'Someone' });
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('mytask_stop_typing', { taskId });
    }, 1000);
  };

  const onSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    setIsTyping(false);
    socketRef.current?.emit('mytask_stop_typing', { taskId });
    try {
      await sendMyTaskMessage(taskId, text);
    } catch (err: any) {
      console.error('Failed to send message', err);
      // Restore the text so it is never silently lost, and explain why.
      setInput(text);
      const code = err?.statusCode ?? err?.status ?? err?.response?.status;
      toast(code === 403 ? "You don't have permission to send messages here." : 'Failed to send message.', 'error');
    }
  };

  const onDelete = async (messageId: number) => {
    try {
      await deleteMyTaskMessage(taskId, messageId);
    } catch (err) {
      console.error('Failed to delete message', err);
    }
  };

  if (denied) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-amber-100 bg-amber-50/40 text-center">
        <ShieldAlert className="mb-2 h-8 w-8 text-amber-500" />
        <p className="font-semibold text-amber-700">Chat unavailable</p>
        <p className="mt-1 text-sm text-amber-600/80">You don’t have access to this task’s chat.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-gray-100 bg-gray-50/50">
      <div className="flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
        <h3 className="font-semibold text-gray-800">Task Chat</h3>
        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
          {messages.length} messages
        </span>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
              <Send className="h-5 w-5 text-gray-400" />
            </div>
            <p className="font-medium text-gray-500">No messages yet</p>
            <p className="mt-1 text-sm text-gray-400">Start the conversation with the members.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} className={`group flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="mr-2 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                    {(msg.sender?.name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`flex max-w-[75%] flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="mb-1 ml-1 text-xs font-medium text-gray-500">{msg.sender?.name || 'Unknown'}</span>}
                  <div className="flex items-center gap-1.5">
                    {isMe && (
                      <button
                        type="button"
                        onClick={() => onDelete(msg.id)}
                        className="opacity-0 transition group-hover:opacity-100"
                        title="Delete message"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-gray-300 hover:text-rose-500" />
                      </button>
                    )}
                    <div className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2 text-sm shadow-sm ${
                      isMe ? 'rounded-tr-sm bg-blue-600 text-white' : 'rounded-tl-sm border border-gray-100 bg-white text-gray-800'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                  <span className="mt-1 text-[10px] text-gray-400">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      {typists.size > 0 && (
        <div className="border-t border-gray-50 bg-white px-4 py-2 text-xs italic text-gray-500">Someone is typing…</div>
      )}

      <div className="border-t border-gray-100 bg-white p-4">
        <form onSubmit={onSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={onInputChange}
            placeholder="Type a message…"
            className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-4 pr-12 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-1.5 rounded-full bg-blue-600 p-1.5 text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send className="ml-0.5 h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
