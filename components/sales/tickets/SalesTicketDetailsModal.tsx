'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X, Calendar, User, FileText, Tag, Send, Trash2,
  Ticket as TicketIcon, File as FileIcon, Paperclip, Users, Briefcase, Building2, Target,
} from 'lucide-react';
import { format } from 'date-fns';
import { ImageViewer } from '@/components/tickets/ImageViewer';
import {
  type SalesTicket,
  type SalesTicketAttachment,
  type SalesTicketDiscussion,
  fetchSalesTicketAttachments,
  fetchSalesTicketDiscussions,
  addSalesTicketDiscussion,
  deleteSalesTicketDiscussion,
  markSalesTicketDiscussionsRead,
} from '@/lib/api/salesTickets';

interface SalesTicketDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: SalesTicket | null;
  /** Current user id — used to allow deleting one's own discussion messages. */
  currentUserId?: number | string;
}

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'open': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'in_progress': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'resolved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'closed': return 'bg-gray-100 text-gray-700 border-gray-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

function priorityColor(priority: string) {
  switch (priority.toLowerCase()) {
    case 'critical': return 'bg-red-100 text-red-700 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

const isImageAttachment = (a: SalesTicketAttachment) =>
  !!a.file_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || a.file_url.includes('image/upload');

export function SalesTicketDetailsModal({ isOpen, onClose, ticket, currentUserId }: SalesTicketDetailsModalProps) {
  const [attachments, setAttachments] = useState<SalesTicketAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  const [discussions, setDiscussions] = useState<SalesTicketDiscussion[]>([]);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Image viewer state.
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load attachments + discussions, and mark the thread read, when opened.
  useEffect(() => {
    if (!isOpen || !ticket) return;

    setLoadingAttachments(true);
    fetchSalesTicketAttachments(ticket.id)
      .then(setAttachments)
      .catch(console.error)
      .finally(() => setLoadingAttachments(false));

    setLoadingDiscussions(true);
    fetchSalesTicketDiscussions(ticket.id)
      .then(setDiscussions)
      .catch(console.error)
      .finally(() => setLoadingDiscussions(false));

    markSalesTicketDiscussionsRead(ticket.id).catch(console.error);
  }, [isOpen, ticket]);

  // Auto-scroll the chat to the newest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [discussions]);

  if (!isOpen || !ticket) return null;

  const imageAttachments = attachments.filter(isImageAttachment);
  const viewerImages = imageAttachments.map((a) => ({ id: a.id, url: a.file_url, name: a.file_name }));

  const openImageViewer = (attachmentId: number) => {
    const index = viewerImages.findIndex((img) => img.id === attachmentId);
    if (index !== -1) {
      setViewerIndex(index);
      setViewerOpen(true);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = message.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await addSalesTicketDiscussion(ticket.id, text);
      setMessage('');
      const fresh = await fetchSalesTicketDiscussions(ticket.id);
      setDiscussions(fresh);
    } catch (error) {
      console.error('Failed to post message', error);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      await deleteSalesTicketDiscussion(ticket.id, messageId);
      setDiscussions((prev) => prev.filter((d) => d.id !== messageId));
    } catch (error) {
      console.error('Failed to delete message', error);
    }
  };

  const isOwnMessage = (d: SalesTicketDiscussion) =>
    currentUserId !== undefined && String(d.sender_id) === String(currentUserId);

  // Linked entities for the left meta column.
  const linkedItems: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (ticket.customer?.name) linkedItems.push({ icon: <Building2 size={14} />, label: 'Customer', value: ticket.customer.name });
  if (ticket.lead?.title) linkedItems.push({ icon: <Briefcase size={14} />, label: 'Lead', value: ticket.lead.title });
  if (ticket.deal?.title) linkedItems.push({ icon: <Target size={14} />, label: 'Deal', value: ticket.deal.title });
  if (ticket.team?.name) linkedItems.push({ icon: <Users size={14} />, label: 'Team', value: ticket.team.name });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 w-full max-w-2xl">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <TicketIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-400">TICKET-{ticket.id}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${statusColor(ticket.status)}`}>
                  {ticket.status.replace(/_/g, ' ')}
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${priorityColor(ticket.priority)}`}>
                  {ticket.priority}
                </span>
              </div>
              <h2 className="text-xl font-bold text-gray-800 mt-0.5 truncate" title={ticket.title}>{ticket.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Left Section — Ticket Details (70%) */}
          <div className="w-full lg:w-[70%] h-full overflow-y-auto p-6 bg-white border-r border-gray-100 custom-scrollbar">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <User size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Assignee</span>
                </div>
                <div className="font-medium text-sm text-gray-800">{ticket.assignee?.name || 'Unassigned'}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <User size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Reporter</span>
                </div>
                <div className="font-medium text-sm text-gray-800">{ticket.creator?.name || 'Unknown'}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Calendar size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Created</span>
                </div>
                <div className="font-medium text-sm text-gray-800">
                  {ticket.created_at ? format(new Date(ticket.created_at), 'MMM d, yyyy') : 'N/A'}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Calendar size={14} />
                  <span className="text-xs font-semibold uppercase tracking-wider">Due Date</span>
                </div>
                <div className="font-medium text-sm text-gray-800">
                  {ticket.due_date ? format(new Date(ticket.due_date), 'MMM d, yyyy') : 'Not set'}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {/* Description */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={18} className="text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-800">Description</h3>
                </div>
                <div className="text-sm leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-700 whitespace-pre-wrap">
                  {ticket.description?.trim() || <span className="italic text-gray-400">No description provided.</span>}
                </div>
              </section>

              {/* Linked entities */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Tag size={18} className="text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-800">Linked Records</h3>
                </div>
                {linkedItems.length === 0 ? (
                  <div className="text-gray-500 text-sm italic">No linked records.</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {linkedItems.map((item) => (
                      <div key={item.label} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-500 mb-1">
                          {item.icon}
                          <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
                        </div>
                        <div className="font-medium text-sm text-gray-800 truncate" title={item.value}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Category / Source */}
              <section>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Category</span>
                    <span className="text-sm font-medium text-gray-800">{ticket.category || 'Not set'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Source</span>
                    <span className="text-sm font-medium text-gray-800">{ticket.source || 'Not set'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Priority</span>
                    <span className="text-sm font-medium text-gray-800 capitalize">{ticket.priority || 'Not set'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-500">Status</span>
                    <span className="text-sm font-medium text-gray-800 capitalize">{ticket.status.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </section>

              {/* Attachments */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Paperclip size={18} className="text-gray-400" />
                  <h3 className="text-lg font-bold text-gray-800">Attachments</h3>
                </div>
                {loadingAttachments ? (
                  <div className="text-gray-500 text-sm italic">Loading attachments...</div>
                ) : attachments.length === 0 ? (
                  <div className="text-gray-500 text-sm italic">No attachments uploaded.</div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {attachments.map((att) => {
                      const isImage = isImageAttachment(att);
                      return (
                        <div key={att.id} className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow transition-shadow">
                          {isImage ? (
                            <div
                              className="h-24 bg-gray-100 cursor-pointer overflow-hidden relative group"
                              onClick={() => openImageViewer(att.id)}
                            >
                              <img src={att.file_url} alt={att.file_name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            </div>
                          ) : (
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-24 bg-blue-50 flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors"
                            >
                              <FileIcon className="w-8 h-8 text-blue-500" />
                            </a>
                          )}
                          <div className="p-2.5 border-t border-gray-100 flex flex-col justify-between flex-1">
                            <div>
                              <p className="text-xs font-bold text-gray-800 truncate" title={att.description || 'Uploaded file'}>
                                {att.description || 'Uploaded file'}
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5 truncate" title={att.file_name}>
                                {att.file_name}
                              </p>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1.5">
                              {(att.file_size / 1024).toFixed(1)} KB{att.uploader?.name ? ` • ${att.uploader.name}` : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>

          {/* Right Section — Discussion (30%) */}
          <div className="w-full lg:w-[30%] h-full flex flex-col bg-gray-50">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-2 bg-white">
              <Users size={16} className="text-blue-500" />
              <h3 className="text-sm font-bold text-gray-800">Discussion</h3>
              <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                {discussions.length}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {loadingDiscussions ? (
                <p className="text-xs text-gray-400 italic">Loading discussion...</p>
              ) : discussions.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 gap-2">
                  <Users size={28} />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs">Start the conversation below.</p>
                </div>
              ) : (
                discussions.map((d) => (
                  <div key={d.id} className="group flex gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(d.sender?.name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800 truncate">{d.sender?.name || 'Unknown'}</span>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {d.created_at ? format(new Date(d.created_at), 'MMM d, h:mm a') : ''}
                        </span>
                        {isOwnMessage(d) && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(d.id)}
                            className="ml-auto p-1 text-gray-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                            title="Delete message"
                            aria-label="Delete message"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-700 bg-white rounded-lg rounded-tl-none border border-gray-100 px-3 py-2 whitespace-pre-wrap break-words">
                        {d.message}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form onSubmit={handleSend} className="p-3 border-t border-gray-200 bg-white">
              <div className="flex items-end gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder="Write a message..."
                  rows={2}
                  className="flex-1 resize-none px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm text-gray-800 placeholder-gray-400"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  title="Send"
                  aria-label="Send message"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <ImageViewer
        images={viewerImages}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}
