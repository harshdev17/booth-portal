import type { Metadata } from 'next'

import { query } from '@/lib/db/client'
import { requirePermission } from '@/lib/rbac/authorize'
import DirectAllotmentClient from '@/views/admin/allotment/DirectAllotmentClient'

export const metadata: Metadata = {
  title: 'Booth/Stall Allotment — IGM Admin Portal'
}

const ShopAllotmentPage = async () => {
  await requirePermission('allotment:perform')
  const [categories, stalls, existing] = await Promise.all([
    query<Array<{ id: number; name: string }>>(`SELECT id, name FROM categories WHERE is_direct_allotment = 1 AND status != 'archived' ORDER BY name`),
    query<Array<{ id: number; category_id: number; stall_number: string; shop_type: string; direction: string | null }>>(`SELECT id, category_id, stall_number, shop_type, direction FROM shop_units WHERE status = 'available' ORDER BY stall_number`),
    query<Array<{ id: number; category_name: string; stall_number: string; allottee_name: string; contact_person: string | null; mobile_number: string | null; allotted_at: string }>>(`SELECT da.id, c.name AS category_name, su.stall_number, da.allottee_name, da.contact_person, da.mobile_number, da.allotted_at FROM direct_allotments da JOIN categories c ON c.id = da.category_id JOIN shop_units su ON su.id = da.shop_unit_id WHERE da.status = 'active' ORDER BY da.allotted_at DESC`)
  ])

  return (
    <div className='flex flex-col gap-6'><div><h1 className='text-2xl font-bold tracking-tight text-[#0c2847]'>Direct Booth/Stall Allotment</h1><p className='text-sm text-muted-foreground'>For admin-only categories that do not use the public application form.</p></div><DirectAllotmentClient initialCategories={categories} stalls={stalls.map(stall => ({ id: stall.id, categoryId: stall.category_id, stallNumber: stall.stall_number, shopType: stall.shop_type, direction: stall.direction }))} existing={existing.map(item => ({ id: item.id, categoryName: item.category_name, stallNumber: item.stall_number, allotteeName: item.allottee_name, contactPerson: item.contact_person, mobileNumber: item.mobile_number, allottedAt: item.allotted_at }))} /></div>
  )
}

export default ShopAllotmentPage
