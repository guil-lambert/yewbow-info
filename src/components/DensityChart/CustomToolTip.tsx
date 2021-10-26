import React from 'react'
import { PoolData } from 'state/pools/reducer'
import styled from 'styled-components'
import { LightCard } from 'components/Card'
import useTheme from 'hooks/useTheme'
import { AutoColumn } from 'components/Column'
import { TYPE } from 'theme'
import { RowBetween } from 'components/Row'
import { formatAmount } from 'utils/numbers'

const TooltipWrapper = styled(LightCard)`
  padding: 12px;
  width: 320px;
  opacity: 0.6;
  font-size: 12px;
  z-index: 10;
`

interface CustomToolTipProps {
  chartProps: any
  poolData: PoolData
  currentPrice: number | undefined
}

export function CustomToolTip({ chartProps, poolData, currentPrice }: CustomToolTipProps) {
  const theme = useTheme()
  const price0 = chartProps?.payload?.[0]?.payload.price0
  const price1 = chartProps?.payload?.[0]?.payload.price1
  const tvlToken0 = chartProps?.payload?.[0]?.payload.tvlToken0
  const tvlToken1 = chartProps?.payload?.[0]?.payload.tvlToken1
  
  const tvl0ETH = poolData?.token0.derivedETH
  const tvl1ETH = poolData?.token1.derivedETH

  const voltvl = (poolData?.feeTier * poolData?.volumeUSD) / (poolData?.tvlUSD * 1000000)  

  const decs0 = poolData ? (poolData?.token0.decimals) : 0
  const decs1 = poolData ? (poolData?.token1.decimals) : 0

  const tvlTick = (tvlToken0 * tvl0ETH + tvlToken1 * tvl1ETH) / 2 

  const totalLockedETH = poolData ? tvl0ETH * poolData.tvlToken0 + tvl1ETH * poolData.tvlToken1 : 1

  const LPret = (voltvl * totalLockedETH * poolData.feeTier * 1.5957 * 100) / (20001 * 50 * tvlTick * 0.05)	
  
  const holdRatio = poolData?.volumeUSD / (tvlTick * poolData?.tvlUSD / totalLockedETH)


  return (
    <TooltipWrapper>
      <AutoColumn gap="sm">
        <TYPE.main color={theme.text3}>Tick stats</TYPE.main>
       <RowBetween>
          <TYPE.label>LP/√day: </TYPE.label>
          <TYPE.label>
	  {formatAmount(LPret)}%
          </TYPE.label>
        </RowBetween>
       <RowBetween>
          <TYPE.label>Hold ratio: </TYPE.label>
          <TYPE.label>
	  {formatAmount(holdRatio)}
          </TYPE.label>
        </RowBetween>
        <RowBetween>
          <TYPE.label>Value Locked: </TYPE.label>
          <TYPE.label>
	  {formatAmount(tvlTick)} ETH
          </TYPE.label>
        </RowBetween>
        <RowBetween>
          <TYPE.label>{poolData?.token0?.symbol} Price: </TYPE.label>
          <TYPE.label>
            {price0
              ? Number(price0).toLocaleString(undefined, {
                  minimumSignificantDigits: 1,
                })
              : ''}{' '}
            {poolData?.token1?.symbol}
          </TYPE.label>
        </RowBetween>
         <RowBetween>
          <TYPE.label>{poolData?.token1?.symbol} Price: </TYPE.label>
          <TYPE.label>
            {price1
              ? Number(price1).toLocaleString(undefined, {
                  minimumSignificantDigits: 1,
                })
              : ''}{' '}
            {poolData?.token0?.symbol}
          </TYPE.label>
        </RowBetween>
      </AutoColumn>
    </TooltipWrapper>
  )
}

export default CustomToolTip
