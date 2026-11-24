import { Suspense } from 'react'

import type { Metadata } from 'next'

import PublicFooter from '@/components/public/PublicFooter'
import PublicHeader from '@/components/public/PublicHeader'
import ResultsDeclaredBanner from '@/components/public/ResultsDeclaredBanner'
import { withPooledConnection } from '@/lib/db/client'
import { anyDrawCompleted, getResultsBannerSettings } from '@/lib/draw/results-declared'
import { getSiteNoticeBanners } from '@/lib/homepage/site-notice-banners'
import StatusLookup from '@/views/public/status'

export const metadata: Metadata = {
  title: 'Application Status | International Geeta Jayanti Mahotsav 2026'
}

// Without this, Next.js statically prerenders this page at build time with
// one fixed CSP nonce baked into the HTML — but proxy.ts generates a fresh,
// different nonce on every live request. That mismatch made Next.js's own
// inline hydration script get blocked by the CSP on every single visit
// (reported live: page stuck on the global loading.tsx forever, console
// showed "Uncaught... React error #412" + a CSP inline-script violation).
// Every other public page under (public)/ already has this export; this one
// was missed. force-dynamic opts the route out of static prerendering so
// its HTML (and nonce) is generated fresh per request, matching the header.
export const dynamic = 'force-dynamic'

const StatusPage = async () => {
  const [[resultsDeclared, bannerSettings], noticeBanners] = await Promise.all([
    withPooledConnection(query => Promise.all([anyDrawCompleted(query), getResultsBannerSettings(query)])),
    getSiteNoticeBanners()
  ])

  return (
    <>
      <PublicHeader />
      <ResultsDeclaredBanner show={resultsDeclared} textEn={bannerSettings.textEn} textHi={bannerSettings.textHi} />
      {/* StatusLookup reads ?appNo= via useSearchParams, which requires a Suspense boundary in the App Router */}
      <Suspense>
        <StatusLookup noticeBanners={noticeBanners} />
      </Suspense>
      <PublicFooter />
    </>
  )
}

export default StatusPage
