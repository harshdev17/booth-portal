import type { Metadata } from 'next'

import { listResultHistory, listResultRows } from '@/lib/allotment/declare-result'
import { requirePermission } from '@/lib/rbac/authorize'
import DeclareResultClient from '@/views/admin/declare-result/DeclareResultClient'

export const metadata: Metadata = {
  title: 'Declare Result — IGM Admin Portal'
}

export const dynamic = 'force-dynamic'

const DeclareResultPage = async () => {
  await requirePermission('allotment:perform')

  const [draw, auction] = await Promise.all([
    listResultRows('draw_allotment'),
    listResultRows('auction_result')
  ])
  const tableMissing = draw.tableMissing || auction.tableMissing
  const history = tableMissing ? [] : await listResultHistory()

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Declare Result</h1>
        <p className='text-sm text-muted-foreground'>
          Upload the booth-wise result sheet (draw/manual, or an auction category's physical-auction winners), review
          who gets which booth, then declare to notify applicants.
        </p>
      </div>

      <DeclareResultClient
        drawPending={draw.pending}
        drawDeclared={draw.declared}
        auctionPending={auction.pending}
        auctionDeclared={auction.declared}
        history={history}
        tableMissing={tableMissing}
      />
    </div>
  )
}

export default DeclareResultPage
