'use client'

import Link from 'next/link'

import { MapIcon, MapPinIcon } from 'lucide-react'

import GuidelineBodyText from '@/components/public/GuidelineBodyText'
import type { CategoryRow, DocumentDefinitionRow } from '@/lib/applications/categories'
import { useLanguage } from '@/context/LanguageContext'
import { getCategoryGuideline, parseGuidelineBullet, substituteGuidelineDates } from '@/lib/content/category-guidelines'
import { formatDateTime } from '@/lib/format-date'

const SELECTION_METHOD_LABEL: Record<CategoryRow['selection_method'], { en: string; hi: string }> = {
  draw: { en: 'Draw', hi: 'ड्रॉ' },
  manual: { en: 'Decided by Kurukshetra Development Board', hi: 'कुरुक्षेत्र विकास बोर्ड द्वारा निर्धारित' },
  auction: { en: 'Auction', hi: 'ड्रॉ' },
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
  isAcceptingApplications,
  mapPdfPath
}: {
  category: CategoryRow
  documents: DocumentDefinitionRow[]
  isAcceptingApplications: boolean
  mapPdfPath: string | null
}) => {
  const { lang } = useLanguage()
  const displayName = lang === 'hi' && category.name_hi ? category.name_hi : category.name
  const baseDescription = lang === 'hi' && category.description_hi ? category.description_hi : category.description
  const displayDescription = getCategoryGuideline(category.slug)?.intro?.[lang] ?? baseDescription
  const guideline = getCategoryGuideline(category.slug)
  const methodLabel = guideline?.selectionMethod?.[lang] ?? SELECTION_METHOD_LABEL[category.selection_method][lang]
  const docOverride = guideline?.requiredDocuments
  const applicationOpensDisplay = category.application_opens_at ? formatDateTime(category.application_opens_at, lang) : null
  const applicationClosesDisplay = category.application_closes_at ? formatDateTime(category.application_closes_at, lang) : null

  return (
    <div className='mx-auto max-w-7xl px-4 py-14 sm:px-6'>
      <p className='mb-2 text-sm font-bold tracking-wide text-[var(--kdb-saffron)] uppercase'>
        {lang === 'hi' ? `श्रेणी ${category.display_order}` : `Category ${category.display_order}`}
      </p>
      <h1 className='mb-4 text-4xl font-extrabold text-[var(--kdb-primary)] sm:text-5xl'>{displayName}</h1>

      {displayDescription && <p className='mb-8 max-w-4xl text-lg leading-relaxed whitespace-pre-line text-[var(--kdb-text)] sm:text-xl'>{displayDescription}</p>}

      <dl className='mb-8 grid grid-cols-1 gap-6 rounded-xl border border-[var(--kdb-border)] bg-[var(--kdb-light-bg)] p-6 sm:grid-cols-3 sm:p-8'>
        <div>
          <dt className='mb-1 text-sm font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>
            {lang === 'hi' ? 'बूथ/स्टॉल आबंटन का तरीका' : 'Allotment Method'}
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
                : lang === 'hi'
                  ? `₹${(category.fee_paise / 100).toLocaleString('en-IN')} (जीएसटी सहित) (गैर-वापसी योग्य)`
                  : `₹${(category.fee_paise / 100).toLocaleString('en-IN')} (including GST) (Non-Refundable)`}
          </dd>
        </div>
        <div>
          <dt className='mb-1 text-sm font-bold tracking-wide text-[var(--kdb-muted)] uppercase'>
            {lang === 'hi' ? 'बूथ/स्टॉल आबंटन राशि' : 'Booth/Stall Allotment Amount'}
          </dt>
          {category.allotment_amount_paise !== null ? (
            <dd className='text-xl font-bold text-[var(--kdb-primary)] sm:text-2xl'>
              {category.allotment_amount_paise === 0
                ? lang === 'hi'
                  ? 'निःशुल्क बूथ/स्टॉल'
                  : 'Free Booth/Stall'
                : lang === 'hi'
                  ? `₹${(category.allotment_amount_paise / 100).toLocaleString('en-IN')} (जीएसटी सहित)`
                  : `₹${(category.allotment_amount_paise / 100).toLocaleString('en-IN')} (including GST)`}
            </dd>
          ) : (
            <AllotmentAmountNote
              note={(lang === 'hi' ? category.allotment_amount_note_hi : category.allotment_amount_note) ?? null}
              fallback={lang === 'hi' ? 'जल्द घोषित' : 'To be confirmed'}
            />
          )}
        </div>
      </dl>

      {/* Links to this category's own map PDF — shown only when an admin has
          actually uploaded one for this category (/admin/settings/maps).
          No fallback to the general stall-booth-locations page: uploading a
          map there makes this banner appear everywhere it's used (apply
          page, category detail, Guidelines), and removing it hides the
          banner everywhere, with nothing else to toggle per explicit
          request (2026-10-28). */}
      {mapPdfPath && (
        <div className='mb-8 flex flex-col items-start justify-between gap-4 rounded-xl border border-[#fed7aa] bg-[#fff7ed] px-5 py-4 sm:flex-row sm:items-center'>
          <div className='flex items-start gap-2.5'>
            <MapPinIcon className='mt-0.5 size-5 shrink-0 text-[#ea580c]' />
            <div>
              <p className='text-sm sm:text-base font-extrabold text-[#9a3412]'>
                {lang === 'hi' ? 'स्टॉल/बूथ लोकेशन देखें!' : 'View Stall/Booth Location!'}
              </p>
              <p className='text-xs sm:text-sm text-[#9a3412]/80'>
                {lang === 'hi'
                  ? 'आयोजन स्थल (ब्रह्म सरोवर) पर इस श्रेणी के स्टॉल/बूथ के स्थान और लेआउट की जानकारी के लिए मानचित्र देखें।'
                  : 'Check the stall/booth layout and location map for this category at Brahma Sarovar.'}
              </p>
            </div>
          </div>
          <a
            href={mapPdfPath}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex shrink-0 items-center gap-2 rounded-lg bg-[#ea580c] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#c2410c]'
          >
            <MapIcon className='size-4' />
            {lang === 'hi' ? 'स्टॉल/बूथ लोकेशन देखें' : 'View Stall/Booth Location'}
          </a>
        </div>
      )}

      <ImportantDatesSection
        note={(lang === 'hi' ? category.important_dates_note_hi : category.important_dates_note) ?? null}
        lang={lang}
      />

      {(docOverride?.length ?? documents.length) > 0 && (
        <div className='mb-8'>
          <h2 className='mb-3 text-2xl font-extrabold text-[var(--kdb-primary)] sm:text-3xl'>
            {lang === 'hi' ? 'अनिवार्य दस्तावेज' : 'Required Documents'}
          </h2>
          <ul className='list-disc space-y-2 pl-6 text-base text-[var(--kdb-text)] sm:text-lg'>
            {docOverride
              ? docOverride.map((doc, i) => <li key={i}>{doc[lang]}</li>)
              : documents.map(doc => (
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
              const rawText = lang === 'hi' ? line.hi : line.en
              const substituted = substituteGuidelineDates(rawText, applicationOpensDisplay, applicationClosesDisplay)
              const parsed = parseGuidelineBullet(substituted)

              return (
                <li key={i} className='flex gap-4 py-4'>
                  <span className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-[var(--kdb-border)] bg-white text-sm font-bold text-[var(--kdb-primary)]'>
                    {i + 1}
                  </span>
                  <div>
                    {parsed.title && (
                      <p className='mb-1 text-lg font-bold text-[var(--kdb-primary)] sm:text-xl'>{parsed.title}</p>
                    )}
                    <GuidelineBodyText
                      text={parsed.text}
                      className='text-base leading-relaxed whitespace-pre-line text-[var(--kdb-text)] sm:text-lg'
                      headingClassName='font-bold text-[var(--kdb-primary)]'
                    />
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      )}


      <div className='flex flex-wrap items-center justify-between gap-4'>
        <Link
          href='/'
          className='inline-block rounded-lg border border-[var(--kdb-border)] bg-white px-8 py-3.5 text-base font-bold text-[var(--kdb-primary)] hover:bg-[var(--kdb-light-bg)]'
        >
          {lang === 'hi' ? '← मुख्य पृष्ठ पर वापस जाएं' : '← Back to Home'}
        </Link>

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
    </div>
  )
}

/**
 * Renders a category's allotment-amount note (used when there's no single
 * `allotment_amount_paise` figure — e.g. Brand Promotion's two named tiers).
 * Most categories' notes are one short line, rendered as plain bold stat
 * text same as before. A note authored with "• " bullet lines (e.g. Brand
 * Promotion's "Small Booth: ...\n• Large Booth: ...\n\nNote: ...", migration
 * 0065) instead renders as a real bulleted list, with any non-bullet lines
 * (the first summary line, the trailing "Note:" line) shown as plain text
 * above/below — matching how the same text already reads on the Guidelines
 * page, which this compact stat card previously didn't.
 */
const AllotmentAmountNote = ({ note, fallback }: { note: string | null; fallback: string }) => {
  if (!note) {
    return <dd className='text-xl font-bold text-[var(--kdb-primary)] sm:text-2xl'>{fallback}</dd>
  }

  const lines = note.split('\n').filter(line => line.trim() !== '')
  const bulletItems = lines.filter(line => line.trim().startsWith('•')).map(line => line.trim().replace(/^•\s*/, ''))
  const plainLines = lines.filter(line => !line.trim().startsWith('•'))

  if (bulletItems.length === 0) {
    return <dd className='text-xl font-bold text-[var(--kdb-primary)] sm:text-2xl'>{note}</dd>
  }

  // First plain line (e.g. "Rs. 1 Lakh and Rs. 1.5 Lakh") is the headline
  // figure, shown big like every other stat in this card; any later plain
  // line (e.g. a trailing "Note: ...") is a smaller caption underneath the
  // list, not another headline.
  const [headline, ...captionLines] = plainLines

  return (
    <dd className='space-y-2'>
      {headline && <p className='text-xl font-bold text-[var(--kdb-primary)] sm:text-2xl'>{headline}</p>}
      <ul className='space-y-1'>
        {bulletItems.map((item, idx) => (
          <li key={idx} className='flex items-baseline gap-2 text-base font-bold text-[var(--kdb-primary)]'>
            <span className='text-sm text-[var(--kdb-saffron)]'>●</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {captionLines.map((line, idx) => (
        <p key={idx} className='text-sm font-medium text-[var(--kdb-muted)]'>
          {line.trim()}
        </p>
      ))}
    </dd>
  )
}

/**
 * "Important Dates & Deadlines" section, shown only when an admin has
 * filled it in for this category (/admin/settings/general — new
 * `important_dates_note`/`_hi` field, migration 0068). Renders nothing if
 * empty — nothing invented for a category with no supplied dates (per
 * CLAUDE.md §21). "• " bullet lines render as a real list, same parsing as
 * AllotmentAmountNote below; a non-bullet line renders as plain text.
 */
const ImportantDatesSection = ({ note, lang }: { note: string | null; lang: 'en' | 'hi' }) => {
  if (!note) return null

  const lines = note.split('\n').filter(line => line.trim() !== '')
  const bulletItems = lines.filter(line => line.trim().startsWith('•')).map(line => line.trim().replace(/^•\s*/, ''))
  const plainLines = lines.filter(line => !line.trim().startsWith('•'))

  return (
    <div className='mb-8 rounded-xl border border-[var(--kdb-border)] bg-[var(--kdb-light-bg)] p-6 sm:p-8'>
      <h2 className='mb-4 text-2xl font-extrabold text-[var(--kdb-primary)] sm:text-3xl'>
        {lang === 'hi' ? 'महत्वपूर्ण तिथियां एवं समय-सीमा' : 'Important Dates & Deadlines'}
      </h2>
      {bulletItems.length > 0 ? (
        <ul className='space-y-2.5'>
          {bulletItems.map((item, idx) => (
            <li key={idx} className='flex items-baseline gap-2.5 text-base text-[var(--kdb-text)] sm:text-lg'>
              <span className='mt-1 size-1.5 shrink-0 rounded-full bg-[var(--kdb-saffron)]' />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        plainLines.map((line, idx) => (
          <p key={idx} className='text-base text-[var(--kdb-text)] sm:text-lg'>
            {line.trim()}
          </p>
        ))
      )}
    </div>
  )
}

export default CategoryDetail
