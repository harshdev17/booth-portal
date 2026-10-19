import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { getCategoryBySlug, getDocumentDefinitionsForCategory, isCategoryAcceptingApplications } from '@/lib/applications/categories'
import { getCategoryMapBySlug } from '@/lib/settings/category-maps'
import CategoryDetail from '@/views/public/category-detail'

export const metadata: Metadata = {
  title: 'Category Details | International Geeta Jayanti Mahotsav 2026'
}

export const revalidate = 60

const CategoryDetailPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category || category.status === 'draft' || category.status === 'archived') {
    notFound()
  }

  const [documents, mapRow] = await Promise.all([
    getDocumentDefinitionsForCategory(category.id),
    getCategoryMapBySlug(category.slug)
  ])

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
