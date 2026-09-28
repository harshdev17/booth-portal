import Link from 'next/link'

import type { CategoryRow, DocumentDefinitionRow } from '@/lib/applications/categories'

const SELECTION_METHOD_LABEL: Record<CategoryRow['selection_method'], string> = {
  draw: 'Draw',
  manual: 'Decided by Kurukshetra Development Board',
  auction: 'Auction',
  tender: 'Tender',
  application_fee: 'Application Fee'
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
  return (
    <div className='mx-auto max-w-3xl px-4 py-14 sm:px-6'>
      <p className='mb-2 text-xs font-bold tracking-wide text-[var(--kdb-saffron)] uppercase'>
        Category {category.display_order}
      </p>
      <h1 className='mb-4 text-3xl font-extrabold text-[var(--kdb-primary)]'>{category.name}</h1>

      {category.description && <p className='mb-6 text-[var(--kdb-text)]'>{category.description}</p>}

      <dl className='mb-8 grid grid-cols-1 gap-4 rounded-xl border border-[var(--kdb-border)] bg-[var(--kdb-light-bg)] p-6 sm:grid-cols-2'>
        <div>
          <dt className='text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>Selection Method</dt>
          <dd className='font-semibold text-[var(--kdb-primary)]'>
            {SELECTION_METHOD_LABEL[category.selection_method]}
          </dd>
        </div>
        <div>
          <dt className='text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>Application Fee</dt>
          <dd className='font-semibold text-[var(--kdb-primary)]'>
            {category.fee_paise !== null ? `₹${(category.fee_paise / 100).toLocaleString('en-IN')}` : 'To be confirmed'}
          </dd>
        </div>
      </dl>

      {documents.length > 0 && (
        <div className='mb-8'>
          <h2 className='mb-2 font-bold text-[var(--kdb-primary)]'>Required Documents</h2>
          <ul className='list-disc space-y-1 pl-5 text-sm text-[var(--kdb-text)]'>
            {documents.map(doc => (
              <li key={doc.document_key}>
                {doc.label}
                {doc.is_required ? '' : ' (optional)'}
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
          Apply Now
        </Link>
      ) : (
        <p className='text-[var(--kdb-muted)]'>This category is not currently accepting applications.</p>
      )}
    </div>
  )
}

export default CategoryDetail
