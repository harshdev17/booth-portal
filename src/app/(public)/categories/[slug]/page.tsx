import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import { getCategoryBySlug, getDocumentDefinitionsForCategory, isCategoryAcceptingApplications } from '@/lib/applications/categories'
import CategoryDetail from '@/views/public/category-detail'

export const metadata: Metadata = {
  title: 'Category Details | International Geeta Jayanti Mahotsav 2026'
}

const CategoryDetailPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params
  const category = await getCategoryBySlug(slug)

  if (!category || category.status === 'draft' || category.status === 'archived') {
    notFound()
  }

  const documents = await getDocumentDefinitionsForCategory(category.id)

  return (
    <>
      <PublicHeader />
      <CategoryDetail
        category={category}
        documents={documents}
        isAcceptingApplications={isCategoryAcceptingApplications(category)}
      />
      <PublicFooter />
    </>
  )
}

export default CategoryDetailPage
