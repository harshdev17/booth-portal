import 'server-only'

import { Document, Image, Link, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer'

import {
  getArrangementContactHeadingHiBase64,
  getCompanionDetailsQrBase64,
  getElectricalArrangementsHiBase64,
  getImportantNoticeHeadingHiBase64,
  getImportantNoticeParagraphHiBase64,
  getLogoBase64,
  getTentArrangementsHiBase64
} from '@/lib/pdf/assets'

// English-only PDF generation via @react-pdf/renderer, a pure-JS layout
// engine that needs no browser process — unlike the earlier Playwright/
// headless-Chromium path (src/lib/pdf/browser.ts), this works on Hostinger
// shared hosting, which cannot spawn Chromium at all. The one real
// trade-off: @react-pdf/renderer does not shape Indic scripts correctly
// (confirmed live — Devanagari text was truncated mid-word), so these
// templates are English-only; that's an acceptable loss since
// allotmentLetterHtml()/receiptHtml()/applicationHtml() (src/lib/pdf/templates.ts)
// already default every official PDF to English (see .ai/CHANGELOG.md, the
// admin/applicant PDF unification entries).
const formatRupees = (paise: number) => `Rs. ${(paise / 100).toLocaleString('en-IN')}`

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, color: '#000', fontFamily: 'Helvetica' },
  watermark: {
    position: 'absolute',
    top: '38%',
    left: '30%',
    width: 240,
    height: 240,
    opacity: 0.08
  },
  letterhead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#000',
    paddingBottom: 10,
    marginBottom: 14
  },
  logo: { width: 36, height: 36 },
  letterheadTitle: { fontSize: 13, fontWeight: 700 },
  letterheadSubtitle: { fontSize: 8, marginTop: 2, color: '#444' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  titleHeading: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 },
  badge: { fontSize: 8, fontWeight: 700, borderWidth: 1, borderColor: '#000', borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  field: { width: '50%', marginBottom: 10, paddingRight: 8 },
  fieldFull: { width: '100%', marginBottom: 10, paddingRight: 8 },
  fieldLabel: { fontSize: 7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3, color: '#333' },
  fieldValue: { fontSize: 10, fontWeight: 700, marginTop: 2 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#000',
    paddingTop: 8,
    marginTop: 16,
    fontSize: 8
  },
  noteBox: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
    fontSize: 8,
    borderRadius: 4
  },
  noteBoxTitle: { fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 },
  noteBoxItem: { marginBottom: 2, lineHeight: 1.4 },
  paymentBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 2
  },
  paymentBoxTitle: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#888',
    paddingBottom: 4,
    marginBottom: 8
  },
  subjectLine: { fontSize: 11, fontWeight: 700, textDecoration: 'underline', marginBottom: 10 },
  congratsBanner: {
    backgroundColor: '#f0f7f2',
    borderWidth: 1,
    borderColor: '#1a7d42',
    borderRadius: 4,
    padding: 8,
    marginBottom: 10
  },
  congratsText: { fontSize: 11, fontWeight: 700, color: '#1a7d42' },
  bodyParagraph: { fontSize: 9.5, lineHeight: 1.5, marginBottom: 10 },
  dataTable: { borderWidth: 1, borderColor: '#000', marginBottom: 14 },
  dataTableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#000' },
  dataTableRowLast: { flexDirection: 'row' },
  dataTableLabelCell: {
    width: '45%',
    padding: 6,
    borderRightWidth: 1,
    borderRightColor: '#000',
    backgroundColor: '#f5f3ee'
  },
  dataTableValueCell: { width: '55%', padding: 6 },
  dataTableLabel: { fontSize: 8.5, fontWeight: 700 },
  dataTableValue: { fontSize: 9.5, fontWeight: 700 },
  bulletList: { marginBottom: 10 },
  bulletItem: { flexDirection: 'row', marginBottom: 4, paddingRight: 4 },
  bulletMarker: { fontSize: 9.5, width: 12 },
  bulletText: { fontSize: 9.5, lineHeight: 1.4, flex: 1 }
})

const Watermark = () => <Image src={`data:image/png;base64,${getLogoBase64()}`} style={styles.watermark} fixed />

const Letterhead = () => (
  <View style={styles.letterhead}>
    <Image src={`data:image/png;base64,${getLogoBase64()}`} style={styles.logo} />
    <View>
      <Text style={styles.letterheadTitle}>International Geeta Jayanti Mahotsav 2026</Text>
      <Text style={styles.letterheadSubtitle}>Kurukshetra Development Board — Booth/Stall Allotment Portal</Text>
    </View>
  </View>
)

