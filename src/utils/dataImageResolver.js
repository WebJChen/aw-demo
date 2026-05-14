import defaultImg from '@/assets/img/default.png'
import defaultThumb from '@/assets/.optimized/img/default.thumb.webp'

const baseAssetModules = import.meta.glob('/src/assets/**/*.{png,jpg,jpeg,JPG,JPEG,gif,webp,svg,avif,AVIF}', {
  eager: true,
  import: 'default'
})

const optimizedAssetModules = import.meta.glob('/src/assets/.optimized/**/*.{webp,avif,AVIF}', {
  eager: true,
  import: 'default'
})

const assetModules = {
  ...baseAssetModules,
  ...optimizedAssetModules
}

const lowerFileNameAssetMap = Object.entries(assetModules).reduce((acc, [key, value]) => {
  const fileName = key.split('/').pop()?.toLowerCase()
  if (fileName && !acc[fileName]) {
    acc[fileName] = value
  }
  return acc
}, {})

const normalizeAssetPath = (inputPath) => {
  const raw = String(inputPath || '').trim()
  if (!raw) return ''

  // 兼容误拼写 ../assetes
  const normalizedRaw = raw.replace(/^(\.\.\/)assetes\//, '$1assets/')

  if (normalizedRaw.startsWith('/src/assets/')) return normalizedRaw
  if (normalizedRaw.startsWith('/assets/')) return `/src${normalizedRaw}`
  if (normalizedRaw.startsWith('assets/')) return `/src/${normalizedRaw}`
  if (normalizedRaw.startsWith('@/assets/')) return `/src/assets/${normalizedRaw.slice('@/assets/'.length)}`
  if (normalizedRaw.startsWith('../assets/')) return `/src/assets/${normalizedRaw.slice('../assets/'.length)}`

  return ''
}

const resolveAssetModule = (inputPath) => {
  const normalized = normalizeAssetPath(inputPath)
  if (!normalized) return ''

  const directMatch = assetModules[normalized]
  if (directMatch) return directMatch

  const fileName = normalized.split('/').pop()?.toLowerCase()
  if (!fileName) return ''

  return lowerFileNameAssetMap[fileName] || ''
}

const getOptimizedAssetPath = (normalizedAssetPath, variant = 'thumb') => {
  if (!normalizedAssetPath.startsWith('/src/assets/')) return ''
  const relativePath = normalizedAssetPath.slice('/src/assets/'.length)
  const lastDotIndex = relativePath.lastIndexOf('.')
  if (lastDotIndex <= 0) return ''
  const pathWithoutExt = relativePath.slice(0, lastDotIndex)
  return `/src/assets/.optimized/${pathWithoutExt}.${variant}.webp`
}

const DEFAULT_FALLBACK = defaultThumb || defaultImg

const resolveDataImage = (inputPath, fallback = DEFAULT_FALLBACK, options = {}) => {
  const raw = String(inputPath || '').trim()
  if (!raw) return fallback

  if (/^(https?:|data:|blob:)/i.test(raw)) return raw

  const variant = String(options?.variant || 'original').trim().toLowerCase()
  const normalized = normalizeAssetPath(raw)
  if (normalized && variant !== 'original') {
    const optimizedPath = getOptimizedAssetPath(normalized, variant)
    const optimizedUrl = resolveAssetModule(optimizedPath)
    if (optimizedUrl) return optimizedUrl
  }

  const moduleUrl = resolveAssetModule(raw)
  if (moduleUrl) return moduleUrl

  // gh-pages 子路径部署兼容：/assets/... 需要补上 BASE_URL
  if (raw.startsWith('/assets/')) {
    return `${import.meta.env.BASE_URL}${raw.slice(1)}`
  }
  if (raw.startsWith('/')) return raw

  return fallback
}

export { resolveDataImage, resolveAssetModule }
