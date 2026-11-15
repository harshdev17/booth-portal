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

  const { pending, declared, tableMissing } = await listResultRows()
  const history = tableMissing ? [] : await listResultHistory()

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Declare Result</h1>
        <p className='text-sm text-muted-foreground'>
          Upload the booth-wise result sheet, review who gets which booth, then declare to notify applicants.
        </p>
      </div>

      <DeclareResultClient pending={pending} declared={declared} history={history} tableMissing={tableMissing} />
    </div>
  )
}

export default DeclareResultPage
