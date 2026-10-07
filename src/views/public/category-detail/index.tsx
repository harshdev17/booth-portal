'use client'

import Link from 'next/link'

import type { CategoryRow, DocumentDefinitionRow } from '@/lib/applications/categories'
import { useLanguage } from '@/context/LanguageContext'
import { getCategoryGuideline, parseGuidelineBullet } from '@/lib/content/category-guidelines'

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
  const guideline = getCategoryGuideline(category.slug)

  return (
    <div className='mx-auto max-w-7xl px-4 py-14 sm:px-6'>
      <p className='mb-2 text-sm font-bold tracking-wide text-[var(--kdb-saffron)] uppercase'>
        {lang === 'hi' ? `श्रेणी ${category.display_order}` : `Category ${category.display_order}`}
      </p>
      <h1 className='mb-4 text-4xl font-extrabold text-[var(--kdb-primary)] sm:text-5xl'>{displayName}</h1>

      {displayDescription && <p className='mb-8 max-w-4xl text-lg leading-relaxed text-[var(--kdb-text)] sm:text-xl'>{displayDescription}</p>}

      <dl className='mb-8 grid grid-cols-1 gap-6 rounded-xl border border-[var(--kdb-border)] bg-[var(--kdb-light-bg)] p-6 sm:grid-cols-3 sm:p-8'>
        <div>
          <dt className='mb-1 text-sm font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>
            {lang === 'hi' ? 'चयन विधि' : 'Selection Method'}
          </dt>
          <dd className='text-xl font-bold text-[var(--kdb-primary)] sm:text-2xl'>{methodLabel}</dd>
        </div>
        <div>
          <dt className='mb-1 text-sm font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>
            {lang === 'hi' ? 'आवेदन शुल्क' : 'Application Fee'}
          </dt>
          <dd className='text-xl font-bold text-[var(--kdb-primary)] sm:text-2xl'>
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
        <div>
          <dt className='mb-1 text-sm font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>
            {lang === 'hi' ? 'बूथ/स्टॉल आवंटन राशि' : 'Booth/Stall Allotment Amount'}
          </dt>
          <dd className='text-xl font-bold text-[var(--kdb-primary)] sm:text-2xl'>
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
          <h2 className='mb-3 text-2xl font-extrabold text-[var(--kdb-primary)] sm:text-3xl'>
            {lang === 'hi' ? 'अनिवार्य दस्तावेज' : 'Required Documents'}
          </h2>
          <ul className='list-disc space-y-2 pl-6 text-base text-[var(--kdb-text)] sm:text-lg'>
            {documents.map(doc => (
              <li key={doc.document_key}>
                {lang === 'hi' && doc.label_hi ? doc.label_hi : doc.label}
                {doc.is_required ? '' : lang === 'hi' ? ' (वैकल्पिक)' : ' (optional)'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {guideline && (
        <div className='mb-8 rounded-xl border border-[#e2e8f0] bg-[var(--kdb-light-bg)] p-6 sm:p-8'>
          <h2 className='mb-4 text-2xl font-extrabold text-[var(--kdb-primary)] sm:text-3xl'>
            {lang === 'hi' ? 'इस श्रेणी हेतु दिशा-निर्देश' : 'Guidelines for this Category'}
          </h2>
          <ol className='flex flex-col divide-y divide-[var(--kdb-border)]'>
            {guideline.body.map((line, i) => {
              const parsed = parseGuidelineBullet(lang === 'hi' ? line.hi : line.en)

              return (
                <li key={i} className='flex gap-4 py-4'>
                  <span className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--kdb-border)] bg-white text-sm font-bold text-[var(--kdb-primary)]'>
                    {i + 1}
                  </span>
                  <div>
                    {parsed.title && (
                      <p className='mb-1 text-lg font-bold text-[var(--kdb-primary)] sm:text-xl'>{parsed.title}</p>
                    )}
                    <p className='text-base leading-relaxed text-[var(--kdb-text)] sm:text-lg'>{parsed.text}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {isAcceptingApplications ? (
        <Link
          href={`/apply/${category.slug}`}
          className='inline-block rounded-lg border border-[var(--kdb-secondary)] bg-[var(--kdb-secondary)] px-8 py-3.5 text-base font-bold text-white hover:bg-[#a96d0e]'
        >
          {lang === 'hi' ? 'आवेदन करें' : 'Apply Now'}
        </Link>
      ) : (
        <p className='text-lg text-[var(--kdb-muted)]'>
          {lang === 'hi' ? 'यह श्रेणी वर्तमान में आवेदन के लिए स्वीकार नहीं कर रही है।' : 'This category is not currently accepting applications.'}
        </p>
      )}
    </div>
  )
}

export default CategoryDetail
