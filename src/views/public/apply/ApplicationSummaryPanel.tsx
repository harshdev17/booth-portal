'use client'

import { useLanguage } from '@/context/LanguageContext'
import { formatFeeBreakdownLine, formatRupees } from '@/views/public/apply/format-fee'
import type { CategoryConfigResponse } from '@/views/public/apply/types'

const SELECTION_METHOD_LABEL: Record<CategoryConfigResponse['category']['selectionMethod'], { en: string; hi: string }> = {
  draw: { en: 'Lucky Draw', hi: 'लकी ड्रॉ' },
  manual: { en: 'Decided by Board', hi: 'बोर्ड द्वारा निर्धारित' },
  auction: { en: 'Auction', hi: 'नीलामी' },
  tender: { en: 'Tender', hi: 'निविदा (टेंडर)' },
  application_fee: { en: 'Direct Allotment', hi: 'सीधा आवंटन' }
}

const formatDate = (value: string | null, lang: 'en' | 'hi') => {
  if (!value) return null

  return new Date(value).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Compact at-a-glance summary shown at the top of the application page:
 * category, selection method, fee, deadline, required-document count.
 */
const ApplicationSummaryPanel = ({ config }: { config: CategoryConfigResponse }) => {
  const { lang } = useLanguage()
  const { category, documents } = config
  const closesAt = formatDate(category.applicationClosesAt, lang)
  const feeBreakdownLine = formatFeeBreakdownLine(category.feeBasePaise, category.gstPercent)
  const requiredDocCount = documents.filter(d => d.required).length

  const displayName = lang === 'hi' && category.nameHi ? category.nameHi : category.name
  const methodLabel =
    SELECTION_METHOD_LABEL[category.selectionMethod]?.[lang] ??
    SELECTION_METHOD_LABEL[category.selectionMethod]?.en ??
    category.selectionMethod

  return (
    <div className='mb-8 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-sm'>
      {/* Top Header Strip with Saffron Accent */}
      <div className='flex items-center justify-between border-b border-[#0c2847] bg-[#0c2847] px-6 py-3.5 text-white'>
        <div className='flex items-center gap-2.5'>
          <span className='h-2 w-2 rounded-full bg-[#fbd38d]' />
          <p className='text-sm font-bold tracking-wide'>
            {lang === 'hi'
              ? 'अंतर्राष्ट्रीय गीता महोत्सव 2026 — आधिकारिक स्टॉल आवेदन सारांश'
              : 'International Gita Mahotsav 2026 — Official Stall Application Summary'}
          </p>
        </div>
      </div>

      <dl className='grid grid-cols-2 gap-x-6 gap-y-5 p-6 sm:grid-cols-4 sm:p-7 bg-[#fafbfc]'>
        <div>
          <dt className='text-xs font-bold tracking-wider text-[#64748b] uppercase'>
            {lang === 'hi' ? 'स्टॉल श्रेणी' : 'Category'}
          </dt>
          <dd className='mt-1 text-base font-extrabold text-[#0c2847]'>{displayName}</dd>
        </div>
        <div>
          <dt className='text-xs font-bold tracking-wider text-[#64748b] uppercase'>
            {lang === 'hi' ? 'चयन विधि' : 'Selection Method'}
          </dt>
          <dd className='mt-1 text-base font-extrabold text-[#0c2847]'>{methodLabel}</dd>
        </div>
        <div>
          <dt className='text-xs font-bold tracking-wider text-[#64748b] uppercase'>
            {lang === 'hi' ? 'आवेदन शुल्क' : 'Application Fee'}
          </dt>
          <dd className='mt-1 text-base font-extrabold text-[#0c2847]'>
            {category.feePaise !== null ? (
              <>
                <span className='text-[#d8891d]'>{formatRupees(category.feePaise)}</span>
                {feeBreakdownLine && (
                  <span className='ml-1.5 text-xs font-medium text-[#64748b]'>({feeBreakdownLine})</span>
                )}
              </>
            ) : lang === 'hi' ? (
              'जल्द घोषित'
            ) : (
              'To be confirmed'
            )}
          </dd>
        </div>
        <div>
          <dt className='text-xs font-bold tracking-wider text-[#64748b] uppercase'>
            {closesAt
              ? lang === 'hi'
                ? 'आवेदन की अंतिम तिथि'
                : 'Application Last Date'
              : lang === 'hi'
                ? 'अनिवार्य दस्तावेज'
                : 'Required Documents'}
          </dt>
          <dd className='mt-1 text-base font-extrabold text-[#0c2847]'>
            {closesAt ??
              (lang === 'hi'
                ? `${requiredDocCount} दस्तावेज`
                : `${requiredDocCount} Document${requiredDocCount === 1 ? '' : 's'}`)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

export default ApplicationSummaryPanel
