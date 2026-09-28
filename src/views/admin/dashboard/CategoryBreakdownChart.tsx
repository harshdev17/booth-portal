'use client'

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  count: { label: 'Applications', color: '#0c2847' }
} satisfies ChartConfig

type Props = {
  data: Array<{ category: string; count: number }>
}

const CategoryBreakdownChart = ({ data }: Props) => (
  <ChartContainer config={chartConfig} className='aspect-auto h-64 w-full'>
    <BarChart data={data} layout='vertical' margin={{ left: 8, right: 16 }}>
      <CartesianGrid horizontal={false} strokeDasharray='3 3' />
      <XAxis type='number' allowDecimals={false} tickLine={false} axisLine={false} />
      <YAxis
        type='category'
        dataKey='category'
        tickLine={false}
        axisLine={false}
        width={140}
        tick={{ fontSize: 11 }}
      />
      <ChartTooltip content={<ChartTooltipContent />} />
      <Bar dataKey='count' fill='var(--color-count)' radius={[0, 4, 4, 0]} barSize={16} />
    </BarChart>
  </ChartContainer>
)

export default CategoryBreakdownChart
