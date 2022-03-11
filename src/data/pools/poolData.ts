import { useQuery } from '@apollo/client'
import gql from 'graphql-tag'
import { useDeltaTimestamps } from 'utils/queries'
import { useBlocksFromTimestamps } from 'hooks/useBlocksFromTimestamps'
import { PoolData } from 'state/pools/reducer'
import { get2DayChange } from 'utils/data'
import { formatTokenName, formatTokenSymbol } from 'utils/tokens'
import { useClients } from 'state/application/hooks'

export const POOLS_BULK = (block: number | undefined, pools: string[]) => {
  let poolString = `[`
  pools.map((address) => {
    return (poolString += `"${address}",`)
  })
  poolString += ']'
  const queryString =
    `
    query pools {
      pools(where: {id_in: ${poolString}},` +
    (block ? `block: {number: ${block}} ,` : ``) +
    ` orderBy: totalValueLockedUSD, orderDirection: desc, subgraphError: allow) {
        id
        feeTier
        liquidity
        sqrtPrice
        tick
        token0 {
            id
            symbol 
            name
            decimals
            derivedETH
        }
        token1 {
            id
            symbol 
            name
            decimals
            derivedETH
        }
        poolDayData(first: 5, orderBy: date, orderDirection:desc) {
          txCount
          volumeUSD
        }        
        token0Price
        token1Price
        volumeUSD
        txCount
        totalValueLockedToken0
        totalValueLockedToken1
        totalValueLockedUSD
        feesUSD
      }
    }
    `
  return gql(queryString)
}

interface PoolFields {
  id: string
  feeTier: string
  liquidity: string
  sqrtPrice: string
  tick: string
  token0: {
    id: string
    symbol: string
    name: string
    decimals: string
    derivedETH: string
  }
  token1: {
    id: string
    symbol: string
    name: string
    decimals: string
    derivedETH: string
  }
  poolDayData: {
    txCount: string
    volumeUSD: string
  }[]
  token0Price: string
  token1Price: string
  volumeUSD: string
  volumeToken0: string
  volumeToken1: string
  txCount: string
  totalValueLockedToken0: string
  totalValueLockedToken1: string
  totalValueLockedUSD: string
  feesUSD: string
}

interface PoolDataResponse {
  pools: PoolFields[]
}

/**
 * Fetch top addresses by volume
 */
