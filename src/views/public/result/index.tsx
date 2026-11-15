'use client'

import { FileTextIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

import type { ResultDocumentRow } from '@/lib/draw/result-documents'

/**
 * Public Results page — admin-uploaded result PDFs (any PDF, no category
 * link), listed newest-first. Content comes entirely from the DB
 * (result_documents, migration 0076) — a page with nothing uploaded yet
 * simply shows an empty state, same pattern as the Notifications page.
 */
const ResultView = ({ documents }: { documents: ResultDocumentRow[] }) => {
  const { lang } = useLanguage()

  return (
    <div className='mx-auto max-w-4xl px-4 py-12 sm:px-6'>
      <h1 className='mb-2 text-2xl font-extrabold text-[var(--kdb-primary)] sm:text-3xl'>
        {lang === 'hi' ? 'परिणाम' : 'Result'}
      </h1>
      <p className='mb-8 text-[var(--kdb-muted)]'>
        {lang === 'hi'
          ? 'अंतरराष्ट्रीय गीता जयंती महोत्सव 2026 के ड्रॉ/आवंटन परिणाम यहां देखें।'
          : 'Draw/allotment results for International Gita Jayanti Mahotsav 2026.'}
      </p>

      {documents.length === 0 ? (
        <p className='rounded-xl border border-dashed border-[var(--kdb-border)] px-6 py-10 text-center text-[var(--kdb-muted)]'>
          {lang === 'hi' ? 'परिणाम अभी घोषित नहीं हुआ है।' : 'Result has not been declared yet.'}
        </p>
      ) : (
        <div className='rounded-xl border border-[var(--kdb-border)]'>
          <ul className='divide-y divide-[var(--kdb-border)]'>
            {documents.map(doc => (
              <li key={doc.id} className='flex items-center justify-between gap-4 px-5 py-4'>
                <div className='flex items-center gap-3'>
                  <FileTextIcon className='size-5 shrink-0 text-[var(--kdb-secondary)]' />
                  <div>
                    <span className='font-semibold text-[var(--kdb-text)]'>{doc.title || doc.originalFilename}</span>
                    <p className='text-xs text-[var(--kdb-muted)]'>
                      {new Date(doc.createdAt).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <a
                  href={doc.filePath}
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

export default ResultView
