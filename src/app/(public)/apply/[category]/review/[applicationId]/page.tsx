import type { Metadata } from 'next'

import { notFound } from 'next/navigation'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import ReviewPageView from '@/views/public/apply-review/ReviewPageView'

export const metadata: Metadata = {
  title: 'Review Application | International Gita Mahotsav 2026'
}

const ReviewPage = async ({ params }: { params: Promise<{ category: string; applicationId: string }> }) => {
  const { category, applicationId } = await params
  const parsedId = Number(applicationId)

  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    notFound()
  }

  return (
    <>
      <PublicHeader />
      <ReviewPageView categorySlug={category} applicationId={parsedId} />
      <PublicFooter />
    </>
  )
}

export default ReviewPage
