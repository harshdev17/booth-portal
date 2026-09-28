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
    aadhaarMasked: string
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
  shopOptionLabel: string | null
  categoryFields: Array<{ label: string; value: string }>
  documents: Array<{ label: string; uploaded: boolean; verificationStatus: string; originalFilename?: string }>
}

