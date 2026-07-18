'use client';

import { useState } from 'react';
import {
  FileText, Image as ImageIcon, Video, FileSpreadsheet, File as FileIcon,
  ExternalLink, Download, Eye, Trash2, Paperclip,
} from 'lucide-react';
import { ImageViewer } from '@/components/tickets/ImageViewer';
import { classNames } from '@/lib/utils';
import type { NoticeAttachment } from '@/lib/api/notices';

/**
 * Notice attachment list — dispatches by file kind (pdf / image / video / office /
 * link) with preview + download. Reuses the shared ImageViewer lightbox for images
 * (the only reusable previewer in the app); PDFs/videos open in a new tab; office
 * docs download; external links open safely in a new tab. Empty → a single line,
 * never an empty placeholder grid.
 */

type Kind = 'image' | 'pdf' | 'video' | 'office' | 'link' | 'file';

function kindOf(a: NoticeAttachment): Kind {
  if (a.isLink) return 'link';
  const t = (a.fileType || '').toLowerCase();
  const u = a.fileUrl.toLowerCase();
  if (t.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(u)) return 'image';
  if (t === 'application/pdf' || /\.pdf$/.test(u)) return 'pdf';
  if (t.startsWith('video/') || /\.(mp4|webm|mov|mkv|avi)$/.test(u)) return 'video';
  if (/(word|excel|powerpoint|spreadsheet|presentation|officedocument|msword|ms-excel)/.test(t)
    || /\.(docx?|xlsx?|pptx?|csv)$/.test(u)) return 'office';
  return 'file';
}

const ICON: Record<Kind, typeof FileIcon> = {
  image: ImageIcon, pdf: FileText, video: Video, office: FileSpreadsheet, link: ExternalLink, file: FileIcon,
};
const TYPE_LABEL: Record<Kind, string> = {
  image: 'Image', pdf: 'PDF', video: 'Video', office: 'Document', link: 'Link', file: 'File',
};

function formatSize(bytes: number | null): string {
  if (bytes == null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Force-download for Cloudinary files via the fl_attachment transform. */
function downloadUrl(a: NoticeAttachment): string {
  if (a.fileUrl.includes('/upload/') && a.fileUrl.includes('cloudinary.com')) {
    return a.fileUrl.replace('/upload/', '/upload/fl_attachment/');
  }
  return a.fileUrl;
}

export function NoticeAttachments({
  attachments, canManage, onDelete,
}: {
  attachments: NoticeAttachment[];
  canManage?: boolean;
  onDelete?: (attachmentId: number) => void;
}) {
  const [viewer, setViewer] = useState<{ open: boolean; index: number }>({ open: false, index: 0 });
  const [broken, setBroken] = useState<Set<number>>(new Set());

  if (!attachments || attachments.length === 0) {
    return <p className="text-sm text-gray-400">No attachments available.</p>;
  }

  // Images share one lightbox; capture each image's index within that gallery.
  const images = attachments.filter((a) => kindOf(a) === 'image').map((a) => ({ id: a.id, url: a.fileUrl, name: a.fileName }));
  const imageIndex = (a: NoticeAttachment) => images.findIndex((im) => im.id === a.id);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {attachments.map((a) => {
          const kind = kindOf(a);
          const Icon = ICON[kind];
          return (
            <div key={a.id} className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2.5 transition hover:border-indigo-300 hover:shadow-sm">
              {kind === 'image' && !broken.has(a.id) ? (
                <button type="button" onClick={() => setViewer({ open: true, index: Math.max(0, imageIndex(a)) })}
                  className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.fileUrl} alt={a.fileName} className="h-full w-full object-cover"
                    onError={() => setBroken((prev) => new Set(prev).add(a.id))} />
                </button>
              ) : (
                <span className={classNames('flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                  kind === 'pdf' ? 'bg-rose-50 text-rose-500'
                    : kind === 'video' ? 'bg-violet-50 text-violet-500'
                      : kind === 'office' ? 'bg-emerald-50 text-emerald-600'
                        : kind === 'link' ? 'bg-sky-50 text-sky-500'
                          : 'bg-indigo-50 text-indigo-500')}>
                  <Icon className="h-5 w-5" />
                </span>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-800">{a.fileName}</p>
                <p className="text-[11px] text-gray-400">
                  {TYPE_LABEL[kind]}{a.fileSize != null && kind !== 'link' ? ` · ${formatSize(a.fileSize)}` : ''}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {kind === 'link' ? (
                  <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" title="Open link"
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-50 hover:text-sky-600"><ExternalLink className="h-4 w-4" /></a>
                ) : (
                  <>
                    {kind === 'image' ? (
                      <button type="button" onClick={() => setViewer({ open: true, index: Math.max(0, imageIndex(a)) })} title="Preview"
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-50 hover:text-indigo-600"><Eye className="h-4 w-4" /></button>
                    ) : (kind === 'pdf' || kind === 'video') ? (
                      <a href={a.fileUrl} target="_blank" rel="noopener noreferrer" title="Preview"
                        className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-50 hover:text-indigo-600"><Eye className="h-4 w-4" /></a>
                    ) : null}
                    <a href={downloadUrl(a)} target="_blank" rel="noopener noreferrer" download title="Download"
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-50 hover:text-indigo-600"><Download className="h-4 w-4" /></a>
                  </>
                )}
                {canManage && onDelete && (
                  <button type="button" onClick={() => onDelete(a.id)} title="Remove"
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-rose-50 hover:text-rose-500"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Remount per-open (key) so a fresh viewer starts at the CLICKED image —
          ImageViewer reads initialIndex only as mount-time state, so a persistent
          instance would always reopen at the first/last-viewed image. */}
      {viewer.open && images.length > 0 && (
        <ImageViewer key={viewer.index} images={images} isOpen initialIndex={viewer.index} onClose={() => setViewer({ open: false, index: 0 })} />
      )}
    </div>
  );
}

/** Compact count chip for the notice card (e.g. "2 files"). */
export function AttachmentChip({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">
      <Paperclip className="h-2.5 w-2.5" /> {count}
    </span>
  );
}