const Footer = () => (
  <View style={styles.footer}>
    <Text>This is a computer-generated document and does not require a signature.</Text>
    <Text>{new Date().toLocaleDateString('en-IN')}</Text>
  </View>
)

const Field = ({ label, value, full }: { label: string; value: string; full?: boolean }) => (
  <View style={full ? styles.fieldFull : styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value}</Text>
  </View>
)

export type ReceiptPdfData = {
  applicationNumber: string
  organisationName: string
  representativeName: string
  categoryName: string
  amountPaise: number | null
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  paidAt: string | null
}

export async function renderReceiptPdf(data: ReceiptPdfData): Promise<Buffer> {
  return renderToBuffer(
    <Document title={`Receipt-${data.applicationNumber}`}>
      <Page size='A4' style={styles.page}>
        <Watermark />
        <Letterhead />
        <View style={styles.titleRow}>
          <Text style={styles.titleHeading}>Payment Receipt</Text>
          <Text style={styles.badge}>Payment Successful</Text>
        </View>
        <View style={styles.grid}>
          <Field label='Application Number' value={data.applicationNumber} />
          <Field label='Category' value={data.categoryName} />
          {data.organisationName && <Field label='Organisation / Firm Name' value={data.organisationName} />}
          <Field label='Applicant Name' value={data.representativeName} />
          {data.amountPaise !== null && <Field label='Amount Paid' value={formatRupees(data.amountPaise)} />}
          {data.razorpayPaymentId && <Field label='Payment ID' value={data.razorpayPaymentId} />}
          {data.razorpayOrderId && <Field label='Order ID' value={data.razorpayOrderId} />}
          {data.paidAt && <Field label='Payment Date' value={new Date(data.paidAt).toLocaleString('en-IN')} />}
        </View>
        <Footer />
      </Page>
    </Document>
  )
}

export type ApplicationPdfFieldValue = { label: string; value: string }

export type ApplicationPdfData = {
  applicationNumber: string
  status: string
  categoryName: string
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
  registrationPaymentStatus?: string | null
  registrationAmountPaise?: number | null
  registrationPaymentId?: string | null
  registrationPaidAt?: string | null
  allotmentPaymentStatus?: string | null
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  payment_pending: 'Payment Pending',
  payment_failed: 'Payment Failed',
  payment_success: 'Payment Received',
  under_review: 'Under Review',
  query_raised: 'Query Raised',
  rejected: 'Rejected',
  selected: 'Selected',
  not_selected: 'Not Selected',
  payment_required: 'Payment Required',
  allotted: 'Allotted',
  cancelled: 'Cancelled',
  re_allotted: 'Re-Allotted'
}

export async function renderApplicationPdf(data: ApplicationPdfData): Promise<Buffer> {
  const statusLabel = STATUS_LABEL[data.status] ?? data.status

  return renderToBuffer(
    <Document title={`Application-${data.applicationNumber}`}>
      <Page size='A4' style={styles.page}>
        <Watermark />
        <Letterhead />
        <View style={styles.titleRow}>
          <Text style={styles.titleHeading}>Application Summary</Text>
          <Text style={styles.badge}>{statusLabel}</Text>
        </View>
        <View style={styles.grid}>
          <Field label='Application Number' value={data.applicationNumber} />
          <Field label='Category' value={data.categoryName} />
          {data.organisationName && <Field label='Organisation / Firm Name' value={data.organisationName} />}
          <Field label='Applicant Name' value={data.representativeName} />
          <Field label="Father's Name" value={data.fatherName} />
          <Field label='Aadhaar Number' value={data.aadhaarNumber} />
          <Field label='WhatsApp Number' value={data.mobileNumber} />
          {data.alternateMobile && <Field label='Alternate Mobile' value={data.alternateMobile} />}
          <Field label='Email' value={data.email} />
          <Field label='Address' value={data.address} full />
          <Field label='State' value={data.state} />
          <Field label='District' value={data.district} />
          <Field label='PIN Code' value={data.pinCode} />
          <Field label='Police Station Name' value={data.policeStationName} />
          <Field label='Police Station Address' value={data.policeStationAddress} full />
          {data.shopOptionLabel && <Field label='Booth/Stall Option' value={data.shopOptionLabel} />}
          {data.workPurpose && <Field label='Purpose of Work' value={data.workPurpose} full />}
          {data.achievementExperience && (
            <Field label='Achievement / Experience' value={data.achievementExperience} full />
          )}
          {data.remarks && <Field label='Remarks' value={data.remarks} full />}
          {data.fieldValues.map((fv, i) => (
            <Field key={i} label={fv.label} value={fv.value} />
          ))}
          {data.submittedAt && (
            <Field label='Submitted On' value={new Date(data.submittedAt).toLocaleString('en-IN')} />
          )}
        </View>
        <View style={styles.paymentBox}>
          <Text style={styles.paymentBoxTitle}>Payment Details</Text>
          <View style={styles.grid}>
            {data.feePaise !== null && <Field label='Application Fee' value={formatRupees(data.feePaise)} />}
            {data.registrationPaymentStatus === 'success' ? (
              <>
                <Field label='Payment Status' value='Payment Received (Success)' />
                {data.registrationPaymentId && <Field label='Payment ID / Ref' value={data.registrationPaymentId} />}
                {data.registrationPaidAt && (
                  <Field label='Payment Date & Time' value={new Date(data.registrationPaidAt).toLocaleString('en-IN')} />
                )}
              </>
            ) : data.registrationPaymentStatus === 'pending' ? (
              <Field label='Payment Status' value='Payment Pending / Awaited' />
            ) : data.registrationPaymentStatus === 'failed' ? (
              <Field label='Payment Status' value='Payment Failed' />
            ) : data.feePaise && data.feePaise > 0 ? (
              <Field label='Payment Status' value='Payment Pending / Not Completed' />
            ) : (
              <Field label='Payment Status' value='Exempted / Free' />
            )}
          </View>
        </View>
        <Footer />
      </Page>
    </Document>
  )
}

