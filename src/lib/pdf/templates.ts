import { getDevanagariFontBase64, getDevanagariFontBoldBase64, getLogoBase64 } from '@/lib/pdf/assets'

// Defensive output-encoding for values interpolated into the generated HTML
// (applicant-entered data) — nothing here is ever executed as a page script
// the way a browser-rendered page would be, but escaping on the way into an
// HTML string is the correct default regardless of where that string ends up.
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const baseStyles = `
  @font-face {
    font-family: 'Noto Sans Devanagari';
    font-weight: normal;
    src: url(data:font/ttf;base64,${getDevanagariFontBase64()}) format('truetype');
  }
  @font-face {
    font-family: 'Noto Sans Devanagari';
    font-weight: bold;
    src: url(data:font/ttf;base64,${getDevanagariFontBoldBase64()}) format('truetype');
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Noto Sans Devanagari', sans-serif;
    font-size: 10pt;
    color: #000;
    background: #fff;
    margin: 0;
    padding: 24pt;
  }
  .letterhead {
    display: flex;
    align-items: center;
    gap: 12pt;
    border-bottom: 2pt solid #000;
    padding-bottom: 10pt;
    margin-bottom: 14pt;
  }
  .letterhead img { width: 40pt; height: 40pt; object-fit: contain; }
  .letterhead h1 { font-size: 13pt; margin: 0; }
  .letterhead p { font-size: 8pt; margin: 2pt 0 0; }
  .title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14pt; }
  .title-row h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 0.5pt; margin: 0; }
  .badge { font-size: 8pt; font-weight: bold; border: 1pt solid #000; border-radius: 10pt; padding: 3pt 8pt; }
  .grid { display: flex; flex-wrap: wrap; }
  .field { width: 50%; margin-bottom: 10pt; padding-right: 8pt; }
  .field.full { width: 100%; }
  .field dt { font-size: 7pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3pt; color: #333; margin: 0; }
  .field dd { font-size: 10pt; font-weight: bold; margin: 2pt 0 0; word-break: break-word; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1pt solid #000; padding-top: 8pt; margin-top: 16pt; font-size: 8pt; }
`

const letterhead = (lang: 'hi' | 'en') => `
  <div class="letterhead">
    <img src="data:image/png;base64,${getLogoBase64()}" alt="" />
    <div>
      <h1>${lang === 'hi' ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026' : 'International Geeta Jayanti Mahotsav 2026'}</h1>
      <p>${
        lang === 'hi'
          ? 'कुरुक्षेत्र विकास बोर्ड — बूथ/स्टॉल आवंटन पोर्टल'
          : 'Kurukshetra Development Board — Booth/Stall Allotment Portal'
      }</p>
    </div>
  </div>
`

const footer = (lang: 'hi' | 'en') => `
  <div class="footer">
    <span>${
      lang === 'hi'
        ? 'यह एक कंप्यूटर-जनित दस्तावेज़ है और इसके लिए हस्ताक्षर की आवश्यकता नहीं है।'
        : 'This is a computer-generated document and does not require a signature.'
    }</span>
    <span>${new Date().toLocaleDateString('en-IN')}</span>
  </div>
`

const field = (label: string, value: string, full?: boolean) => `
  <div class="field${full ? ' full' : ''}">
    <dt>${escapeHtml(label)}</dt>
    <dd>${escapeHtml(value)}</dd>
  </div>
`

const documentShell = (title: string, body: string) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>${baseStyles}</style>
  </head>
  <body>${body}</body>
</html>
`

export type ReceiptPdfData = {
  applicationNumber: string
  organisationName: string
  representativeName: string
  categoryName: string
  categoryNameHi: string | null
  amountPaise: number | null
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  paidAt: string | null
}

const formatRupees = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`

// Mirrors ReceiptPageView.tsx's on-screen layout field-for-field.
export function receiptHtml(data: ReceiptPdfData, lang: 'hi' | 'en'): string {
  const fields = [
    field(lang === 'hi' ? 'आवेदन क्रमांक' : 'Application Number', data.applicationNumber),
    field(lang === 'hi' ? 'श्रेणी' : 'Category', lang === 'hi' ? (data.categoryNameHi ?? data.categoryName) : data.categoryName),
    field(lang === 'hi' ? 'संगठन/व्यक्ति का नाम' : 'Organisation / Applicant Name', data.organisationName),
    field(lang === 'hi' ? 'प्रतिनिधि का नाम' : 'Representative Name', data.representativeName),
    data.amountPaise !== null ? field(lang === 'hi' ? 'भुगतान राशि' : 'Amount Paid', formatRupees(data.amountPaise)) : '',
    data.razorpayPaymentId ? field(lang === 'hi' ? 'भुगतान आईडी' : 'Payment ID', data.razorpayPaymentId) : '',
    data.razorpayOrderId ? field(lang === 'hi' ? 'ऑर्डर आईडी' : 'Order ID', data.razorpayOrderId) : '',
    data.paidAt
      ? field(lang === 'hi' ? 'भुगतान तिथि' : 'Payment Date', new Date(data.paidAt).toLocaleString('en-IN'))
      : ''
  ].join('')

  const body = `
    ${letterhead(lang)}
    <div class="title-row">
      <h2>${lang === 'hi' ? 'भुगतान रसीद' : 'Payment Receipt'}</h2>
      <span class="badge">${lang === 'hi' ? 'भुगतान सफल' : 'Payment Successful'}</span>
    </div>
    <div class="grid">${fields}</div>
    ${footer(lang)}
  `

  return documentShell(`Receipt-${data.applicationNumber}`, body)
}

