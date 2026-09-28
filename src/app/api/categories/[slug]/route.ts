import { NextResponse } from 'next/server'

import {
  getCategoryBySlug,
  getDocumentDefinitionsForCategory,
  getFeeBreakdown,
  getFieldDefinitionsForCategory,
  getShopOptionsForCategory,
  isCategoryAcceptingApplications
} from '@/lib/applications/categories'
import { logServerError } from '@/lib/security/error-log'
import { getRequestMeta } from '@/lib/security/request-meta'
import { isRateLimited, RATE_LIMITS } from '@/lib/security/rate-limit'

const SLUG_PATTERN = /^[a-z0-9-]{1,191}$/

/**
 * Public: category detail plus the field/document configuration the
 * frontend uses to render the dynamic application form. This is DISPLAY
 * configuration only — the actual submission is independently re-validated
 * against the same tables server-side (see
 * src/lib/applications/validate-submission.ts), so this endpoint returning
 * stale or even tampered-with data to a malicious client cannot bypass
 * business rules.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { ipAddress } = getRequestMeta(request)

  if (isRateLimited('categories.detail', ipAddress ?? 'unknown', RATE_LIMITS.categoryRead)) {
    return NextResponse.json({ error: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  const { slug } = await params

  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json({ error: 'Category not found.' }, { status: 404 })
  }

  try {
    const category = await getCategoryBySlug(slug)

    if (!category || category.status === 'draft' || category.status === 'archived') {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 })
    }

    const [shopOptions, fieldDefinitions, documentDefinitions] = await Promise.all([
      getShopOptionsForCategory(category.id),
      getFieldDefinitionsForCategory(category.id),
      getDocumentDefinitionsForCategory(category.id)
    ])

    const fee = getFeeBreakdown(category)

    return NextResponse.json({
      category: {
        slug: category.slug,
        name: category.name,
        nameHi: category.name_hi,
        description: category.description,
        descriptionHi: category.description_hi,
        selectionMethod: category.selection_method,
        feePaise: fee?.totalPaise ?? null,
        feeBasePaise: fee?.basePaise ?? null,
        gstPercent: fee?.gstPercent ?? null,
        applicationOpensAt: category.application_opens_at,
        applicationClosesAt: category.application_closes_at,
        isAcceptingApplications: isCategoryAcceptingApplications(category)
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
    })
  } catch (error) {
    logServerError('api.categories.detail', error, { slug })

    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
