import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function ApplicationsLoading() {
  return (
    <div className='flex flex-col gap-6 animate-pulse'>
      {/* Top Header Skeleton */}
      <div>
        <div className='h-8 w-64 rounded-md bg-muted' />
        <div className='mt-2 h-4 w-96 rounded-md bg-muted' />
      </div>

      {/* KPI Cards Skeleton */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        {[1, 2, 3].map(i => (
          <Card key={i} className='shadow-xs'>
            <CardHeader className='pb-2'>
              <div className='h-3 w-28 rounded-md bg-muted' />
              <div className='mt-2 h-8 w-16 rounded-md bg-muted' />
            </CardHeader>
            <CardContent>
              <div className='h-3 w-48 rounded-md bg-muted' />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & Filters Skeleton */}
      <Card className='shadow-xs'>
        <CardContent className='pt-6'>
          <div className='flex flex-col sm:flex-row gap-3'>
            <div className='h-10 flex-1 rounded-md bg-muted' />
            <div className='h-10 w-44 rounded-md bg-muted' />
            <div className='h-10 w-44 rounded-md bg-muted' />
            <div className='h-10 w-24 rounded-md bg-muted' />
          </div>
        </CardContent>
      </Card>

      {/* Table Skeleton */}
      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/30 py-4'>
          <div className='h-5 w-36 rounded-md bg-muted' />
        </CardHeader>
        <CardContent className='p-6 space-y-4'>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className='flex items-center justify-between gap-4 py-2 border-b border-muted/40'>
              <div className='h-4 w-32 rounded-md bg-muted' />
              <div className='h-4 w-40 rounded-md bg-muted' />
              <div className='h-4 w-28 rounded-md bg-muted' />
              <div className='h-4 w-28 rounded-md bg-muted' />
              <div className='h-6 w-20 rounded-full bg-muted' />
              <div className='h-4 w-24 rounded-md bg-muted' />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