export type ApplicationPdfFieldValue = { label: string; labelHi: string | null; value: string }

export type ApplicationPdfData = {
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
  fieldValues: ApplicationPdfFieldValue[]
}

// Same bilingual status vocabulary as print-application/index.tsx — kept as
// a local copy rather than a shared import for the same reason that file
// gives: each status-label list isn't guaranteed to stay in lockstep.
const STATUS_LABEL: Record<string, { en: string; hi: string }> = {
  draft: { en: 'Draft', hi: 'ड्राफ्ट' },
  payment_pending: { en: 'Payment Pending', hi: 'भुगतान लंबित' },
  payment_failed: { en: 'Payment Failed', hi: 'भुगतान विफल' },
  payment_success: { en: 'Payment Received', hi: 'भुगतान प्राप्त' },
  under_review: { en: 'Under Review', hi: 'समीक्षाधीन' },
  query_raised: { en: 'Query Raised', hi: 'स्पष्टीकरण आवश्यक' },
  rejected: { en: 'Rejected', hi: 'अस्वीकृत' },
  selected: { en: 'Selected', hi: 'चयनित' },
  not_selected: { en: 'Not Selected', hi: 'चयनित नहीं' },
  payment_required: { en: 'Payment Required', hi: 'भुगतान आवश्यक' },
  allotted: { en: 'Allotted', hi: 'आवंटित' },
  cancelled: { en: 'Cancelled', hi: 'रद्द' },
  re_allotted: { en: 'Re-Allotted', hi: 'पुनः आवंटित' }
}

// Mirrors print-application/index.tsx's result-phase layout field-for-field.
export function applicationHtml(data: ApplicationPdfData, lang: 'hi' | 'en'): string {
  const fields = [
    field(lang === 'hi' ? 'आवेदन क्रमांक' : 'Application Number', data.applicationNumber),
    field(lang === 'hi' ? 'श्रेणी' : 'Category', lang === 'hi' ? (data.categoryNameHi ?? data.categoryName) : data.categoryName),
    field(lang === 'hi' ? 'संगठन/व्यक्ति का नाम' : 'Organisation / Applicant Name', data.organisationName),
    field(lang === 'hi' ? 'प्रतिनिधि का नाम' : 'Representative Name', data.representativeName),
    field(lang === 'hi' ? 'पिता का नाम' : "Father's Name", data.fatherName),
    field(lang === 'hi' ? 'आधार संख्या' : 'Aadhaar Number', data.aadhaarNumber),
    field(lang === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number', data.mobileNumber),
    data.alternateMobile ? field(lang === 'hi' ? 'वैकल्पिक मोबाइल' : 'Alternate Mobile', data.alternateMobile) : '',
    field(lang === 'hi' ? 'ईमेल' : 'Email', data.email),
    field(lang === 'hi' ? 'पता' : 'Address', data.address, true),
    field(lang === 'hi' ? 'राज्य' : 'State', data.state),
    field(lang === 'hi' ? 'ज़िला' : 'District', data.district),
    field(lang === 'hi' ? 'पिन कोड' : 'PIN Code', data.pinCode),
    data.shopOptionLabel ? field(lang === 'hi' ? 'बूथ/स्टॉल विकल्प' : 'Booth/Stall Option', data.shopOptionLabel) : '',
    data.feePaise !== null ? field(lang === 'hi' ? 'आवेदन शुल्क' : 'Application Fee', formatRupees(data.feePaise)) : '',
    field(lang === 'hi' ? 'कार्य का उद्देश्य' : 'Purpose of Work', data.workPurpose, true),
    field(lang === 'hi' ? 'उपलब्धि/अनुभव' : 'Achievement / Experience', data.achievementExperience, true),
    data.remarks ? field(lang === 'hi' ? 'टिप्पणी' : 'Remarks', data.remarks, true) : '',
    ...data.fieldValues.map(fv => field(lang === 'hi' ? (fv.labelHi ?? fv.label) : fv.label, fv.value)),
    data.submittedAt
      ? field(lang === 'hi' ? 'प्रस्तुत तिथि' : 'Submitted On', new Date(data.submittedAt).toLocaleString('en-IN'))
      : ''
  ].join('')

  const statusLabel = lang === 'hi' ? (STATUS_LABEL[data.status]?.hi ?? data.status) : (STATUS_LABEL[data.status]?.en ?? data.status)

  const body = `
    ${letterhead(lang)}
    <div class="title-row">
      <h2>${lang === 'hi' ? 'आवेदन सारांश' : 'Application Summary'}</h2>
      <span class="badge">${escapeHtml(statusLabel)}</span>
    </div>
    <div class="grid">${fields}</div>
    ${footer(lang)}
  `

  return documentShell(`Application-${data.applicationNumber}`, body)
}
