'use client'

import { AlertTriangleIcon, BanknoteIcon } from 'lucide-react'

import { useLanguage } from '@/context/LanguageContext'

import type { AuctionPaymentSettings } from '@/lib/settings/auction-payment'

/**
 * Offline NEFT/RTGS bank-transfer instructions page (migration 0097) — for
 * applicants who can't complete a high-value payment online. All content
 * (bank details, instructions, notice) is admin-editable from
 * /admin/settings/auction-payment; the "submit your transaction details"
 * action at the bottom is an admin-supplied external Google Form link, not a
 * form built in this app — per explicit request: "google form ka link aaje
 * ga bas .... admin hi daal ga ye link bhi".
 */
const AuctionPaymentView = ({ settings }: { settings: AuctionPaymentSettings }) => {
  const { lang } = useLanguage()

  const bankFields: Array<{ labelEn: string; labelHi: string; value: string | null }> = [
    { labelEn: 'Bank Name', labelHi: 'बैंक का नाम', value: settings.bankName },
    { labelEn: 'Account Number', labelHi: 'खाता संख्या', value: settings.accountNumber },
    { labelEn: 'IFSC Code', labelHi: 'आईएफएससी कोड', value: settings.ifscCode },
    { labelEn: 'Branch Name', labelHi: 'शाखा का नाम', value: settings.branchName },
    { labelEn: 'Account Type', labelHi: 'खाता प्रकार', value: settings.accountType },
    { labelEn: 'Payment Mode', labelHi: 'भुगतान का तरीका', value: settings.paymentMode }
  ].filter(field => field.value)

  const instructionsLines = (lang === 'hi' ? settings.instructionsTextHi : settings.instructionsText)
    ?.split('\n')
    .map(line => line.trim())
    .filter(Boolean)

  const noticeText = lang === 'hi' ? settings.noticeTextHi : settings.noticeText

  return (
    <div className='mx-auto max-w-3xl px-4 py-12 sm:px-6'>
      <h1 className='mb-2 flex items-center gap-2.5 text-2xl font-extrabold text-[var(--kdb-primary)] sm:text-3xl'>
        <BanknoteIcon className='size-7 shrink-0' />
        {lang === 'hi' ? 'नीलामी भुगतान' : 'Auction Payment'}
      </h1>
      <p className='mb-8 text-[var(--kdb-muted)]'>
        {lang === 'hi'
          ? 'जो आवेदक अधिक राशि का भुगतान ऑनलाइन नहीं कर पा रहे हैं, वे अपना नीलामी भुगतान NEFT या RTGS के माध्यम से सीधे आधिकारिक बैंक खाते में ट्रांसफर कर सकते हैं।'
          : 'Applicants who are unable to make high-value online payments can transfer their auction payment directly to the official bank account through NEFT or RTGS.'}
      </p>

      {settings.beneficiaryName && (
        <div className='mb-6 rounded-xl border border-[var(--kdb-border)] bg-white p-5'>
          <p className='text-xs font-extrabold tracking-wide text-[#b8761b] uppercase'>
            {lang === 'hi' ? 'लाभार्थी का नाम (प्रति)' : 'Beneficiary Name (To)'}
          </p>
          <p className='mt-1 text-lg font-bold text-[#072448]'>{settings.beneficiaryName}</p>
        </div>
      )}

      {bankFields.length > 0 && (
        <div className='mb-6 overflow-hidden rounded-xl border border-[var(--kdb-border)]'>
          <div className='border-b border-[var(--kdb-border)] bg-[#f8f5ee] px-5 py-3'>
            <p className='font-bold text-[#072448]'>{lang === 'hi' ? 'बैंक खाता विवरण' : 'Bank Account Details'}</p>
          </div>
          <dl className='divide-y divide-[var(--kdb-border)]'>
            {bankFields.map(field => (
              <div key={field.labelEn} className='flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between'>
                <dt className='text-sm font-semibold text-[var(--kdb-muted)]'>{lang === 'hi' ? field.labelHi : field.labelEn}</dt>
                <dd className='text-base font-bold text-[#072448]'>{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {instructionsLines && instructionsLines.length > 0 && (
        <div className='mb-6 rounded-xl border border-[var(--kdb-border)] bg-white p-5'>
          <p className='mb-3 font-bold text-[#072448]'>{lang === 'hi' ? 'महत्वपूर्ण निर्देश' : 'Important Instructions'}</p>
          <ul className='space-y-2'>
            {instructionsLines.map((line, idx) => (
              <li key={idx} className='flex items-baseline gap-2 text-sm text-[var(--kdb-text)]'>
                <span className='text-xs text-[var(--kdb-saffron)]'>●</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {noticeText && (
        <div className='mb-8 flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-5'>
          <AlertTriangleIcon className='size-5 shrink-0 text-amber-600' />
          <div>
            <p className='mb-1 font-bold text-amber-900'>
              {lang === 'hi' ? 'महत्वपूर्ण भुगतान सूचना' : 'Important Payment Notice'}
            </p>
            <p className='text-sm text-amber-900'>{noticeText}</p>
          </div>
        </div>
      )}

      {settings.googleFormUrl && (
        <a
          href={settings.googleFormUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='flex items-center justify-center gap-1.5 rounded-xl bg-[#092b52] px-5 py-3.5 text-center text-sm font-bold text-white shadow-2xs transition hover:bg-[#061e3a] active:scale-[0.98]'
        >
          <span>{lang === 'hi' ? 'भुगतान विवरण जमा करें' : 'Submit Payment Details'}</span>
          <span className='text-sm font-black'>→</span>
        </a>
      )}
    </div>
  )
}

export default AuctionPaymentView
