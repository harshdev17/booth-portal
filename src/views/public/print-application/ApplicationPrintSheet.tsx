import Image from 'next/image'

type FieldValue = { label: string; labelHi: string | null; value: string }

export type PrintResult = {
  applicationNumber: string
  status: string
  categoryName: string
  categoryNameHi: string | null
  shopOptionLabel: string | null
  feePaise: number | null
  submittedAt: string | null
  organisationName: string
  representativeName: string
  fatherName: string
  aadhaarNumber: string
  email: string
  mobileNumber: string
  alternateMobile: string | null
  address: string
  state: string
  district: string
  pinCode: string
  workPurpose: string
  achievementExperience: string
  remarks: string | null
  fieldValues: FieldValue[]
}

// Same bilingual status vocabulary as the Check Application Status page.
export const STATUS_LABEL: Record<string, { en: string; hi: string }> = {
  draft: { en: 'Draft', hi: 'ड्राफ्ट' },
  payment_pending: { en: 'Payment Pending', hi: 'भुगतान लंबित' },
  payment_failed: { en: 'Payment Failed', hi: 'भुगतान विफल' },
  payment_success: { en: 'Payment Received', hi: 'भुगतान प्राप्त' },
  under_review: { en: 'Under Review', hi: 'समीक्षाधीन' },
  rejected: { en: 'Rejected', hi: 'अस्वीकृत' },
  selected: { en: 'Selected', hi: 'चयनित' },
  not_selected: { en: 'Not Selected', hi: 'चयनित नहीं' },
  payment_required: { en: 'Payment Required', hi: 'भुगतान आवश्यक' },
  allotted: { en: 'Allotted', hi: 'आवंटित' },
  cancelled: { en: 'Cancelled', hi: 'रद्द' },
  re_allotted: { en: 'Re-Allotted', hi: 'पुनः आवंटित' }
}