export type AllotmentLetterPdfData = {
  applicationNumber: string
  representativeName: string
  fatherName?: string | null
  organisationName?: string | null
  categoryName: string
  workPurpose?: string | null
  stallNumber: string
  stallDirection?: string | null
  mobileNumber?: string | null
  email?: string | null
  address?: string | null
  aadhaarNumber?: string | null
  allotmentAmountPaise?: number | null
  allotmentPaidAt?: string | null
  allotmentPaymentId?: string | null
}

const DataTableRow = ({ label, value, last }: { label: string; value: string; last?: boolean }) => (
  <View style={last ? styles.dataTableRowLast : styles.dataTableRow}>
    <View style={styles.dataTableLabelCell}>
      <Text style={styles.dataTableLabel}>{label}</Text>
    </View>
    <View style={styles.dataTableValueCell}>
      <Text style={styles.dataTableValue}>{value}</Text>
    </View>
  </View>
)

const INSTRUCTIONS = [
  'Please carry a printed copy of this letter during the event setup.',
  'Ensure all necessary original documents (Aadhaar Card and Category Specific Document i.e. Artisan Card / National Awardee Certificate / SHG Certificate / NGO Registration) are available for verification.',
  'Follow all guidelines provided by KDB Kurukshetra.',
  'Setup and teardown must be completed as per the schedule.',
  'You are allowed only to execute the work allotted to you. Otherwise, your allotment shall be cancelled without any notice and the paid amount shall not be refunded.'
]

/**
 * Format mirrors the official Allotment Letter template supplied 2026-11-28
 * (Allotment_Letter-1.docx) as closely as @react-pdf/renderer allows. The
 * companion/staff-detail notice (omitted in the previous version, which had
 * no real destination) now links to the organiser's actual Google Form —
 * both the QR image and the form URL come straight from that docx. All
 * Hindi text (headings + the notice paragraph) is a pre-rendered image, not
 * <Text> — see the comment above getPdfLabelBase64 in lib/pdf/assets.ts for
 * why (@react-pdf/renderer has no Indic-script shaping engine).
 */