export function usePoolDatas(poolAddresses: string[]): {
  loading: boolean
  error: boolean
  data:
    | {
        [address: string]: PoolData
      }
    | undefined
} {
  // get client
  const { dataClient } = useClients()

  // get blocks from historic timestamps
  const [t24, t48, tWeek] = useDeltaTimestamps()
  const { blocks, error: blockError } = useBlocksFromTimestamps([t24, t48, tWeek])
  const [block24, block48, blockWeek] = blocks ?? []

  const { loading, error, data } = useQuery<PoolDataResponse>(POOLS_BULK(undefined, poolAddresses), {
    client: dataClient,
  })

  const {
    loading: loading24,
    error: error24,
    data: data24,
  } = useQuery<PoolDataResponse>(POOLS_BULK(block24?.number, poolAddresses), { client: dataClient })
  const {
    loading: loading48,
    error: error48,
    data: data48,
  } = useQuery<PoolDataResponse>(POOLS_BULK(block48?.number, poolAddresses), { client: dataClient })
  const {
    loading: loadingWeek,
    error: errorWeek,
    data: dataWeek,
  } = useQuery<PoolDataResponse>(POOLS_BULK(blockWeek?.number, poolAddresses), { client: dataClient })

  const anyError = Boolean(error || error24 || error48 || blockError || errorWeek)
  const anyLoading = Boolean(loading || loading24 || loading48 || loadingWeek)

  // return early if not all data yet
  if (anyError || anyLoading) {
    return {
      loading: anyLoading,
      error: anyError,
      data: undefined,
    }
  }

  const parsed = data?.pools
    ? data.pools.reduce((accum: { [address: string]: PoolFields }, poolData) => {
        accum[poolData.id] = poolData
        return accum
      }, {})
    : {}
  const parsed24 = data24?.pools
    ? data24.pools.reduce((accum: { [address: string]: PoolFields }, poolData) => {
        accum[poolData.id] = poolData
        return accum
      }, {})
    : {}
  const parsed48 = data48?.pools
    ? data48.pools.reduce((accum: { [address: string]: PoolFields }, poolData) => {
        accum[poolData.id] = poolData
        return accum
      }, {})
    : {}
  const parsedWeek = dataWeek?.pools
    ? dataWeek.pools.reduce((accum: { [address: string]: PoolFields }, poolData) => {
        accum[poolData.id] = poolData
        return accum
      }, {})
    : {}

  // format data and calculate daily changes
  const formatted = poolAddresses.reduce((accum: { [address: string]: PoolData }, address) => {
    const current: PoolFields | undefined = parsed[address]
    const oneDay: PoolFields | undefined = parsed24[address]
    const twoDay: PoolFields | undefined = parsed48[address]
    const week: PoolFields | undefined = parsedWeek[address]

    const volumeUSD = current
      ? current.poolDayData.length > 1
        ? parseFloat(current.poolDayData[1]?.volumeUSD)
        : parseFloat(current.poolDayData[0]?.volumeUSD)
      : 1

    const [volumeUSD0, volumeUSDChange] =
      current && oneDay && twoDay
        ? get2DayChange(current.volumeUSD, oneDay.volumeUSD, twoDay.volumeUSD)
        : current
        ? [parseFloat(current.volumeUSD), 0]
        : [0, 0]

    const volumeUSDWeek =
      current && week
        ? parseFloat(current.volumeUSD) - parseFloat(week.volumeUSD)
        : current
        ? parseFloat(current.volumeUSD)
        : 0

    const [feesUSD0, feesUSDChange] =
      current && oneDay && twoDay
        ? get2DayChange(current.feesUSD, oneDay.feesUSD, twoDay.feesUSD)
        : current
        ? [parseFloat(current.feesUSD), 0]
        : [0, 0]

    const tvlUSD = current ? parseFloat(current.totalValueLockedUSD) : 0

    const tvlUSDChange =
      current && oneDay
        ? ((parseFloat(current.totalValueLockedUSD) - parseFloat(oneDay.totalValueLockedUSD)) /
            parseFloat(oneDay.totalValueLockedUSD)) *
          100
        : 0

    const tvlToken0 = current ? parseFloat(current.totalValueLockedToken0) : 0
    const tvlToken1 = current ? parseFloat(current.totalValueLockedToken1) : 0

    const feeTier = current ? parseInt(current.feeTier) : 0

    const feesUSD = (feeTier * volumeUSD) / 1000000

    const decs0 = current ? parseFloat(current.token0.decimals) : 0
    const decs1 = current ? parseFloat(current.token1.decimals) : 0

    const d0 = current ? parseFloat(current.token0.derivedETH) : 1
    const d1 = current ? parseFloat(current.token1.derivedETH) : 1

    const tick = current ? parseFloat(current.tick) : 0

    const liquidity = current ? parseFloat(current.liquidity) : 0

    const tvl0ETH = current ? tvlToken0 * parseFloat(current.token0.derivedETH) : 1
    const tvl1ETH = current ? tvlToken1 * parseFloat(current.token1.derivedETH) : 1
    const totalLockedETH = current ? tvl0ETH * tvlToken0 + tvl1ETH * tvlToken1 : 1

    const feeUSD = (volumeUSD * feeTier) / 1000000

    const tvlTickToken0 = ((liquidity + 1) * feeTier * d0) / (1.0001 ** (tick / 2) * 10 ** (decs0 + 6))
    const tvlTickToken1 = ((liquidity + 1) * feeTier * d1 * 1.0001 ** (tick / 2)) / 10 ** (decs1 + 6)
    const tvlTickAvg = (tvlTickToken1 + tvlTickToken0) / 2

    const voltvl = (feeTier * volumeUSD) / (tvlUSD * 1000000)
    const volLiq = (voltvl * (tvl0ETH + tvl1ETH) * feeTier * 1.5957) / (20001 * 50 * tvlTickAvg)
    const totalLockedTick = (tvlTickAvg * tvlUSD) / (tvl0ETH + tvl1ETH)

    //const ethPrice = tvlUSD / (tvlToken1 + tvlToken0 * 1.0001 ** tick)
    const ethPrice = tvlUSD / (tvl0ETH + tvl1ETH)
    const volumeToken0 = current ? parseFloat(current.token0.derivedETH) : 0
    const volumeToken1 = current ? parseFloat(current.poolDayData[0].volumeUSD) : 0
    const volatility = (2 * feeTier * volumeUSD ** 0.5) / (10 ** 6 * totalLockedTick ** 0.5)

    if (current) {
      accum[address] = {
        address,
        feeTier,
        liquidity: parseFloat(current.liquidity),
        sqrtPrice: parseFloat(current.sqrtPrice),
        tick: parseFloat(current.tick),
        token0: {
          address: current.token0.id,
          name: formatTokenName(current.token0.id, current.token0.name),
          symbol: formatTokenSymbol(current.token0.id, current.token0.symbol),
          decimals: parseInt(current.token0.decimals),
          derivedETH: parseFloat(current.token0.derivedETH),
        },
        token1: {
          address: current.token1.id,
          name: formatTokenName(current.token1.id, current.token1.name),
          symbol: formatTokenSymbol(current.token1.id, current.token1.symbol),
          decimals: parseInt(current.token1.decimals),
          derivedETH: parseFloat(current.token1.derivedETH),
        },
        token0Price: parseFloat(current.token0Price),
        token1Price: parseFloat(current.token1Price),
        volumeUSD,
        volumeUSDChange,
        volumeUSDWeek,
        volumeToken0,
        volumeToken1,
        ethPrice,
        feeUSD,
        tvlUSD,
        tvlUSDChange,
        volLiq,
        voltvl,
        totalLockedTick,
        volatility,
        tvlToken0,
        tvlToken1,
        feesUSD,
        feesUSDChange,
        tvlTickAvg,
        tvlTickToken0,
        tvlTickToken1,
      }
    }

    return accum
  }, {})

  return {
    loading: anyLoading,
    error: anyError,
    data: formatted,
  }
}
