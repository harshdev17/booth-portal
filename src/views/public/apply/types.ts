export type CategoryDetail = {
  slug: string
  name: string
  nameHi: string | null
  description: string | null
  selectionMethod: 'draw' | 'manual' | 'auction' | 'tender' | 'application_fee'
  feePaise: number | null
  feeBasePaise: number | null
  gstPercent: number | null
  applicationOpensAt: string | null
  applicationClosesAt: string | null
  isAcceptingApplications: boolean
}

export type ShopOptionDto = { id: number; label: string; feePaise: number | null }

export type CategoryFieldDto = {
  key: string
  label: string
  labelHi: string | null
  inputType: 'text' | 'textarea' | 'select' | 'radio'
  required: boolean
  maxLength: number | null
  options?: Array<{ value: string; label: string }>
}

export type CategoryDocumentDto = {
  key: string
  label: string
  labelHi: string | null
  required: boolean
  allowedMimeTypes: string[]
  maxSizeBytes: number
}

export type CategoryConfigResponse = {
  category: CategoryDetail
  shopOptions: ShopOptionDto[]
  fields: CategoryFieldDto[]
  documents: CategoryDocumentDto[]
}

export type SubmissionResult = {
  applicationNumber: string
  applicationId: number
  accessToken: string
}
