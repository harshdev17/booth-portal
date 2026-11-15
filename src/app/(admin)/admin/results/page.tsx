import type { Metadata } from 'next'

import { withPooledConnection } from '@/lib/db/client'
import { listResultDocuments } from '@/lib/draw/result-documents'
import { getResultsBannerSettings } from '@/lib/draw/results-declared'
import { requirePermission } from '@/lib/rbac/authorize'
import ResultsAdminClient from '@/views/admin/results/ResultsAdminClient'

export const metadata: Metadata = {
  title: 'Results — IGM Admin Portal'
}

export const dynamic = 'force-dynamic'

const ResultsAdminPage = async () => {
  await requirePermission('config:manage')

  const [documents, bannerSettings] = await withPooledConnection(query =>
    Promise.all([listResultDocuments(query), getResultsBannerSettings(query)])
  )

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Results</h1>
        <p className='text-sm text-muted-foreground'>
          Upload official draw-result PDFs for public download, and manage the site-wide
          &quot;Results declared&quot; banner message.
        </p>
      </div>

      <ResultsAdminClient documents={documents} initialBanner={bannerSettings} />
    </div>
  )
}

export default ResultsAdminPage
