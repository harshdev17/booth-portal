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
          ? 'कुरुक्षेत्र विकास बोर्ड — बूथ/स्टॉल आबंटन पोर्टल'
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

// Shared across all three document types (receipt, application summary,
// allotment letter) so every official PDF carries the same faint KDB logo
// watermark, rather than only the allotment letter having one.
const watermark = `
  <div style="position: fixed; top: 48%; left: 50%; transform: translate(-50%, -50%); width: 280pt; height: 280pt; opacity: 0.08; pointer-events: none; z-index: 0;">
    <img src="data:image/png;base64,${getLogoBase64()}" style="width: 100%; height: 100%; object-fit: contain;" alt="" />
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
  <body>
    ${watermark}
    <div style="position: relative; z-index: 1;">${body}</div>
  </body>
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
    data.organisationName ? field(lang === 'hi' ? 'संस्था / फर्म का नाम' : 'Organisation / Firm Name', data.organisationName) : '',
    field(lang === 'hi' ? 'आवेदक का नाम' : 'Applicant Name', data.representativeName),
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
  policeStationName: string
  policeStationAddress: string
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
  allotted: { en: 'Allotted', hi: 'आबंटित' },
  cancelled: { en: 'Cancelled', hi: 'रद्द' },
  re_allotted: { en: 'Re-Allotted', hi: 'पुनः आबंटित' }
}

// Mirrors print-application/index.tsx's result-phase layout field-for-field.
export function applicationHtml(data: ApplicationPdfData, lang: 'hi' | 'en'): string {
  const fields = [
    field(lang === 'hi' ? 'आवेदन क्रमांक' : 'Application Number', data.applicationNumber),
    field(lang === 'hi' ? 'श्रेणी' : 'Category', lang === 'hi' ? (data.categoryNameHi ?? data.categoryName) : data.categoryName),
    data.organisationName ? field(lang === 'hi' ? 'संस्था / फर्म का नाम' : 'Organisation / Firm Name', data.organisationName) : '',
    field(lang === 'hi' ? 'आवेदक का नाम' : 'Applicant Name', data.representativeName),
    field(lang === 'hi' ? 'पिता का नाम' : "Father's Name", data.fatherName),
    field(lang === 'hi' ? 'आधार संख्या' : 'Aadhaar Number', data.aadhaarNumber),
    field(lang === 'hi' ? 'व्हाट्सएप नंबर' : 'WhatsApp Number', data.mobileNumber),
    data.alternateMobile ? field(lang === 'hi' ? 'वैकल्पिक मोबाइल' : 'Alternate Mobile', data.alternateMobile) : '',
    field(lang === 'hi' ? 'ईमेल' : 'Email', data.email),
    field(lang === 'hi' ? 'पता' : 'Address', data.address, true),
    field(lang === 'hi' ? 'राज्य' : 'State', data.state),
    field(lang === 'hi' ? 'ज़िला' : 'District', data.district),
    field(lang === 'hi' ? 'पिन कोड' : 'PIN Code', data.pinCode),
    field(lang === 'hi' ? 'थाने का नाम' : 'Police Station Name', data.policeStationName),
    field(lang === 'hi' ? 'थाने का पता' : 'Police Station Address', data.policeStationAddress, true),
    data.shopOptionLabel ? field(lang === 'hi' ? 'बूथ/स्टॉल विकल्प' : 'Booth/Stall Option', data.shopOptionLabel) : '',
    data.feePaise !== null ? field(lang === 'hi' ? 'आवेदन शुल्क' : 'Application Fee', formatRupees(data.feePaise)) : '',
    data.workPurpose ? field(lang === 'hi' ? 'कार्य का उद्देश्य' : 'Purpose of Work', data.workPurpose, true) : '',
    data.achievementExperience
      ? field(lang === 'hi' ? 'उपलब्धि/अनुभव' : 'Achievement / Experience', data.achievementExperience, true)
      : '',
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

export type AllotmentLetterPdfData = {
  applicationNumber: string
  representativeName: string
  fatherName?: string | null
  organisationName?: string | null
  categoryName: string
  categoryNameHi?: string | null
  stallNumber: string
  stallDirection?: string | null
  mobileNumber?: string | null
  email?: string | null
  address?: string | null
  allotmentAmountPaise?: number | null
  allotmentPaidAt?: string | null
  submittedAt?: string | null
}

export function allotmentLetterHtml(data: AllotmentLetterPdfData, lang: 'hi' | 'en' = 'en'): string {
  const isHi = lang === 'hi'
  const isPaid = (data.allotmentAmountPaise ?? 0) > 0
  const feeLabel = isPaid
    ? formatRupees(data.allotmentAmountPaise!)
    : isHi
      ? 'निःशुल्क (Exempt / Free)'
      : 'Exempt / Free'

  const fields = [
    field(isHi ? 'संदर्भ संख्या' : 'Reference Number', `KDB/IGM-2026/ALLOT/${data.applicationNumber}`),
    field(isHi ? 'आवंटन तिथि' : 'Allotment Date', new Date().toLocaleDateString('en-IN')),
    field(isHi ? 'आवेदन क्रमांक' : 'Application Number', data.applicationNumber),
    field(isHi ? 'आवंटित स्टॉल क्रमांक' : 'Allotted Booth / Stall No.', data.stallNumber),
    data.stallDirection ? field(isHi ? 'स्टॉल स्थान / दिशा' : 'Stall Location / Direction', data.stallDirection) : '',
    field(isHi ? 'श्रेणी' : 'Category', isHi ? (data.categoryNameHi ?? data.categoryName) : data.categoryName),
    data.organisationName ? field(isHi ? 'संस्था / फर्म का नाम' : 'Organisation / Firm Name', data.organisationName) : '',
    field(isHi ? 'आवंटी का नाम' : 'Allottee Name', data.representativeName),
    data.fatherName ? field(isHi ? 'पिता / पति का नाम' : "Father's / Husband's Name", data.fatherName) : '',
    data.mobileNumber ? field(isHi ? 'मोबाइल नंबर' : 'Mobile Number', data.mobileNumber) : '',
    data.email ? field(isHi ? 'ईमेल' : 'Email Address', data.email) : '',
    data.address ? field(isHi ? 'पूरा पता' : 'Postal Address', data.address, true) : '',
    field(isHi ? 'स्टॉल आवंटन शुल्क' : 'Stall Allotment Fee', feeLabel),
    data.allotmentPaidAt ? field(isHi ? 'भुगतान तिथि' : 'Paid At', new Date(data.allotmentPaidAt).toLocaleString('en-IN')) : ''
  ].join('')

  const body = `
    ${letterhead(lang)}
    <div class="title-row" style="margin-bottom: 10pt; border-bottom: 1.5pt solid #000; padding-bottom: 6pt;">
      <div>
        <h2 style="font-size: 13pt; margin: 0; color: #000; font-weight: 800;">
          ${isHi ? 'आधिकारिक बूथ / स्टॉल आवंटन पत्र' : 'OFFICIAL BOOTH / STALL ALLOTMENT ORDER'}
        </h2>
        <p style="font-size: 8pt; margin: 2pt 0 0; color: #444;">
          ${isHi ? 'अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 — कुरुक्षेत्र विकास बोर्ड' : 'International Geeta Jayanti Mahotsav 2026 — Kurukshetra Development Board'}
        </p>
      </div>
      <span class="badge" style="font-size: 10pt; font-weight: 800; border: 2pt solid #000; padding: 4pt 10pt; background: rgba(250, 250, 250, 0.85);">
        STALL: ${escapeHtml(data.stallNumber)}
      </span>
    </div>

    <div class="grid" style="margin-top: 8pt;">${fields}</div>

    <div style="margin-top: 14pt; border: 1pt solid #000; padding: 8pt 10pt; font-size: 8pt; background-color: rgba(250, 250, 250, 0.85); border-radius: 4pt;">
      <p style="margin: 0 0 4pt; font-weight: bold; text-transform: uppercase;">
        ${isHi ? 'महत्वपूर्ण निर्देश एवं शर्तें:' : 'Important Terms & Instructions:'}
      </p>
      <ol style="margin: 0; padding-left: 14pt; line-height: 1.4;">
        <li>${isHi ? 'यह आवंटन पत्र अंतर्राष्ट्रीय गीता जयंती महोत्सव 2026 के लिए आधिकारिक है।' : 'This allotment order is valid exclusively for the official duration of International Geeta Jayanti Mahotsav 2026.'}</li>
        <li>${isHi ? 'आवंटी को केवल आवंटित स्थान व उद्देश्य के लिए ही स्टॉल का उपयोग करने की अनुमति है।' : 'The allottee must occupy only the allocated booth/stall and conduct only approved activities.'}</li>
        <li>${isHi ? 'स्टॉल परिसर में स्वच्छता, अग्नि सुरक्षा एवं केडीबी के नियमों का पूर्ण पालन अनिवार्य है।' : 'Compliance with fire safety regulations, waste management, and KDB fair bylaws is mandatory.'}</li>
        <li>${isHi ? 'यह पत्र प्रवेश एवं स्टॉल आधिपत्य लेते समय प्रस्तुत करना आवश्यक है।' : 'Please carry this original allotment letter along with a valid Government Photo ID at the time of taking stall possession.'}</li>
      </ol>
    </div>

    <div style="margin-top: 24pt; padding-top: 8pt; font-size: 8pt; color: #555;">
      <p style="margin: 0;">Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
    </div>
  `

  return documentShell(`Allotment-${data.applicationNumber}`, body)
}
