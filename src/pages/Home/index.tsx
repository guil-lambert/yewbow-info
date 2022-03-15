import React, { useState, useEffect, useMemo } from 'react'
import styled from 'styled-components'
import { AutoColumn } from 'components/Column'
import { TYPE } from 'theme'
import { ResponsiveRow, RowBetween, RowFixed } from 'components/Row'
import LineChart from 'components/LineChart/alt'
import useTheme from 'hooks/useTheme'
import {
  useProtocolData,
  useProtocolChartData,
  useProtocolTransactions,
  useAggregateOverviewData,
} from 'state/protocol/hooks'
import { DarkGreyCard } from 'components/Card'
import { formatDollarAmount } from 'utils/numbers'
import Percent from 'components/Percent'
import { HideMedium, HideSmall, StyledInternalLink } from '../../theme/components'
import TokenTable from 'components/tokens/TokenTable'
import PoolTable from 'components/pools/PoolTable'
import { PageWrapper, ThemedBackgroundGlobal } from 'pages/styled'
import { unixToDate } from 'utils/date'
import BarChart from 'components/BarChart/alt'
import { useAllPoolData, usePoolDatas } from 'state/pools/hooks'
import { notEmpty } from 'utils'
import TransactionsTable from '../../components/TransactionsTable'
import { useAllTokenData } from 'state/tokens/hooks'
import { useSavedPools } from 'state/user/hooks'
import { MonoSpace } from 'components/shared'
import { useActiveNetworkVersion } from 'state/application/hooks'

const ChartWrapper = styled.div`
  width: 49%;

  ${({ theme }) => theme.mediaWidth.upToSmall`
    width: 100%;
  `};
`

