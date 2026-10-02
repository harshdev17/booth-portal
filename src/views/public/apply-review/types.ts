export type ReviewData = {
  applicationNumber: string
  categoryName: string
  selectionMethod?: string
  feePaise?: number | null
  feeBasePaise?: number | null
  gstPercent?: number | null
  common: {
    email: string
    organisationName: string
    representativeName: string
    fatherName: string
    aadhaarNumber: string
    address: string
    state: string
    district: string
    pinCode: string
    mobileNumber: string
    alternateMobile: string | null
    workPurpose: string
    achievementExperience: string
    remarks: string | null
  }
  shopOptionId: number | null
  shopOptionLabel: string | null
  categoryFields: Array<{ field_key: string; label: string; value: string }>
  documents: Array<{
    documentId: number
    documentKey: string
    label: string
    uploaded: boolean
    verificationStatus: string
    originalFilename?: string
  }>
}

