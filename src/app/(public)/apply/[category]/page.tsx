import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import {
  getCategoryBySlug,
  getDocumentDefinitionsForCategory,
  getFeeBreakdown,
  getFieldDefinitionsForCategory,
  getShopOptionsForCategory,
  isCategoryAcceptingApplications
} from '@/lib/applications/categories'
import ApplicationFormOrchestrator from '@/views/public/apply/ApplicationFormOrchestrator'
import ApplicationsClosedNotice from '@/views/public/apply/ApplicationsClosedNotice'
import type { CategoryConfigResponse } from '@/views/public/apply/types'

export const metadata: Metadata = {
  title: 'Apply | International Geeta Jayanti Mahotsav 2026'
}

const ApplyPage = async ({
  params,
  searchParams
}: {
  params: Promise<{ category: string }>
  searchParams: Promise<{ edit?: string }>
}) => {
  const { category: slug } = await params
  const { edit } = await searchParams
  const parsedEditId = edit ? Number(edit) : NaN
  const editApplicationId = Number.isInteger(parsedEditId) && parsedEditId > 0 ? parsedEditId : undefined
  const category = await getCategoryBySlug(slug)

  if (!category || category.status === 'draft' || category.status === 'archived') {
    notFound()
  }

  if (!isCategoryAcceptingApplications(category)) {
    return (
      <>
        <PublicHeader />
        <ApplicationsClosedNotice categoryName={category.name} categoryNameHi={category.name_hi} />
        <PublicFooter />
      </>
    )
  }

  const [shopOptions, fieldDefinitions, documentDefinitions] = await Promise.all([
    getShopOptionsForCategory(category.id),
    getFieldDefinitionsForCategory(category.id),
    getDocumentDefinitionsForCategory(category.id)
  ])

  const fee = getFeeBreakdown(category)

  const config: CategoryConfigResponse = {
    category: {
      slug: category.slug,
      name: category.name,
      nameHi: category.name_hi,
      description: category.description,
      selectionMethod: category.selection_method,
      feePaise: fee?.totalPaise ?? null,
      feeBasePaise: fee?.basePaise ?? null,
      gstPercent: fee?.gstPercent ?? null,
      applicationOpensAt: category.application_opens_at,
      applicationClosesAt: category.application_closes_at,
      auctionDate: category.auction_date,
      auctionVenue: category.auction_venue,
      auctionVenueHi: category.auction_venue_hi,
      isAcceptingApplications: true
    },
    shopOptions: shopOptions.map(o => ({ id: o.id, label: o.label, feePaise: o.fee_paise })),
    fields: fieldDefinitions
      .filter(f => f.field_key !== 'shop_option_id')
      .map(f => ({
        key: f.field_key,
        label: f.label,
        labelHi: f.label_hi,
        inputType: f.input_type,
        required: Boolean(f.is_required),
        maxLength: f.max_length,
        options: f.options_json ? JSON.parse(f.options_json) : undefined
      })),
    documents: documentDefinitions.map(d => ({
      key: d.document_key,
      label: d.label,
      labelHi: d.label_hi,
      required: Boolean(d.is_required),
      allowedMimeTypes: d.allowed_mime_types.split(','),
      maxSizeBytes: d.max_size_bytes
    }))
  }

  return (
    <>
      <PublicHeader />
      <ApplicationFormOrchestrator config={config} editApplicationId={editApplicationId} />
      <PublicFooter />
    </>
  )
}

export default ApplyPage
