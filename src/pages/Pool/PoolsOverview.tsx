import React, { useEffect, useMemo } from 'react'
import { PageWrapper } from 'pages/styled'
import { AutoColumn } from 'components/Column'
import { TYPE, HideSmall } from 'theme'
import PoolTable from 'components/pools/PoolTable'
import { useAllPoolData, usePoolDatas } from 'state/pools/hooks'
import { notEmpty } from 'utils'
import { useSavedPools } from 'state/user/hooks'
import { DarkGreyCard } from 'components/Card'
import TopPoolMovers from 'components/pools/TopPoolMovers'

export default function PoolPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // get all the pool datas that exist
  const allPoolData = useAllPoolData()
  const poolDatas = useMemo(() => {
    return Object.values(allPoolData)
      .map((p) => p.data)
      .filter(notEmpty)
  }, [allPoolData])

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
    { name: 'IVR > 20', isChecked: false },
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
      (listOfItems[4].isChecked ? obj.totalLockedTick > 100 && obj.volumeUSD > 0 : true) &&
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
      (listOfItems[7].isChecked ? obj.ivrank >= 20 : true)
  )
  return (
    <PageWrapper>
      <AutoColumn gap="lg">
        <TYPE.main>Your Watchlist</TYPE.main>
        {watchlistPools.length > 0 ? (
          <PoolTable poolDatas={watchlistPools} />
        ) : (
          <DarkGreyCard>
            <TYPE.main>Saved pools will appear here</TYPE.main>
          </DarkGreyCard>
        )}
        <HideSmall>
          <DarkGreyCard style={{ paddingTop: '12px' }}>
            <AutoColumn gap="md">
              <TYPE.mediumHeader fontSize="16px">Trending by IVR</TYPE.mediumHeader>
              <TopPoolMovers />
            </AutoColumn>
          </DarkGreyCard>
        </HideSmall>
        <TYPE.main>
          Filtered Pools ({filteredPoolDatas.length}/{poolDatas.length})
        </TYPE.main>
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
      </AutoColumn>
    </PageWrapper>
  )
}