export default function Home() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const theme = useTheme()

  useAggregateOverviewData()

  const [activeNetwork] = useActiveNetworkVersion()

  const [protocolData] = useProtocolData()
  const [chartData] = useProtocolChartData()
  const [transactions] = useProtocolTransactions()

  const [volumeHover, setVolumeHover] = useState<number | undefined>()
  const [liquidityHover, setLiquidityHover] = useState<number | undefined>()
  const [leftLabel, setLeftLabel] = useState<string | undefined>()
  const [rightLabel, setRightLabel] = useState<string | undefined>()

  useEffect(() => {
    setLiquidityHover(undefined)
    setVolumeHover(undefined)
  }, [activeNetwork])

  // get all the pool datas that exist
  const allPoolData = useAllPoolData()
  const poolDatas = useMemo(() => {
    return Object.values(allPoolData)
      .map((p) => p.data)
      .filter(notEmpty)
  }, [allPoolData])

  // if hover value undefined, reset to current day value
  useEffect(() => {
    if (!volumeHover && protocolData) {
      setVolumeHover(protocolData.volumeUSD)
    }
  }, [protocolData, volumeHover])
  useEffect(() => {
    if (!liquidityHover && protocolData) {
      setLiquidityHover(protocolData.tvlUSD)
    }
  }, [liquidityHover, protocolData])

  const formattedTvlData = useMemo(() => {
    if (chartData) {
      return chartData.map((day) => {
        return {
          time: unixToDate(day.date),
          value: day.tvlUSD,
        }
      })
    } else {
      return []
    }
  }, [chartData])

  const formattedVolumeData = useMemo(() => {
    if (chartData) {
      return chartData.map((day) => {
        return {
          time: unixToDate(day.date),
          value: day.volumeUSD,
        }
      })
    } else {
      return []
    }
  }, [chartData])

  const allTokens = useAllTokenData()

  const formattedTokens = useMemo(() => {
    return Object.values(allTokens)
      .map((t) => t.data)
      .filter(notEmpty)
  }, [allTokens])

  const [savedPools] = useSavedPools()
  const watchlistPools = usePoolDatas(savedPools)

  const [listOfItems, setListOfItems] = React.useState([
    { name: '0.01%', isChecked: true },
    { name: '0.05%', isChecked: true },
    { name: '0.3%', isChecked: true },
    { name: '1% |', isChecked: true },
    { name: 'Remove low liquidity tokens |', isChecked: true },
    { name: 'Only ETH pairs', isChecked: false },
    { name: 'Only stablecoin pairs |', isChecked: false },
    { name: 'IV > 100%', isChecked: false },
  ])

  const updateListOfItems = (itemIndex: number, newsChecked: boolean) => {
    const updatedListOfItems = [...listOfItems]
    updatedListOfItems[itemIndex].isChecked = newsChecked
    setListOfItems(updatedListOfItems)
  }
  const filteredPoolDatas = poolDatas.filter(
    (obj) =>
      (obj.feeTier == (listOfItems[0].isChecked ? 100 : 0) ||
        obj.feeTier == (listOfItems[1].isChecked ? 500 : 0) ||
        obj.feeTier == (listOfItems[2].isChecked ? 3000 : 0) ||
        obj.feeTier == (listOfItems[3].isChecked ? 10000 : 0)) &&
      (listOfItems[4].isChecked ? obj.totalLockedTick > 1000 : true) &&
      (listOfItems[5].isChecked ? obj.token0.symbol == 'ETH' || obj.token1.symbol == 'ETH' : true) &&
      (listOfItems[6].isChecked
        ? obj.token0.symbol == 'USDC' ||
          obj.token1.symbol == 'USDC' ||
          obj.token0.symbol == 'DAI' ||
          obj.token1.symbol == 'DAI' ||
          obj.token0.symbol == 'RAI' ||
          obj.token1.symbol == 'RAI' ||
          obj.token0.symbol == 'USDT' ||
          obj.token1.symbol == 'USDT'
        : true) &&
      (listOfItems[7].isChecked ? obj.volatility * 365 ** 0.5 * 100 >= 100 : true)
  )

  return (
    <PageWrapper>
      <ThemedBackgroundGlobal backgroundColor={activeNetwork.bgColor} />
      <AutoColumn gap="16px">
        <AutoColumn gap="lg">
          <TYPE.main>Your Watchlist</TYPE.main>
          {watchlistPools.length > 0 ? (
            <PoolTable poolDatas={watchlistPools} />
          ) : (
            <DarkGreyCard>
              <TYPE.main>Saved pools will appear here</TYPE.main>
            </DarkGreyCard>
          )}
        </AutoColumn>
        <HideSmall>
          <DarkGreyCard>
            <RowBetween>
              <RowFixed>
                <RowFixed mr="20px">
                  <TYPE.main mr="4px">Volume 24H: </TYPE.main>
                  <TYPE.label mr="4px">{formatDollarAmount(protocolData?.volumeUSD)}</TYPE.label>
                  <Percent value={protocolData?.volumeUSDChange} wrap={true} />
                </RowFixed>
                <RowFixed mr="20px">
                  <TYPE.main mr="4px">Fees 24H: </TYPE.main>
                  <TYPE.label mr="4px">{formatDollarAmount(protocolData?.feesUSD)}</TYPE.label>
                  <Percent value={protocolData?.feeChange} wrap={true} />
                </RowFixed>
                <HideMedium>
                  <RowFixed mr="20px">
                    <TYPE.main mr="4px">TVL: </TYPE.main>
                    <TYPE.label mr="4px">{formatDollarAmount(protocolData?.tvlUSD)}</TYPE.label>
                    <TYPE.main></TYPE.main>
                    <Percent value={protocolData?.tvlUSDChange} wrap={true} />
                  </RowFixed>
                </HideMedium>
              </RowFixed>
            </RowBetween>
          </DarkGreyCard>
        </HideSmall>
        <RowBetween>
          <TYPE.main>Top Tokens</TYPE.main>
          <StyledInternalLink to="tokens">Explore</StyledInternalLink>
        </RowBetween>
        <TokenTable tokenDatas={formattedTokens} />
        <RowBetween>
          <TYPE.main>
            Top Pools ({filteredPoolDatas.length}/{poolDatas.length})
          </TYPE.main>
          <StyledInternalLink to="pools">Explore</StyledInternalLink>
        </RowBetween>
        <div>
          Select:
          {listOfItems.map((item, index) => (
            <label key={index}>
              {' '}
              <input
                key={index}
                type="checkbox"
                checked={item.isChecked}
                onChange={() => updateListOfItems(index, !item.isChecked)}
              />{' '}
              {item.name}{' '}
            </label>
          ))}
        </div>
        <PoolTable poolDatas={filteredPoolDatas} />
        <RowBetween>
          <TYPE.main>Transactions</TYPE.main>
        </RowBetween>
        {transactions ? <TransactionsTable transactions={transactions} color={activeNetwork.primaryColor} /> : null}
      </AutoColumn>
    </PageWrapper>
  )
}
