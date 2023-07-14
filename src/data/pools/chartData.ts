import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import gql from 'graphql-tag'
import { PoolChartEntry } from 'state/pools/reducer'
import { ApolloClient, NormalizedCacheObject } from '@apollo/client'

// format dayjs with the libraries that we need
dayjs.extend(utc)
dayjs.extend(weekOfYear)
const ONE_DAY_UNIX = 24 * 60 * 60

const POOL_HOUR_CHART = gql`
  query poolHourDatas($startTime: Int!, $skip: Int!, $address: Bytes!) {
    poolHourDatas(
      first: 100
      where: { pool: $address }
      orderBy: periodStartUnix
      orderDirection: desc
      subgraphError: allow
    ) {
      tick
      periodStartUnix
    }
  }
`

const POOL_CHART = gql`
  query poolDayDatas($startTime: Int!, $skip: Int!, $address: Bytes!) {
    poolDayDatas(
      first: 1000
      skip: $skip
      where: { pool: $address, date_gt: $startTime }
      orderBy: date
      orderDirection: asc
      subgraphError: allow
    ) {
      feeGrowthGlobal0X128
      feeGrowthGlobal1X128
      date
      volumeUSD
      volumeToken0
      volumeToken1
      tvlUSD
      tick
      feesUSD
      txCount
      liquidity
      token0Price
      token1Price
      pool {
        feeTier
      }
    }
  }
`

interface ChartResults {
  poolDayDatas: {
    date: number
    feeGrowthGlobal0X128: string
    feeGrowthGlobal1X128: string
    volumeUSD: string
    volumeToken0: string
    volumeToken1: string
    tvlUSD: string
    feesUSD: string
    tick: string
    txCount: string
    liquidity: string
    token0Price: string
    token1Price: string
    pool: {
      feeTier: string
    }
  }[]
}

export async function fetchPoolChartData(address: string, client: ApolloClient<NormalizedCacheObject>) {
  let data: {
    date: number
    feeGrowthGlobal0X128: string
    feeGrowthGlobal1X128: string
    volumeUSD: string
    volumeToken0: string
    volumeToken1: string
    tvlUSD: string
    feesUSD: string
    tick: string
    txCount: string
    liquidity: string
    token0Price: string
    token1Price: string
    pool: {
      feeTier: string
    }
  }[] = []
  const startTimestamp = 1619170975
  const endTimestamp = dayjs.utc().unix()

  let error = false
  let skip = 0
  let allFound = false

  try {
    while (!allFound) {
      const {
        data: chartResData,
        error,
        loading,
      } = await client.query<ChartResults>({
        query: POOL_CHART,
        variables: {
          address: address,
          startTime: startTimestamp,
          skip,
        },
        fetchPolicy: 'cache-first',
      })
      if (!loading) {
        skip += 1000
        if (chartResData.poolDayDatas.length < 1000 || error) {
          allFound = true
        }
        if (chartResData) {
          data = data.concat(chartResData.poolDayDatas)
        }
      }
    }
  } catch {
    error = true
  }

  if (data) {
    const formattedExisting = data.reduce((accum: { [date: number]: PoolChartEntry }, dayData) => {
      const roundedDate = parseInt((dayData.date / ONE_DAY_UNIX).toFixed(0))
      const feePercent = parseFloat(dayData.pool.feeTier) / 10000
      const tvlAdjust = dayData?.volumeUSD ? parseFloat(dayData.volumeUSD) * feePercent : 0

      accum[roundedDate] = {
        date: dayData.date,
        volumeUSD: parseFloat(dayData.volumeUSD),
        feeGrowthGlobal0X128: parseFloat(dayData.feeGrowthGlobal0X128),
        feeGrowthGlobal1X128: parseFloat(dayData.feeGrowthGlobal1X128),
        volumeToken0: parseFloat(dayData.volumeToken0),
        volumeToken1: parseFloat(dayData.volumeToken1),
        totalValueLockedUSD: parseFloat(dayData.tvlUSD) - tvlAdjust,
        feesUSD: parseFloat(dayData.feesUSD),
        tick: parseFloat(dayData.tick),
        txCount: parseFloat(dayData.txCount),
        liquidity: parseFloat(dayData.liquidity),
        token0Price: parseFloat(dayData.token0Price),
        token1Price: parseFloat(dayData.token1Price),
      }
      return accum
    }, {})

    const firstEntry = formattedExisting[parseInt(Object.keys(formattedExisting)[0])]

    // fill in empty days ( there will be no day datas if no trades made that day )
    let timestamp = firstEntry?.date ?? startTimestamp
    let latestTvl = firstEntry?.totalValueLockedUSD ?? 0
    while (timestamp < endTimestamp - ONE_DAY_UNIX) {
      const nextDay = timestamp + ONE_DAY_UNIX
      const currentDayIndex = parseInt((nextDay / ONE_DAY_UNIX).toFixed(0))
      if (!Object.keys(formattedExisting).includes(currentDayIndex.toString())) {
        formattedExisting[currentDayIndex] = {
          date: nextDay,
          feeGrowthGlobal0X128: 0,
          feeGrowthGlobal1X128: 0,
          volumeUSD: 0,
          volumeToken0: 0,
          volumeToken1: 0,
          totalValueLockedUSD: latestTvl,
          feesUSD: 0,
          tick: 0,
          txCount: 0,
          liquidity: 0,
          token0Price: 0,
          token1Price: 0,
        }
      } else {
        latestTvl = formattedExisting[currentDayIndex].totalValueLockedUSD
      }
      timestamp = nextDay
    }

    const dateMap = Object.keys(formattedExisting).map((key) => {
      return formattedExisting[parseInt(key)]
    })

    return {
      data: dateMap,
      error: false,
    }
  } else {
    return {
      data: undefined,
      error,
    }
  }
}
