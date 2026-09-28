'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  count: { label: 'Applications submitted', color: '#d8891d' }
} satisfies ChartConfig

type Props = {
  data: Array<{ date: string; count: number }>
}

const SubmissionsTrendChart = ({ data }: Props) => (
  <ChartContainer config={chartConfig} className='aspect-auto h-48 w-full'>
    <AreaChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
      <defs>
        <linearGradient id='fillSubmissions' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='5%' stopColor='var(--color-count)' stopOpacity={0.35} />
          <stop offset='95%' stopColor='var(--color-count)' stopOpacity={0.03} />
        </linearGradient>
      </defs>
      <CartesianGrid vertical={false} strokeDasharray='3 3' />
      <XAxis
        dataKey='date'
        tickLine={false}
        axisLine={false}
        tick={{ fontSize: 11 }}
        tickFormatter={value => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      />
      <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} tick={{ fontSize: 11 }} />
      <ChartTooltip
        content={
          <ChartTooltipContent
            labelFormatter={value => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          />
        }
      />
      <Area dataKey='count' type='monotone' fill='url(#fillSubmissions)' stroke='var(--color-count)' strokeWidth={2} />
    </AreaChart>
  </ChartContainer>
)

export default SubmissionsTrendChart
