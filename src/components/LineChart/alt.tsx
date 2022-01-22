import React, { Dispatch, SetStateAction, ReactNode } from 'react'
import { ResponsiveContainer, ReferenceLine, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts'
import styled from 'styled-components'
import Card from 'components/Card'
import { RowBetween } from 'components/Row'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import useTheme from 'hooks/useTheme'
import { darken } from 'polished'
dayjs.extend(utc)

const DEFAULT_HEIGHT = 400

const Wrapper = styled(Card)`
  width: 100%;
  height: ${DEFAULT_HEIGHT}px;
  padding: 1rem;
  padding-right: 2rem;
  display: flex;
  background-color: ${({ theme }) => theme.bg0}
  flex-direction: column;
  > * {
    font-size: 1rem;
  }
`

export type LineChartProps = {
  data: any[]
  color?: string | undefined
  height?: number | undefined
  minHeight?: number
  referenceLine?: number
  yAxisLabel?: string
  setValue?: Dispatch<SetStateAction<number | undefined>> // used for value on hover
  setLabel?: Dispatch<SetStateAction<string | undefined>> // used for label of valye
  value?: number
  label?: string
  topLeft?: ReactNode | undefined
  topRight?: ReactNode | undefined
  bottomLeft?: ReactNode | undefined
  bottomRight?: ReactNode | undefined
} & React.HTMLAttributes<HTMLDivElement>

const Chart = ({
  data,
  color = '#56B2A4',
  value,
  label,
  setValue,
  setLabel,
  topLeft,
  topRight,
  bottomLeft,
  bottomRight,
  yAxisLabel = 'bar',
  referenceLine = -1,
  minHeight = DEFAULT_HEIGHT,
  ...rest
}: LineChartProps) => {
  const theme = useTheme()
  const parsedValue = value

  return (
    <Wrapper minHeight={minHeight} {...rest}>
      <RowBetween>
        {topLeft ?? null}
        {topRight ?? null}
      </RowBetween>
      <ResponsiveContainer width={800} height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 25,
            right: 30,
            left: 20,
            bottom: 50,
          }}
          onMouseLeave={() => {
            setLabel && setLabel(undefined)
            setValue && setValue(undefined)
          }}
        >
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={darken(0.36, color)} stopOpacity={0.5} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis
            dataKey="value"
            tick={{ fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={10}
            interval={0}
            tickCount={4}
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
          />
          <ReferenceLine
            y={referenceLine > 0 ? referenceLine : 0}
            label={{ value: referenceLine > 0 ? 'RV' : 0, angle: 0, position: 'right' }}
            stroke="#000"
            strokeDasharray="1 2"
          />

          <XAxis
            dataKey="time"
            axisLine={false}
            tickLine={false}
            angle={-90}
            textAnchor="end"
            tickFormatter={(time) => dayjs(time).format('MM-DD')}
            minTickGap={10}
          />
          <Tooltip
            cursor={{ stroke: 'red' }}
            contentStyle={{ display: 'none' }}
            formatter={(value: number, name: string, props: { payload: { time: string; value: number } }) => {
              if (setValue && parsedValue !== props.payload.value) {
                setValue(props.payload.value)
              }
              const formattedTime = dayjs(props.payload.time).format('MMM D, YYYY')
              if (setLabel && label !== formattedTime) setLabel(formattedTime)
            }}
          />
          <Area dataKey="value" type="monotone" stroke={color} fill="url(#gradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
      <RowBetween>
        {bottomLeft ?? null}
        {bottomRight ?? null}
      </RowBetween>
    </Wrapper>
  )
}

export default Chart
