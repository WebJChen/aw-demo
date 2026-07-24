let navJsonCache = null

const itemRegionCache = new Map()

const wineRegionCache = new Map()



let navJsonPromise = null

const itemRegionPromiseCache = new Map()

const wineRegionPromiseCache = new Map()



let wineRegionPathsPromise = null

let allWineRegionsPromise = null

let searchManifestPromise = null

let shardManifestPromise = null

const searchShardPromiseCache = new Map()

const itemSubNavChunkPromiseCache = new Map()

const wineSubNavChunkPromiseCache = new Map()

const searchShardModules = import.meta.glob('@/data/split/catalog/**/*.json')



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



async function getShardManifest() {

  if (shardManifestPromise) return shardManifestPromise

  shardManifestPromise = import('@/data/split/shard-manifest.json')

    .then((mod) => (mod?.default && typeof mod.default === 'object' ? mod.default : null))

    .catch(() => null)

  return shardManifestPromise

}



function isShardedCatalogRegion(manifest, catalogType, regionPath) {

  const bucket = manifest?.[catalogType]

  if (!bucket || typeof bucket !== 'object') return false

  return Array.isArray(bucket[regionPath]) && bucket[regionPath].length > 0

}



async function loadItemSubNavChunk(regionPath, subNavPath) {

  const key = `${regionPath}::${subNavPath}`

  if (itemSubNavChunkPromiseCache.has(key)) return itemSubNavChunkPromiseCache.get(key)

  const promise = import(`@/data/split/item/${regionPath}/${subNavPath}.json`)

    .then((mod) => (mod?.default && typeof mod.default === 'object' ? mod.default : null))

    .catch(() => null)

  itemSubNavChunkPromiseCache.set(key, promise)

  return promise

}



async function loadWineSubNavChunk(regionPath, subNavPath) {

  const key = `${regionPath}::${subNavPath}`

  if (wineSubNavChunkPromiseCache.has(key)) return wineSubNavChunkPromiseCache.get(key)

  const promise = import(`@/data/split/wine/${regionPath}/${subNavPath}.json`)

    .then((mod) => (mod?.default && typeof mod.default === 'object' ? mod.default : null))

    .catch(() => null)

  wineSubNavChunkPromiseCache.set(key, promise)

  return promise

}



function mergeSubNavChunk(region, subNavPath, chunk) {

  if (!region || !chunk) return region

  const subNavList = Array.isArray(region.subNavList)

    ? region.subNavList.map((subNav) => {

      if (subNav?.subNavPath !== subNavPath) {

        return { ...subNav, itemData: Array.isArray(subNav?.itemData) ? subNav.itemData : [] }

      }

      return {

        ...subNav,

        subNavName: chunk.subNavName ?? subNav.subNavName,

        isShow: chunk.isShow ?? subNav.isShow,

        itemData: Array.isArray(chunk.itemData) ? chunk.itemData : [],

      }

    })

    : []

  return { ...region, subNavList }

}



async function hydrateItemRegionSubNavs(region, subNavPaths = []) {

  if (!region?.sharded || !subNavPaths.length) return region

  let hydrated = region

  for (const subNavPath of subNavPaths) {

    const chunk = await loadItemSubNavChunk(region.path, subNavPath)

    if (chunk) hydrated = mergeSubNavChunk(hydrated, subNavPath, chunk)

  }

  return hydrated

}



async function hydrateWineRegionSubNavs(region, subNavPaths = []) {

  if (!region?.sharded || !subNavPaths.length) return region

  let hydrated = region

  for (const subNavPath of subNavPaths) {

    const chunk = await loadWineSubNavChunk(region.path, subNavPath)

    if (chunk) hydrated = mergeSubNavChunk(hydrated, subNavPath, chunk)

  }

  return hydrated

}



async function getItemRegionByPath(regionPath, { subNavPath, hydrateAll = false } = {}) {

  const key = String(regionPath || '').trim()

  if (!key) return null



  const cacheKey = `${key}::${subNavPath || ''}::${hydrateAll ? 'all' : 'shell'}`

  if (itemRegionCache.has(cacheKey)) return itemRegionCache.get(cacheKey)



  if (!itemRegionPromiseCache.has(key)) {

    itemRegionPromiseCache.set(

      key,

      import(`@/data/split/item/${key}.json`)

        .then((mod) => (mod?.default && typeof mod.default === 'object' ? mod.default : null))

        .catch(() => null)

    )

  }



  const shell = await itemRegionPromiseCache.get(key)

  if (!shell) {

    itemRegionCache.set(cacheKey, null)

    return null

  }



  let result = shell

  if (shell.sharded) {

    const manifest = await getShardManifest()

    let paths = []

    if (hydrateAll) {

      paths = isShardedCatalogRegion(manifest, 'item', key)

        ? manifest.item[key]

        : (shell.subNavList || []).map((sn) => sn?.subNavPath).filter(Boolean)

    } else if (subNavPath) {

      paths = [subNavPath]

    }

    if (paths.length) {

      result = await hydrateItemRegionSubNavs(shell, paths)

    }

  }



  itemRegionCache.set(cacheKey, result)

  return result

}



