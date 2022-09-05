import React, { useMemo, useState, useEffect } from 'react'
import { RouteComponentProps } from 'react-router-dom'
import styled from 'styled-components'
import { useColor } from 'hooks/useColor'
import { ThemedBackground, PageWrapper } from 'pages/styled'
import { feeTierPercent, getEtherscanLink } from 'utils'
import { AutoColumn } from 'components/Column'
import { RowBetween, RowFixed, AutoRow } from 'components/Row'
import { TYPE, StyledInternalLink } from 'theme'
import { Transaction, TransactionType } from 'types'
import Loader, { LocalLoader } from 'components/Loader'
import { ExternalLink, Download } from 'react-feather'
import { ExternalLink as StyledExternalLink } from '../../theme/components'
import useTheme from 'hooks/useTheme'
import CurrencyLogo from 'components/CurrencyLogo'
import { formatDollarAmount, formatAmount, formatPercentAmount } from 'utils/numbers'
import Percent from 'components/Percent'
import { ButtonPrimary, ButtonGray, SavedIcon } from 'components/Button'
import { DarkGreyCard, GreyCard, GreyBadge } from 'components/Card'
import { usePoolDatas, usePoolChartData, usePoolTransactions } from 'state/pools/hooks'
import LineChart from 'components/LineChart/alt'
import { unixToDate } from 'utils/date'
import { ToggleWrapper, ToggleElementFree } from 'components/Toggle/index'
import BarChart from 'components/BarChart/alt'
import DoubleCurrencyLogo from 'components/DoubleLogo'
import TransactionTable from 'components/TransactionsTable'
import { useSavedPools } from 'state/user/hooks'
import DensityChart from 'components/DensityChart'
import QuestionHelper from 'components/QuestionHelper'
import { MonoSpace } from 'components/shared'
import { useActiveNetworkVersion } from 'state/application/hooks'
import { networkPrefix } from 'utils/networkPrefix'
import { EthereumNetworkInfo, ArbitrumNetworkInfo } from 'constants/networks'
import { GenericImageWrapper } from 'components/Logo'

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-gap: 1em;

  @media screen and (max-width: 800px) {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 1fr;
  }
`

const TokenButton = styled(GreyCard)`
  padding: 8px 12px;
  border-radius: 10px;
  :hover {
    cursor: pointer;
    opacity: 0.6;
  }
`

const ResponsiveRow = styled(RowBetween)`
  ${({ theme }) => theme.mediaWidth.upToSmall`
    flex-direction: column;
    align-items: flex-start;
    row-gap: 24px;
    width: 100%:
  `};
