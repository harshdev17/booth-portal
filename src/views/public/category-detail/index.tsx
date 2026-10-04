'use client'

import Link from 'next/link'

import type { CategoryRow, DocumentDefinitionRow } from '@/lib/applications/categories'
import { useLanguage } from '@/context/LanguageContext'

const SELECTION_METHOD_LABEL: Record<CategoryRow['selection_method'], { en: string; hi: string }> = {
  draw: { en: 'Draw', hi: 'लकी ड्रॉ' },
  manual: { en: 'Decided by Kurukshetra Development Board', hi: 'कुरुक्षेत्र विकास बोर्ड द्वारा निर्धारित' },
  auction: { en: 'Auction', hi: 'नीलामी' },
  tender: { en: 'Tender', hi: 'निविदा (टेंडर)' },
  application_fee: { en: 'Application Fee', hi: 'आवेदन शुल्क' }
}

/**
 * Category detail page per .ai/HOMEPAGE.md Section 5: name, description,
 * fee (if configured), required documents, and an Apply CTA — all read from
 * the same configuration tables the application form itself uses, not a
 * static PDF (unlike the previous year's reference site).
 */
const CategoryDetail = ({
  category,
  documents,
  isAcceptingApplications
}: {
  category: CategoryRow
  documents: DocumentDefinitionRow[]
  isAcceptingApplications: boolean
}) => {
  const { lang } = useLanguage()
  const displayName = lang === 'hi' && category.name_hi ? category.name_hi : category.name
  const displayDescription = lang === 'hi' && category.description_hi ? category.description_hi : category.description
  const methodLabel = SELECTION_METHOD_LABEL[category.selection_method][lang]

  return (
    <div className='mx-auto max-w-3xl px-4 py-14 sm:px-6'>
      <p className='mb-2 text-xs font-bold tracking-wide text-[var(--kdb-saffron)] uppercase'>
        {lang === 'hi' ? `श्रेणी ${category.display_order}` : `Category ${category.display_order}`}
      </p>
      <h1 className='mb-4 text-3xl font-extrabold text-[var(--kdb-primary)]'>{displayName}</h1>

      {displayDescription && <p className='mb-6 text-[var(--kdb-text)]'>{displayDescription}</p>}

      <dl className='mb-8 grid grid-cols-1 gap-4 rounded-xl border border-[var(--kdb-border)] bg-[var(--kdb-light-bg)] p-6 sm:grid-cols-2'>
        <div>
          <dt className='text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>
            {lang === 'hi' ? 'चयन विधि' : 'Selection Method'}
          </dt>
          <dd className='font-semibold text-[var(--kdb-primary)]'>{methodLabel}</dd>
        </div>
        <div>
          <dt className='text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>
            {lang === 'hi' ? 'आवेदन शुल्क' : 'Application Fee'}
          </dt>
          <dd className='font-semibold text-[var(--kdb-primary)]'>
            {category.fee_paise === null
              ? lang === 'hi'
                ? 'जल्द घोषित'
                : 'To be confirmed'
              : category.fee_paise === 0
                ? lang === 'hi'
                  ? 'लागू नहीं'
                  : 'Not Applicable'
                : `₹${(category.fee_paise / 100).toLocaleString('en-IN')}`}
          </dd>
        </div>
        <div className='sm:col-span-2'>
          <dt className='text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>
            {lang === 'hi' ? 'बूथ/स्टॉल आवंटन राशि' : 'Booth/Stall Allotment Amount'}
          </dt>
          <dd className='font-semibold text-[var(--kdb-primary)]'>
            {category.allotment_amount_paise !== null
              ? category.allotment_amount_paise === 0
                ? lang === 'hi'
                  ? 'निःशुल्क स्टॉल'
                  : 'Free Stall'
                : `₹${(category.allotment_amount_paise / 100).toLocaleString('en-IN')}`
              : (lang === 'hi' ? category.allotment_amount_note_hi : category.allotment_amount_note) ??
                (lang === 'hi' ? 'जल्द घोषित' : 'To be confirmed')}
          </dd>
        </div>
      </dl>

      {documents.length > 0 && (
        <div className='mb-8'>
          <h2 className='mb-2 font-bold text-[var(--kdb-primary)]'>
            {lang === 'hi' ? 'अनिवार्य दस्तावेज' : 'Required Documents'}
          </h2>
          <ul className='list-disc space-y-1 pl-5 text-sm text-[var(--kdb-text)]'>
            {documents.map(doc => (
              <li key={doc.document_key}>
                {lang === 'hi' && doc.label_hi ? doc.label_hi : doc.label}
                {doc.is_required ? '' : lang === 'hi' ? ' (वैकल्पिक)' : ' (optional)'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAcceptingApplications ? (
        <Link
          href={`/apply/${category.slug}`}
          className='inline-block rounded-lg border border-[var(--kdb-secondary)] bg-[var(--kdb-secondary)] px-6 py-3 text-sm font-bold text-white hover:bg-[#a96d0e]'
        >
          {lang === 'hi' ? 'आवेदन करें' : 'Apply Now'}
        </Link>
      ) : (
        <p className='text-[var(--kdb-muted)]'>
          {lang === 'hi' ? 'यह श्रेणी वर्तमान में आवेदन के लिए स्वीकार नहीं कर रही है।' : 'This category is not currently accepting applications.'}
        </p>
      )}
    </div>
  )
}

export default CategoryDetail
