import type { Metadata } from 'next'

import { listCategoryMaps, listOpenCategoriesWithMaps } from '@/lib/settings/category-maps'
import { requirePermission } from '@/lib/rbac/authorize'
import CategoryMapsSettingsClient from '@/views/admin/settings/CategoryMapsSettingsClient'

export const metadata: Metadata = {
  title: 'Stall/Booth Location Maps — IGM Admin Portal'
}

const CategoryMapsSettingsPage = async () => {
  await requirePermission('config:manage')

  const [{ fullMap }, categories] = await Promise.all([listCategoryMaps(), listOpenCategoriesWithMaps()])

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Stall/Booth Location Maps</h1>
        <p className='text-sm text-muted-foreground'>
          Upload or replace the venue layout file (PDF, JPG, or PNG) shown on the public "Stall/Booth Locations" page — one Full Map, plus
          one optional map per category. A category with no uploaded map is simply not listed there.
        </p>
      </div>

      <CategoryMapsSettingsClient fullMap={fullMap} categories={categories} />
    </div>
  )
}

export default CategoryMapsSettingsPage