`

enum ChartView {
  TVL,
  VOL,
  FEES,
  DENSITY,
  PRICE,
  VOLATILITY,
}

export default function PoolPage({
  match: {
    params: { address },
  },
}: RouteComponentProps<{ address: string }>) {
  const [activeNetwork] = useActiveNetworkVersion()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // theming
  const backgroundColor = useColor()
  const theme = useTheme()

  // token data
  const poolData = usePoolDatas([address])[0]
  const chartData = usePoolChartData(address)
  const transactions = usePoolTransactions(address)

  const [view, setView] = useState(ChartView.PRICE)
  const [latestValue, setLatestValue] = useState<number | undefined>()
  const [valueLabel, setValueLabel] = useState<string | undefined>()
  const decimalFactor = 10 ** (poolData?.token0.decimals / 4 - poolData?.token1.decimals / 4)

  const formattedSwapData = useMemo(() => {
    if (transactions) {
      return transactions.map((txn) => {
        return {
          tick: txn.type == TransactionType.SWAP ? txn.tick : 1,
          time: txn.type == TransactionType.SWAP ? txn.timestamp : 1,
          amtUSD: txn.type == TransactionType.SWAP ? txn.amountUSD : 1,
        }
      })
    } else {
      return []
    }
  }, [transactions])

  const formattedTvlData = useMemo(() => {
    if (chartData) {
      return chartData.map((day) => {
        return {
          time: unixToDate(day.date),
          value: day.totalValueLockedUSD,
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

  const formattedVolatilityData = useMemo(() => {
    if (chartData) {
      return chartData.slice(2).map((day) => {
        return {
          time: unixToDate(day.date),
          value:
            Math.min(1 / decimalFactor, decimalFactor) *
            2 *
            365 ** 0.5 *
            (((day.feesUSD / day.volumeUSD) * day.volumeToken0 * day.token1Price ** 0.5 * 10 ** 18) / day.liquidity) **
              0.5,
        }
      })
    } else {
      return []
    }
  }, [chartData])

  const formattedFeesData = useMemo(() => {
    if (chartData) {
      return chartData.slice(2).map((day) => {
        return {
          time: unixToDate(day.date),
          valueAlt: day.feeGrowthGlobal0X128 / 2 ** 128,
          value: day.feeGrowthGlobal1X128 / 2 ** 128,
        }
      })
    } else {
      return []
    }
  }, [chartData])

  const formattedPriceData = useMemo(() => {
    if (chartData) {
      return chartData.slice(2).map((day) => {
        return {
          time: unixToDate(day.date),
          value: Math.max(1 / decimalFactor, decimalFactor) ** 4 * 1.0001 ** -day.tick,
        }
      })
    } else {
      return []
    }
  }, [chartData])

  function getStandardDeviation(array: any) {
    const n = array.length
    const mean = array.reduce((a: any, b: any) => a + b, 0) / n
    return Math.sqrt(array.map((x: any) => Math.pow(x - mean, 2)).reduce((a: any, b: any) => a + b, 0) / n)
  }
  const tickData = useMemo(() => {
    if (chartData) {
      return chartData.map((day) => {
        day.tick
      })
    } else {
      return []
    }
  }, [chartData])

  const ss = formattedPriceData.map(function (object) {
    return Math.log(object.value) / Math.log(1.0001)
  })

  const diff =
    ss.length > 28
      ? ss.slice(-29, -1).map((a, i) => a * 0.0001 - ss.slice(-28)[i] * 0.0001)
      : ss.length > 7
      ? ss.slice(-8, -1).map((a, i) => a * 0.0001 - ss.slice(-7)[i] * 0.0001)
      : [0, 0]

  const sd =
    ss.length > 28
      ? '28d realized Vol = ' + formatPercentAmount(getStandardDeviation(diff) * 365 ** 0.5)
      : ss.length > 7
      ? '7d realized Vol = ' + formatPercentAmount(getStandardDeviation(diff) * 365 ** 0.5)
      : [0, 0]

  const tt = formattedSwapData.map(function (object) {
    return object.time
  })
  const aa = formattedSwapData.map(function (object) {
    return object.amtUSD
  })
  const ii = formattedSwapData.map(function (object) {
    return object.tick
  })

  //watchlist
  const sd0 = ss.length > 1 ? getStandardDeviation(diff) * 365 ** 0.5 : 0
  const [savedPools, addSavedPool] = useSavedPools()

  return (
    <PageWrapper>
      <ThemedBackground backgroundColor={backgroundColor} />
      {poolData ? (
        <AutoColumn gap="32px">
          <RowBetween>
            <AutoRow gap="4px">
              <StyledInternalLink to={networkPrefix(activeNetwork)}>
                <TYPE.main>{`Home > `}</TYPE.main>
              </StyledInternalLink>
              <StyledInternalLink to={networkPrefix(activeNetwork) + 'pools'}>
                <TYPE.label>{` Pools `}</TYPE.label>
              </StyledInternalLink>
              <TYPE.main>{` > `}</TYPE.main>
              <TYPE.label>{` ${poolData.token0.symbol} / ${poolData.token1.symbol} ${feeTierPercent(
                poolData.feeTier
              )} `}</TYPE.label>
            </AutoRow>
            <RowFixed gap="10px" align="center">
              <SavedIcon fill={savedPools.includes(address)} onClick={() => addSavedPool(address)} />
              <StyledExternalLink href={getEtherscanLink(1, address, 'address', activeNetwork)}>
                <ExternalLink stroke={theme.text2} size={'17px'} style={{ marginLeft: '12px' }} />
              </StyledExternalLink>
            </RowFixed>
          </RowBetween>
          <ResponsiveRow align="flex-end">
            <AutoColumn gap="lg">
              <RowFixed>
                <DoubleCurrencyLogo address0={poolData.token0.address} address1={poolData.token1.address} size={24} />
                <TYPE.label
                  ml="8px"
                  mr="8px"
                  fontSize="24px"
                >{` ${poolData.token0.symbol} / ${poolData.token1.symbol} `}</TYPE.label>
                <GreyBadge>{feeTierPercent(poolData.feeTier)}</GreyBadge>
                {activeNetwork === EthereumNetworkInfo ? null : (
                  <GenericImageWrapper src={activeNetwork.imageURL} style={{ marginLeft: '8px' }} size={'26px'} />
                )}
              </RowFixed>
              <ResponsiveRow>
                <StyledInternalLink to={networkPrefix(activeNetwork) + 'tokens/' + poolData.token0.address}>
                  <TokenButton>
                    <RowFixed>
                      <CurrencyLogo address={poolData.token0.address} size={'20px'} />
                      <TYPE.label fontSize="16px" ml="4px" style={{ whiteSpace: 'nowrap' }} width={'fit-content'}>
                        {`1 ${poolData.token0.symbol} =  ${formatAmount(poolData.token1Price, 4)} ${
                          poolData.token1.symbol
                        }`}
                      </TYPE.label>
                    </RowFixed>
                  </TokenButton>
                </StyledInternalLink>
                <StyledInternalLink to={networkPrefix(activeNetwork) + 'tokens/' + poolData.token1.address}>
                  <TokenButton ml="10px">
                    <RowFixed>
                      <CurrencyLogo address={poolData.token1.address} size={'20px'} />
                      <TYPE.label fontSize="16px" ml="4px" style={{ whiteSpace: 'nowrap' }} width={'fit-content'}>
                        {`1 ${poolData.token1.symbol} =  ${formatAmount(poolData.token0Price, 4)} ${
                          poolData.token0.symbol
                        }`}
                      </TYPE.label>
                    </RowFixed>
                  </TokenButton>
                </StyledInternalLink>
              </ResponsiveRow>
            </AutoColumn>
            {activeNetwork !== EthereumNetworkInfo ? null : (
              <RowFixed>
                <StyledExternalLink
                  href={`https://app.yewbow.org/#/add/${poolData.token0.address}/${poolData.token1.address}/${poolData.feeTier}`}
                >
                  <ButtonGray width="170px" mr="12px" style={{ height: '44px' }}>
                    <RowBetween>
                      <Download size={24} />
                      <div style={{ display: 'flex', alignItems: 'center' }}>Add Liquidity</div>
                    </RowBetween>
                  </ButtonGray>
                </StyledExternalLink>
                <StyledExternalLink
                  href={`https://app.yewbow.org/#/swap?inputCurrency=${poolData.token0.address}&outputCurrency=${poolData.token1.address}`}
                >
                  <ButtonPrimary width="100px" style={{ height: '44px' }}>
                    Trade
                  </ButtonPrimary>
                </StyledExternalLink>
              </RowFixed>
            )}
          </ResponsiveRow>
          <ContentLayout>
            <DarkGreyCard>
              <AutoColumn gap="lg">
                <GreyCard padding="16px">
                  <AutoColumn gap="md">
                    <TYPE.main>Total Tokens Locked</TYPE.main>
                    <RowBetween>
                      <RowFixed>
                        <CurrencyLogo address={poolData.token0.address} size={'20px'} />
                        <TYPE.label fontSize="14px" ml="8px">
                          {poolData.token0.symbol}
                        </TYPE.label>
                      </RowFixed>
                      <TYPE.label fontSize="14px">{formatAmount(poolData.tvlToken0)}</TYPE.label>
                    </RowBetween>
                    <RowBetween>
                      <RowFixed>
                        <CurrencyLogo address={poolData.token1.address} size={'20px'} />
                        <TYPE.label fontSize="14px" ml="8px">
                          {poolData.token1.symbol}
                        </TYPE.label>
                      </RowFixed>
                      <TYPE.label fontSize="14px">{formatAmount(poolData.tvlToken1)}</TYPE.label>
                    </RowBetween>
                  </AutoColumn>
                </GreyCard>
                <AutoColumn gap="4px">
                  <TYPE.main fontWeight={400}>TVL</TYPE.main>
                  <TYPE.label fontSize="24px">{formatDollarAmount(poolData.tvlUSD)}</TYPE.label>
                  <Percent value={poolData.tvlUSDChange} />
                </AutoColumn>
                <AutoColumn gap="4px">
                  <TYPE.main fontWeight={400}>Volume 24h</TYPE.main>
                  <TYPE.label fontSize="24px">{formatDollarAmount(poolData.volumeUSD)}</TYPE.label>
                  <Percent value={poolData.volumeUSDChange} />
                </AutoColumn>
                <AutoColumn gap="4px">
                  <TYPE.main fontWeight={400}>24h Fees</TYPE.main>
                  <TYPE.label fontSize="24px">{formatDollarAmount(poolData.feesUSD)}</TYPE.label>
                </AutoColumn>
                <AutoColumn gap="4px">
                  <TYPE.main fontWeight={400}>Pool APY</TYPE.main>
                  <TYPE.label fontSize="24px">{formatAmount(poolData.voltvl * 365 * 100, 0)}%</TYPE.label>
                </AutoColumn>
              </AutoColumn>
            </DarkGreyCard>
            <DarkGreyCard>
              <RowBetween align="flex-start">
                <AutoColumn>
                  <TYPE.label fontSize="24px" height="30px">
                    <MonoSpace>
                      {latestValue
                        ? view === ChartView.VOLATILITY
                          ? formatPercentAmount(latestValue)
                          : view === ChartView.PRICE
                          ? formatAmount(latestValue)
                          : view === ChartView.TVL
                          ? formatDollarAmount(latestValue)
                          : view === ChartView.FEES
                          ? ''
                          : formatAmount(latestValue)
                        : view === ChartView.PRICE
                        ? formatAmount(formattedPriceData[formattedPriceData.length - 1]?.value)
                        : view === ChartView.VOLATILITY
                        ? formatPercentAmount(formattedVolatilityData[formattedVolatilityData.length - 1]?.value)
                        : view === ChartView.VOL
                        ? formatDollarAmount(formattedVolumeData[formattedVolumeData.length - 1]?.value)
                        : view === ChartView.DENSITY
                        ? ''
                        : ''}{' '}
                    </MonoSpace>
                  </TYPE.label>
                  <TYPE.main height="20px" fontSize="12px">
                    {valueLabel ? <MonoSpace>{valueLabel} (UTC)</MonoSpace> : ''}
                  </TYPE.main>
                </AutoColumn>
                <ToggleWrapper width="450px">
                  <ToggleElementFree
                    isActive={view === ChartView.VOL}
                    fontSize="12px"
                    onClick={() => (view === ChartView.VOL ? setView(ChartView.TVL) : setView(ChartView.VOL))}
                  >
                    Volume
                  </ToggleElementFree>
                  <ToggleElementFree
                    isActive={view === ChartView.TVL}
                    fontSize="12px"
                    onClick={() => (view === ChartView.TVL ? setView(ChartView.TVL) : setView(ChartView.TVL))}
                  >
                    TVL
                  </ToggleElementFree>
                  <ToggleElementFree
                    isActive={view === ChartView.FEES}
                    fontSize="12px"
                    onClick={() => (view === ChartView.FEES ? setView(ChartView.TVL) : setView(ChartView.FEES))}
                  >
                    Fees
                  </ToggleElementFree>
                  <ToggleElementFree
                    isActive={view === ChartView.PRICE}
                    fontSize="12px"
                    onClick={() => (view === ChartView.PRICE ? setView(ChartView.DENSITY) : setView(ChartView.PRICE))}
                  >
                    Price
                  </ToggleElementFree>
                  <ToggleElementFree
                    isActive={view === ChartView.VOLATILITY}
                    fontSize="12px"
                    onClick={() =>
                      view === ChartView.VOLATILITY ? setView(ChartView.VOLATILITY) : setView(ChartView.VOLATILITY)
                    }
                  >
                    Impl. Vol. <QuestionHelper text={'IV = 2*feeTier* √(Volume/TickTVL)'} />
                  </ToggleElementFree>
                  {activeNetwork === ArbitrumNetworkInfo ? null : (
                    <ToggleElementFree
                      isActive={view === ChartView.DENSITY}
                      fontSize="12px"
                      onClick={() => (view === ChartView.DENSITY ? setView(ChartView.VOL) : setView(ChartView.DENSITY))}
                    >
                      Liquidity
                    </ToggleElementFree>
                  )}
                </ToggleWrapper>
              </RowBetween>
              {view === ChartView.TVL ? (
                <LineChart
                  data={formattedTvlData}
                  setLabel={setValueLabel}
                  color={backgroundColor}
                  minHeight={340}
                  setValue={setLatestValue}
                  yAxisLabel={'TVL'}
                  value={latestValue}
                  label={valueLabel}
                />
              ) : view === ChartView.VOL ? (
                <BarChart
                  data={formattedVolumeData}
                  color={backgroundColor}
                  minHeight={340}
                  setValue={setLatestValue}
                  setLabel={setValueLabel}
                  value={latestValue}
                  label={valueLabel}
                />
              ) : view === ChartView.PRICE ? (
                <LineChart
                  data={formattedPriceData}
                  color={backgroundColor}
                  minHeight={340}
                  setValue={setLatestValue}
                  setLabel={setValueLabel}
                  value={latestValue}
                  label={valueLabel}
                  yAxisLabel={poolData.token0.symbol + ' per ' + poolData.token1.symbol}
                />
              ) : view === ChartView.FEES ? (
                <LineChart
                  data={formattedFeesData}
                  color={backgroundColor}
                  minHeight={340}
                  yAxisLabel={'feeGrowthGlobal (' + poolData.token0.symbol + ')'}
                  yAxisLabelAlt={'feeGrowthGlobal (' + poolData.token1.symbol + ')'}
                  setValue={setLatestValue}
                  setLabel={setValueLabel}
                  value={latestValue}
                  label={valueLabel}
                />
              ) : view === ChartView.VOLATILITY ? (
                <LineChart
                  data={formattedVolatilityData}
                  color={backgroundColor}
                  minHeight={340}
                  yAxisLabel={'Impl. Vol'}
                  referenceLine={sd0}
                  setValue={setLatestValue}
                  setLabel={setValueLabel}
                  value={latestValue}
                  label={valueLabel}
                />
              ) : (
                <DensityChart address={address} />
              )}
            </DarkGreyCard>
          </ContentLayout>
          <TYPE.main fontSize="24px">Transactions</TYPE.main>
          <DarkGreyCard>
            {transactions ? <TransactionTable transactions={transactions} /> : <LocalLoader fill={false} />}
          </DarkGreyCard>
        </AutoColumn>
      ) : (
        <Loader />
      )}
    </PageWrapper>
  )
}