export async function renderAllotmentLetterPdf(data: AllotmentLetterPdfData): Promise<Buffer> {
  const isPaid = (data.allotmentAmountPaise ?? 0) > 0
  const feeLabel = isPaid ? formatRupees(data.allotmentAmountPaise!) : 'Exempt / Free'

  return renderToBuffer(
    <Document title={`Allotment-${data.applicationNumber}`}>
      <Page size='A4' style={styles.page}>
        <Watermark />
        <Letterhead />

        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 9.5, fontWeight: 700 }}>To,</Text>
          <Text style={{ fontSize: 10, fontWeight: 700, marginTop: 2 }}>{data.representativeName}</Text>
          {data.mobileNumber && <Text style={{ fontSize: 9 }}>WhatsApp Mobile Number: {data.mobileNumber}</Text>}
        </View>

        <Text style={styles.subjectLine}>
          Subject: Allotment of Booth/Stall during International Geeta Jayanti Mahotsav 2026
        </Text>

        <View style={styles.congratsBanner}>
          <Text style={styles.congratsText}>Congratulations! You have been successfully allocated a booth/shop.</Text>
        </View>

        <Text style={styles.bodyParagraph}>
          We are pleased to inform you that based on your application, you have been allocated a booth/stall for the
          International Geeta Jayanti Mahotsav 2026.
        </Text>

        <View style={styles.dataTable}>
          <DataTableRow label='Registration Number (IGM-2026)' value={data.applicationNumber} />
          {data.organisationName && <DataTableRow label='Organisation / Firm Name' value={data.organisationName} />}
          <DataTableRow label='Applicant Name' value={data.representativeName} />
          <DataTableRow label="Father's Name" value={data.fatherName || '—'} />
          <DataTableRow label='Category' value={data.categoryName} />
          <DataTableRow label='Work Category' value={data.workPurpose || '—'} />
          <DataTableRow label='Allocated Booth/Stall Number' value={data.stallNumber} />
          <DataTableRow label='WhatsApp Mobile Number' value={data.mobileNumber || '—'} />
          <DataTableRow label='Aadhaar Number' value={data.aadhaarNumber ?? '—'} last />
        </View>

        <View style={styles.dataTable}>
          <DataTableRow label='Stall Allotment Fee' value={feeLabel} last={!data.allotmentPaidAt && !data.allotmentPaymentId} />
          {data.allotmentPaidAt && (
            <DataTableRow
              label='Paid At'
              value={new Date(data.allotmentPaidAt).toLocaleString('en-IN')}
              last={!data.allotmentPaymentId}
            />
          )}
          {data.allotmentPaymentId && <DataTableRow label='Payment ID' value={data.allotmentPaymentId} last />}
        </View>

        <Text style={{ fontSize: 10, fontWeight: 700, marginBottom: 6 }}>Important Instructions:</Text>
        <View style={styles.bulletList}>
          {INSTRUCTIONS.map((item, i) => (
            <View key={i} style={styles.bulletItem}>
              <Text style={styles.bulletMarker}>•</Text>
              <Text style={styles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* wrap={false} on both blocks (2026-11-28 fix): @react-pdf/renderer
            splits a View across a page boundary by default, which was
            cutting the Important Notice box and/or the Arrangement Contact
            block in half between pages instead of moving the whole thing to
            the next page together. */}
        <View wrap={false} style={{ marginTop: 4, marginBottom: 10, borderWidth: 1, borderColor: '#000', borderRadius: 4, padding: 8 }}>
          <Image
            src={`data:image/png;base64,${getImportantNoticeHeadingHiBase64()}`}
            style={{ height: 11, width: (128.77 / 28) * 11, marginBottom: 2 }}
          />
          <Text style={{ fontSize: 9.5, fontWeight: 700, marginBottom: 6 }}>/ Important Notice:</Text>
          <Image
            src={`data:image/png;base64,${getImportantNoticeParagraphHiBase64()}`}
            style={{ height: 42.75, width: 500, marginBottom: 8 }}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
            <Image src={`data:image/png;base64,${getCompanionDetailsQrBase64()}`} style={{ height: 75, width: 75 }} />
          </View>
          <Link src='https://forms.gle/CagqfddzNtx1nK126' style={{ fontSize: 9, marginTop: 4, textAlign: 'center' }}>
            https://forms.gle/CagqfddzNtx1nK126
          </Link>
        </View>

        <View wrap={false} style={{ marginTop: 6 }}>
          <Image
            src={`data:image/png;base64,${getArrangementContactHeadingHiBase64()}`}
            style={{ height: 10.5, width: (102.86 / 25) * 10.5, marginBottom: 2 }}
          />
          <Text style={{ fontSize: 9.5, fontWeight: 700, marginBottom: 6 }}>/ Arrangement Contact:</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Image src={`data:image/png;base64,${getElectricalArrangementsHiBase64()}`} style={{ height: 10, width: 46 }} />
            <Text style={{ fontSize: 9 }}>/ Electrical Arrangements: 98120-26070</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image src={`data:image/png;base64,${getTentArrangementsHiBase64()}`} style={{ height: 10, width: 33 }} />
            <Text style={{ fontSize: 9 }}>/ Tent Arrangements: 85718-08210</Text>
          </View>
        </View>

        <Text style={{ marginTop: 20, fontSize: 8, color: '#555' }}>
          Generated on: {new Date().toLocaleDateString('en-IN')} — This is a computer-generated document and does
          not require a signature.
        </Text>
      </Page>
    </Document>
  )
}
