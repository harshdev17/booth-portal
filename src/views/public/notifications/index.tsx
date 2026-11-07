'use client'

import { FileIcon, ImageIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

import type { NotificationFileRow } from '@/lib/settings/notification-files'

/**
 * Public Notification Board — admin-uploaded PDFs/images (notices,
 * circulars, announcements), listed newest-first. Same pattern as the
 * Stall/Booth Locations page: content comes entirely from the DB
 * (notification_files, migration 0074), nothing hardcoded — a page with no
 * notifications uploaded yet simply shows an empty state.
 */
const NotificationsView = ({ files }: { files: NotificationFileRow[] }) => {
  const { lang } = useLanguage()

  return (
    <div className='mx-auto max-w-4xl px-4 py-12 sm:px-6'>
      <h1 className='mb-2 text-2xl font-extrabold text-[var(--kdb-primary)] sm:text-3xl'>
        {lang === 'hi' ? 'सूचनाएं' : 'Notifications'}
      </h1>
      <p className='mb-8 text-[var(--kdb-muted)]'>
        {lang === 'hi'
          ? 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 से संबंधित आधिकारिक सूचनाएं, परिपत्र और घोषणाएं यहां देखें।'
          : 'Official notices, circulars, and announcements related to International Gita Jayanti Mahotsav 2026.'}
      </p>

      {files.length === 0 ? (
        <p className='rounded-xl border border-dashed border-[var(--kdb-border)] px-6 py-10 text-center text-[var(--kdb-muted)]'>
          {lang === 'hi' ? 'अभी कोई सूचना उपलब्ध नहीं है।' : 'No notifications available right now.'}
        </p>
      ) : (
        <div className='rounded-xl border border-[var(--kdb-border)]'>
          <ul className='divide-y divide-[var(--kdb-border)]'>
            {files.map(file => (
              <li key={file.id} className='flex items-center justify-between gap-4 px-5 py-4'>
                <div className='flex items-center gap-3'>
                  {file.fileType === 'pdf' ? (
                    <FileIcon className='size-5 shrink-0 text-[var(--kdb-secondary)]' />
                  ) : (
                    <ImageIcon className='size-5 shrink-0 text-[var(--kdb-secondary)]' />
                  )}
                  <span className='font-semibold text-[var(--kdb-text)]'>
                    {lang === 'hi' && file.titleHi ? file.titleHi : file.title}
                  </span>
                </div>
                <a
                  href={file.filePath}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--kdb-secondary)] px-4 py-2 text-sm font-bold text-[var(--kdb-secondary)] transition hover:bg-[var(--kdb-secondary)] hover:text-white'
                >
                  {lang === 'hi' ? 'देखें' : 'View'}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default NotificationsView
