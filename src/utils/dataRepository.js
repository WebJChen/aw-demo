let itemJsonCache = null
let wineJsonCache = null
let navJsonCache = null
const itemRegionCache = new Map()
const wineRegionCache = new Map()

let itemJsonPromise = null
let wineJsonPromise = null
let navJsonPromise = null
const itemRegionPromiseCache = new Map()
const wineRegionPromiseCache = new Map()

async function getItemJson() {
  if (Array.isArray(itemJsonCache)) return itemJsonCache
  if (!itemJsonPromise) {
    itemJsonPromise = import('@/data/item.json')
      .then((mod) => {
        itemJsonCache = Array.isArray(mod?.default) ? mod.default : []
        return itemJsonCache
      })
      .catch(() => {
        itemJsonCache = []
        return itemJsonCache
      })
  }
  return itemJsonPromise
}

async function getWineJson() {
  if (Array.isArray(wineJsonCache)) return wineJsonCache
  if (!wineJsonPromise) {
    wineJsonPromise = import('@/data/wine.json')
      .then((mod) => {
        wineJsonCache = Array.isArray(mod?.default) ? mod.default : []
        return wineJsonCache
      })
      .catch(() => {
        wineJsonCache = []
        return wineJsonCache
      })
  }
  return wineJsonPromise
}

async function getNavData() {
  if (Array.isArray(navJsonCache)) return navJsonCache
  if (!navJsonPromise) {
    navJsonPromise = import('@/data/split/nav.json')
      .then((mod) => {
        navJsonCache = Array.isArray(mod?.default) ? mod.default : []
        return navJsonCache
      })
      .catch(() => {
        navJsonCache = []
        return navJsonCache
      })
  }
  return navJsonPromise
}

async function getItemRegionByPath(regionPath) {
  const key = String(regionPath || '').trim()
  if (!key) return null
  if (itemRegionCache.has(key)) return itemRegionCache.get(key)
  if (!itemRegionPromiseCache.has(key)) {
    itemRegionPromiseCache.set(
      key,
      import(`@/data/split/item/${key}.json`)
        .then((mod) => {
          const region = mod?.default && typeof mod.default === 'object' ? mod.default : null
          itemRegionCache.set(key, region)
          return region
        })
        .catch(() => {
          itemRegionCache.set(key, null)
          return null
        })
    )
  }
  return itemRegionPromiseCache.get(key)
}

let allWineRegionsPromise = null

async function getAllWineRegions() {
  if (allWineRegionsPromise) return allWineRegionsPromise
  allWineRegionsPromise = import('@/data/split/wine-regions.json')
    .then((mod) => {
      const paths = Array.isArray(mod?.default) ? mod.default : []
      return Promise.all(paths.map((path) => getWineRegionByPath(path)))
    })
    .then((regions) => regions.filter(Boolean))
    .catch(() => [])
  return allWineRegionsPromise
}

async function getWineRegionByPath(regionPath) {
  const key = String(regionPath || '').trim()
  if (!key) return null
  if (wineRegionCache.has(key)) return wineRegionCache.get(key)
  if (!wineRegionPromiseCache.has(key)) {
    wineRegionPromiseCache.set(
      key,
      import(`@/data/split/wine/${key}.json`)
        .then((mod) => {
          const region = mod?.default && typeof mod.default === 'object' ? mod.default : null
          wineRegionCache.set(key, region)
          return region
        })
        .catch(() => {
          wineRegionCache.set(key, null)
          return null
        })
    )
  }
  return wineRegionPromiseCache.get(key)
}

export { getItemJson, getWineJson, getNavData, getItemRegionByPath, getWineRegionByPath, getAllWineRegions }
