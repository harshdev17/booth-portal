import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { getCategoryBySlug, getDocumentDefinitionsForCategory, isCategoryAcceptingApplications } from '@/lib/applications/categories'
import { withPooledConnection } from '@/lib/db/client'
import { getCategoryMapBySlug } from '@/lib/settings/category-maps'
import CategoryDetail from '@/views/public/category-detail'

export const metadata: Metadata = {
  title: 'Category Details | International Geeta Jayanti Mahotsav 2026'
}

// Forced dynamic (not ISR): see src/app/(public)/page.tsx for why a
// per-request CSP nonce is incompatible with caching this route.
export const dynamic = 'force-dynamic'

const CategoryDetailPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params

  // Category lookup + its 2 dependent reads share ONE pooled connection
  // instead of 3 separate checkouts — see .ai/CHANGELOG.md 2026-11-14.
  const { category, documents, mapRow } = await withPooledConnection(async query => {
    const category = await getCategoryBySlug(slug, query)

    if (!category || category.status === 'draft' || category.status === 'archived') {
      return { category: null, documents: [], mapRow: null }
    }

    const [documents, mapRow] = await Promise.all([
      getDocumentDefinitionsForCategory(category.id, query),
      getCategoryMapBySlug(category.slug, query)
    ])

    return { category, documents, mapRow }
  })

  if (!category) notFound()

  return (
    <>
      <PublicHeader />
      <CategoryDetail
        category={category}
        documents={documents}
        isAcceptingApplications={isCategoryAcceptingApplications(category)}
        mapPdfPath={mapRow?.pdfPath ?? null}
      />
      <PublicFooter />
    </>
  )
}

export default CategoryDetailPage
