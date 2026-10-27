import 'server-only'

import { Document, Image, Page, renderToBuffer, StyleSheet, Text, View } from '@react-pdf/renderer'

import { getLogoBase64 } from '@/lib/pdf/assets'

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
  noteBoxItem: { marginBottom: 2, lineHeight: 1.4 }
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
          <Field label='Police Station Name' value={data.policeStationName} />
          <Field label='Police Station Address' value={data.policeStationAddress} full />
          <Field label='Aadhaar Number' value={data.aadhaarNumber} />
          <Field label='WhatsApp Number' value={data.mobileNumber} />
          {data.alternateMobile && <Field label='Alternate Mobile' value={data.alternateMobile} />}
          <Field label='Email' value={data.email} />
          <Field label='Address' value={data.address} full />
          <Field label='State' value={data.state} />
          <Field label='District' value={data.district} />
          <Field label='PIN Code' value={data.pinCode} />
          {data.shopOptionLabel && <Field label='Booth/Stall Option' value={data.shopOptionLabel} />}
          {data.feePaise !== null && <Field label='Application Fee' value={formatRupees(data.feePaise)} />}
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
  stallNumber: string
  stallDirection?: string | null
  mobileNumber?: string | null
  email?: string | null
  address?: string | null
  allotmentAmountPaise?: number | null
  allotmentPaidAt?: string | null
}

export async function renderAllotmentLetterPdf(data: AllotmentLetterPdfData): Promise<Buffer> {
  const isPaid = (data.allotmentAmountPaise ?? 0) > 0
  const feeLabel = isPaid ? formatRupees(data.allotmentAmountPaise!) : 'Exempt / Free'

  return renderToBuffer(
    <Document title={`Allotment-${data.applicationNumber}`}>
      <Page size='A4' style={styles.page}>
        <Watermark />
        <Letterhead />
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.titleHeading}>Official Booth / Stall Allotment Order</Text>
            <Text style={styles.letterheadSubtitle}>
              International Geeta Jayanti Mahotsav 2026 — Kurukshetra Development Board
            </Text>
          </View>
          <Text style={styles.badge}>STALL: {data.stallNumber}</Text>
        </View>
        <View style={styles.grid}>
          <Field label='Reference Number' value={`KDB/IGM-2026/ALLOT/${data.applicationNumber}`} />
          <Field label='Allotment Date' value={new Date().toLocaleDateString('en-IN')} />
          <Field label='Application Number' value={data.applicationNumber} />
          <Field label='Allotted Booth / Stall No.' value={data.stallNumber} />
          {data.stallDirection && <Field label='Stall Location / Direction' value={data.stallDirection} />}
          <Field label='Category' value={data.categoryName} />
          {data.organisationName && <Field label='Organisation / Firm Name' value={data.organisationName} />}
          <Field label='Allottee Name' value={data.representativeName} />
          {data.fatherName && <Field label="Father's / Husband's Name" value={data.fatherName} />}
          {data.mobileNumber && <Field label='Mobile Number' value={data.mobileNumber} />}
          {data.email && <Field label='Email Address' value={data.email} />}
          {data.address && <Field label='Postal Address' value={data.address} full />}
          <Field label='Stall Allotment Fee' value={feeLabel} />
          {data.allotmentPaidAt && (
            <Field label='Paid At' value={new Date(data.allotmentPaidAt).toLocaleString('en-IN')} />
          )}
        </View>
        <View style={styles.noteBox}>
          <Text style={styles.noteBoxTitle}>Important Terms & Instructions:</Text>
          <Text style={styles.noteBoxItem}>
            1. This allotment order is valid exclusively for the official duration of International Geeta Jayanti
            Mahotsav 2026.
          </Text>
          <Text style={styles.noteBoxItem}>
            2. The allottee must occupy only the allocated booth/stall and conduct only approved activities.
          </Text>
          <Text style={styles.noteBoxItem}>
            3. Compliance with fire safety regulations, waste management, and KDB fair bylaws is mandatory.
          </Text>
          <Text style={styles.noteBoxItem}>
            4. Please carry this original allotment letter along with a valid Government Photo ID at the time of
            taking stall possession.
          </Text>
        </View>
        <Text style={{ marginTop: 24, fontSize: 8, color: '#555' }}>
          Generated on: {new Date().toLocaleDateString('en-IN')}
        </Text>
      </Page>
    </Document>
  )
}
