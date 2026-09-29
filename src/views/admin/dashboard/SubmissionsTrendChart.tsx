'use client'

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'

const chartConfig = {
  count: { label: 'Applications submitted', color: '#0c2847' }
} satisfies ChartConfig

type Props = {
  data: Array<{ date: string; count: number }>
}

const SubmissionsTrendChart = ({ data }: Props) => (
  <ChartContainer config={chartConfig} className='aspect-auto h-48 w-full'>
    <LineChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
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
      <Line dataKey='count' type='monotone' stroke='var(--color-count)' strokeWidth={2} dot={{ r: 3 }} />
    </LineChart>
  </ChartContainer>
)

export default SubmissionsTrendChart