async function getWineRegionPaths() {

  if (wineRegionPathsPromise) return wineRegionPathsPromise

  wineRegionPathsPromise = import('@/data/split/wine-regions.json')

    .then((mod) => (Array.isArray(mod?.default) ? mod.default : []))

    .catch(() => [])

  return wineRegionPathsPromise

}



async function loadWineRegionsByPaths(paths = [], options = {}) {

  const list = Array.isArray(paths) ? paths.filter(Boolean) : []

  if (!list.length) return []

  const regions = await Promise.all(list.map((path) => getWineRegionByPath(path, options)))

  return regions.filter(Boolean)

}



/** @deprecated 全国一次性加载；请改用 catalogRepository.loadWineRegions({ statePaths }) */

async function getAllWineRegions() {

  if (allWineRegionsPromise) return allWineRegionsPromise

  allWineRegionsPromise = getWineRegionPaths()

    .then((paths) => loadWineRegionsByPaths(paths, { hydrateAll: true }))

    .catch(() => [])

  return allWineRegionsPromise

}



async function getWineRegionByPath(regionPath, { subNavPath, hydrateAll = false } = {}) {

  const key = String(regionPath || '').trim()

  if (!key) return null



  const cacheKey = `${key}::${subNavPath || ''}::${hydrateAll ? 'all' : 'shell'}`

  if (wineRegionCache.has(cacheKey)) return wineRegionCache.get(cacheKey)



  if (!wineRegionPromiseCache.has(key)) {

    wineRegionPromiseCache.set(

      key,

      import(`@/data/split/wine/${key}.json`)

        .then((mod) => (mod?.default && typeof mod.default === 'object' ? mod.default : null))

        .catch(() => null)

    )

  }



  const shell = await wineRegionPromiseCache.get(key)

  if (!shell) {

    wineRegionCache.set(cacheKey, null)

    return null

  }



  let result = shell

  if (shell.sharded) {

    const manifest = await getShardManifest()

    let paths = []

    if (hydrateAll) {

      paths = isShardedCatalogRegion(manifest, 'wine', key)

        ? manifest.wine[key]

        : (shell.subNavList || []).map((sn) => sn?.subNavPath).filter(Boolean)

    } else if (subNavPath) {

      paths = [subNavPath]

    }

    if (paths.length) {

      result = await hydrateWineRegionSubNavs(shell, paths)

    }

  }



  wineRegionCache.set(cacheKey, result)

  return result

}



async function getSearchManifest() {

  if (searchManifestPromise) return searchManifestPromise

  searchManifestPromise = import('@/data/split/catalog/search-manifest.json')

    .then((mod) => (mod?.default && typeof mod.default === 'object' ? mod.default : null))

    .catch(() => null)

  return searchManifestPromise

}



async function getSearchShard(shard) {
  const file = shard?.file || ''
  if (!file) return []
  if (searchShardPromiseCache.has(file)) return searchShardPromiseCache.get(file)
  const moduleKey = Object.keys(searchShardModules).find((key) => key.replace(/\\/g, '/').endsWith(`/catalog/${file}`))
  if (!moduleKey || !searchShardModules[moduleKey]) {
    searchShardPromiseCache.set(file, Promise.resolve([]))
    return []
  }
  const promise = searchShardModules[moduleKey]()
    .then((mod) => (Array.isArray(mod?.default) ? mod.default : []))
    .catch(() => [])
  searchShardPromiseCache.set(file, promise)
  return promise
}



/** @deprecated 请改用 getSearchShard(shard) */

async function getSearchShardLegacy(regionPath, sourceType) {

  return getSearchShard({ file: `search/${regionPath}-${sourceType}.json` })

}



async function getSearchIndex() {

  const manifest = await getSearchManifest()

  if (!manifest?.shards?.length) return []



  const shardGroups = await Promise.all(

    manifest.shards.map((shard) => getSearchShard(shard))

  )

  return shardGroups.flat()

}



export {

  getNavData,

  getShardManifest,

  getItemRegionByPath,

  getWineRegionByPath,

  getWineRegionPaths,

  loadWineRegionsByPaths,

  getAllWineRegions,

  getSearchManifest,

  getSearchShard,

  getSearchShardLegacy,

  getSearchIndex,

  hydrateWineRegionSubNavs,

  hydrateItemRegionSubNavs,

}

