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

/**
 * Informational "If Yes →" warnings from the business-supplied form spec
 * (NGO commercial-activity, Government commercial-promotion, Refreshment
 * LPG/open-flame). Static here rather than in category_field_definitions
 * since this is presentation copy tied to a specific field_key + trigger
 * value, not a field definition itself — the underlying rule (e.g. open
 * flame is prohibited) is still enforced for real in cooking/food-safety
 * review, not by this client-side banner; this only surfaces it to the
 * applicant before they submit.
 */
const FIELD_WARNINGS: Record<string, { value: string; messageEn: string; messageHi: string }> = {
  commercial_activity: {
    value: 'yes',
    messageEn:
      'NGO stalls may not be used for commercial activity. Applications involving commercial use may not be eligible under current guidelines.',
    messageHi:
      'एनजीओ स्टॉल का उपयोग व्यावसायिक गतिविधि हेतु नहीं किया जा सकता। वर्तमान दिशा-निर्देशों के अनुसार व्यावसायिक उपयोग वाले आवेदन पात्र नहीं हो सकते।'
  },
  commercial_promotion: {
    value: 'yes',
    messageEn:
      'The Government Department category is not intended for commercial promotion. Eligible commercial entities may apply under the Brand Promotion category instead.',
    messageHi:
      'सरकारी विभाग श्रेणी व्यावसायिक प्रचार हेतु नहीं है। पात्र व्यावसायिक संस्थाएं इसके बजाय ब्रांड प्रमोशन श्रेणी के अंतर्गत आवेदन कर सकती हैं।'
  },
  lpg_open_flame: {
    value: 'yes',
    messageEn:
      'LPG, gas, open flame, cooking, frying, roasting, baking, coal, wood and furnace use are not permitted at stalls under current guidelines. Only pre-packed / ready-to-sell products may be sold.',
    messageHi:
      'वर्तमान दिशा-निर्देशों के अनुसार स्टॉल पर एलपीजी, गैस, खुली लौ, खाना पकाना, तलना, भूनना, बेकिंग, कोयला, लकड़ी एवं भट्टी के उपयोग की अनुमति नहीं है। केवल पहले से पैक/बिक्री हेतु तैयार उत्पाद ही बेचे जा सकते हैं।'
  }
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
        <div className='kdb-form-scale'>
          <ApplicationsClosedNotice categoryName={category.name} categoryNameHi={category.name_hi} />
        </div>
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

        // mysql2 auto-parses a JSON column into a JS value already — never a
        // raw string to re-JSON.parse() (same pitfall documented on the
        // admin inventory logs route; this field def row was the first one
        // to actually populate options_json, which is why this surfaced now).
        options: f.options_json
          ? ((typeof f.options_json === 'string' ? JSON.parse(f.options_json) : f.options_json) as Array<{
              value: string
              label: string
            }>)
          : undefined,
        warnOnValue: FIELD_WARNINGS[f.field_key]
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
      <div className='kdb-form-scale'>
        <ApplicationFormOrchestrator config={config} editApplicationId={editApplicationId} />
      </div>
      <PublicFooter />
    </>
  )
}

export default ApplyPage
