import defaultImg from '@/assets/img/default.png'

const assetModules = import.meta.glob('/src/assets/**/*.{png,jpg,jpeg,JPG,JPEG,gif,webp,svg}', {
  eager: true,
  import: 'default'
})

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

  const fuzzyKey = Object.keys(assetModules).find((key) => key.toLowerCase().endsWith(`/${fileName}`))
  return fuzzyKey ? assetModules[fuzzyKey] : ''
}

const resolveDataImage = (inputPath, fallback = defaultImg) => {
  const raw = String(inputPath || '').trim()
  if (!raw) return fallback

  if (/^(https?:|data:|blob:)/i.test(raw)) return raw

  const moduleUrl = resolveAssetModule(raw)
  if (moduleUrl) return moduleUrl

  // gh-pages 子路径部署兼容：/assets/... 需要补上 BASE_URL
  if (raw.startsWith('/assets/')) {
    return `${import.meta.env.BASE_URL}${raw.slice(1)}`
  }
  if (raw.startsWith('/')) return raw

  return fallback
}

export { resolveDataImage }