export const formatRupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`

/**
 * The actual printed application summary — shared between the OTP-gated
 * /print-application lookup tool and the no-OTP in-session print flow
 * reached from the Success page, so both produce an identical printout.
 * kdb-print-sheet colors are fixed black-on-white (see ReceiptPageView for
 * why) rather than the site's --kdb-* theme variables.
 */
const ApplicationPrintSheet = ({ result, lang }: { result: PrintResult; lang: 'en' | 'hi' }) => (
  <div className='kdb-print-sheet mx-auto w-full max-w-3xl border border-[var(--kdb-border)] bg-white p-8 shadow-sm print:border-0 print:p-0 print:shadow-none'>
    <div className='mb-6 flex items-center gap-4 border-b-2 border-black pb-4 print:border-b-2 print:border-black'>
      <div className='relative size-14 shrink-0'>
        <Image src='/images/public/logo.webp' alt='' fill className='object-contain' />
      </div>
      <div>
        <h2 className='text-lg font-extrabold text-black'>
          {lang === 'hi' ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026' : 'International Geeta Jayanti Mahotsav 2026'}
        </h2>
        <p className='text-xs text-black'>
          {lang === 'hi'
            ? 'कुरुक्षेत्र विकास बोर्ड — बूथ/स्टॉल आवंटन पोर्टल'
            : 'Kurukshetra Development Board — Booth/Stall Allotment Portal'}
        </p>
      </div>
    </div>

    <div className='mb-6 flex items-center justify-between'>
      <h3 className='text-base font-extrabold tracking-wide text-black uppercase'>
        {lang === 'hi' ? 'आवेदन सारांश' : 'Application Summary'}
      </h3>
      <span className='rounded-full border border-black px-3 py-1 text-xs font-bold text-black'>
        {lang === 'hi' ? (STATUS_LABEL[result.status]?.hi ?? result.status) : (STATUS_LABEL[result.status]?.en ?? result.status)}
      </span>
    </div>

    <dl className='grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2'>
      <SummaryRow label={lang === 'hi' ? 'आवेदन क्रमांक' : 'Application Number'} value={result.applicationNumber} />
      <SummaryRow
        label={lang === 'hi' ? 'श्रेणी' : 'Category'}
        value={lang === 'hi' ? (result.categoryNameHi ?? result.categoryName) : result.categoryName}
      />
      <SummaryRow label={lang === 'hi' ? 'संगठन/व्यक्ति का नाम' : 'Organisation / Applicant Name'} value={result.organisationName} />
      <SummaryRow label={lang === 'hi' ? 'प्रतिनिधि का नाम' : 'Representative Name'} value={result.representativeName} />
      <SummaryRow label={lang === 'hi' ? 'पिता का नाम' : "Father's Name"} value={result.fatherName} />
      <SummaryRow label={lang === 'hi' ? 'आधार संख्या' : 'Aadhaar Number'} value={result.aadhaarNumber} />
      <SummaryRow label={lang === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number'} value={result.mobileNumber} />
      {result.alternateMobile && (
        <SummaryRow label={lang === 'hi' ? 'वैकल्पिक मोबाइल' : 'Alternate Mobile'} value={result.alternateMobile} />
      )}
      <SummaryRow label={lang === 'hi' ? 'ईमेल' : 'Email'} value={result.email} />
      <SummaryRow label={lang === 'hi' ? 'पता' : 'Address'} value={result.address} span />
      <SummaryRow label={lang === 'hi' ? 'राज्य' : 'State'} value={result.state} />
      <SummaryRow label={lang === 'hi' ? 'ज़िला' : 'District'} value={result.district} />
      <SummaryRow label={lang === 'hi' ? 'पिन कोड' : 'PIN Code'} value={result.pinCode} />
      {result.shopOptionLabel && (
        <SummaryRow label={lang === 'hi' ? 'बूथ/स्टॉल विकल्प' : 'Booth/Stall Option'} value={result.shopOptionLabel} />
      )}
      {result.feePaise !== null && (
        <SummaryRow label={lang === 'hi' ? 'आवेदन शुल्क' : 'Application Fee'} value={formatRupees(result.feePaise)} />
      )}
      <SummaryRow label={lang === 'hi' ? 'कार्य का उद्देश्य' : 'Purpose of Work'} value={result.workPurpose} span />
      <SummaryRow
        label={lang === 'hi' ? 'उपलब्धि/अनुभव' : 'Achievement / Experience'}
        value={result.achievementExperience}
        span
      />
      {result.remarks && <SummaryRow label={lang === 'hi' ? 'टिप्पणी' : 'Remarks'} value={result.remarks} span />}
      {result.fieldValues.map(fv => (
        <SummaryRow key={fv.label} label={lang === 'hi' ? (fv.labelHi ?? fv.label) : fv.label} value={fv.value} />
      ))}
      {result.submittedAt && (
        <SummaryRow
          label={lang === 'hi' ? 'प्रस्तुत तिथि' : 'Submitted On'}
          value={new Date(result.submittedAt).toLocaleString('en-IN')}
        />
      )}
    </dl>

    <div className='mt-10 flex items-end justify-between border-t border-black pt-4 text-xs text-black'>
      <p>
        {lang === 'hi'
          ? 'यह एक कंप्यूटर-जनित दस्तावेज़ है और इसके लिए हस्ताक्षर की आवश्यकता नहीं है।'
          : 'This is a computer-generated document and does not require a signature.'}
      </p>
      <p>{new Date().toLocaleDateString('en-IN')}</p>
    </div>
  </div>
)

const SummaryRow = ({ label, value, span }: { label: string; value: string; span?: boolean }) => (
  <div className={span ? 'sm:col-span-2' : undefined}>
    <dt className='text-xs font-bold tracking-wide text-[var(--kdb-muted)] uppercase print:text-black'>{label}</dt>
    <dd className='font-semibold text-[var(--kdb-primary)] break-words print:text-black'>{value}</dd>
  </div>
)

export default ApplicationPrintSheet
