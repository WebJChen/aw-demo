const SITE_NAME = 'AusWine'
const DEFAULT_TITLE = 'AusWine · 澳洲葡萄酒与酒庄目录'
const DEFAULT_DESCRIPTION = '浏览澳大利亚各州酒庄与酒款，含产区、城镇、品鉴说明与在售酒款。当前为 gh-pages 演示站，暂不对外开放收录。'
const PLACEHOLDER_DESC_RE = /^(描述\d+|文本\d+|待补充|待修改|详细介绍正在整理中)/i

export function getSiteOrigin() {
  const fromEnv = String(import.meta.env.VITE_SITE_ORIGIN || '').trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

export function getAppBasePath() {
  const base = String(import.meta.env.BASE_URL || '/')
  return base.endsWith('/') ? base : `${base}/`
}

export function toAbsoluteUrl(pathOrUrl = '') {
  const value = String(pathOrUrl || '').trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  if (value.startsWith('//')) {
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'https:'
    return `${protocol}${value}`
  }
  const origin = getSiteOrigin()
  const base = getAppBasePath()
  let path = value.startsWith('/') ? value : `/${value}`
  if (path !== base && path !== base.slice(0, -1) && !path.startsWith(base)) {
    path = `${base}${path.replace(/^\//, '')}`
  }
  const href = origin ? `${origin}${path}` : path
  return href.replace(/([^:]\/)\/+/g, '$1')
}

export function toAbsoluteAssetUrl(src = '') {
  const value = String(src || '').trim()
  if (!value || value.startsWith('data:') || value.startsWith('blob:')) {
    return getDefaultOgImageUrl()
  }
  return toAbsoluteUrl(value) || getDefaultOgImageUrl()
}

/** History 模式：canonical = origin + pathname + search（不含 hash） */
export function getCanonicalUrl() {
  if (typeof window === 'undefined') return ''
  const origin = getSiteOrigin()
  const path = window.location.pathname || getAppBasePath()
  const search = window.location.search || ''
  return `${origin}${path}${search}`
}

export function getDefaultOgImageUrl() {
  const origin = getSiteOrigin()
  const base = getAppBasePath()
  if (!origin) return `${base}og-default.png`
  return `${origin}${base}og-default.png`.replace(/([^:]\/)\/+/g, '$1')
}

export function clipSeoText(value, fallback = DEFAULT_DESCRIPTION, max = 220) {
  const raw = String(value || '').replace(/\s+/g, ' ').trim()
  if (!raw || PLACEHOLDER_DESC_RE.test(raw)) {
    return String(fallback || DEFAULT_DESCRIPTION).slice(0, max)
  }
  return raw.slice(0, max)
}

function upsertMeta(attr, key, content) {
  if (typeof document === 'undefined') return
  const selector = `meta[${attr}="${key}"]`
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content || '')
}

function applyCanonical(href) {
  if (typeof document === 'undefined') return
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href || '')
}

export function applyPageSeo({
  title = '',
  description = '',
  image = '',
  noindex = true,
} = {}) {
  const pageTitle = String(title || '').trim()
  const fullTitle = pageTitle
    ? (pageTitle.includes(SITE_NAME) ? pageTitle : `${pageTitle} | ${SITE_NAME}`)
    : DEFAULT_TITLE
  const desc = clipSeoText(description, DEFAULT_DESCRIPTION)
  const canonical = getCanonicalUrl()
  const ogImage = image ? toAbsoluteAssetUrl(image) : getDefaultOgImageUrl()
  document.title = fullTitle
  upsertMeta('name', 'description', desc)
  upsertMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow')
  upsertMeta('property', 'og:title', fullTitle)
  upsertMeta('property', 'og:description', desc)
  upsertMeta('property', 'og:type', 'website')
  upsertMeta('property', 'og:site_name', SITE_NAME)
  upsertMeta('property', 'og:locale', 'zh_CN')
  if (canonical) upsertMeta('property', 'og:url', canonical)
  if (ogImage) {
    upsertMeta('property', 'og:image', ogImage)
    upsertMeta('name', 'twitter:image', ogImage)
    upsertMeta('name', 'twitter:card', 'summary_large_image')
  } else {
    upsertMeta('name', 'twitter:card', 'summary')
  }
  upsertMeta('name', 'twitter:title', fullTitle)
  upsertMeta('name', 'twitter:description', desc)
  applyCanonical(canonical)
}

export function applyPrivatePageSeo(title, description) {
  applyPageSeo({
    title,
    description,
    noindex: true,
  })
}

const WINERY_JSONLD_ID = 'aw-winery-jsonld'
const SITE_JSONLD_ID = 'aw-site-jsonld'
const LIST_JSONLD_ID = 'aw-itemlist-jsonld'

export function applyJsonLd(id, data) {
  if (typeof document === 'undefined') return
  removeJsonLd(id)
  if (!id || !data || typeof data !== 'object') return
  const el = document.createElement('script')
  el.id = id
  el.type = 'application/ld+json'
  el.textContent = JSON.stringify(data)
  document.head.appendChild(el)
}

export function removeJsonLd(id) {
  if (typeof document === 'undefined' || !id) return
  document.getElementById(id)?.remove()
}

export function applyWineryJsonLd(model, image) {
  if (!model?.title) {
    removeJsonLd(WINERY_JSONLD_ID)
    return
  }
  const desc = clipSeoText(model.intro, `${model.title}，澳洲酒庄。`)
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Winery',
    name: model.title,
    description: desc,
    url: getCanonicalUrl(),
  }
  if (model.enTitle) data.alternateName = model.enTitle
  if (image) data.image = toAbsoluteAssetUrl(image)
  const locality = String(model.townLabel || '').trim()
  const region = String(model.regionLabel || '').trim()
  if (locality && locality !== '暂未分类城镇' && locality !== '暂未分类') {
    data.address = {
      '@type': 'PostalAddress',
      addressLocality: locality,
      addressCountry: 'AU',
    }
    if (region && region !== '暂未分类') data.address.addressRegion = region
  }
  applyJsonLd(WINERY_JSONLD_ID, data)
}

export function clearWineryJsonLd() {
  removeJsonLd(WINERY_JSONLD_ID)
}

export function applyCatalogListJsonLd({ name = '', items = [], itemUrlBuilder } = {}) {
  const origin = getSiteOrigin()
  const siteUrl = origin ? `${origin}${getAppBasePath()}` : getCanonicalUrl()
  applyJsonLd(SITE_JSONLD_ID, {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: siteUrl,
    description: DEFAULT_DESCRIPTION,
  })
  const listName = String(name || '').trim() || SITE_NAME
  const listItems = (Array.isArray(items) ? items : []).slice(0, 24)
  applyJsonLd(LIST_JSONLD_ID, {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    url: getCanonicalUrl(),
    numberOfItems: listItems.length,
    itemListElement: listItems.map((item, index) => {
      const nameText = String(item?.name || item?.title || '').trim()
      const row = {
        '@type': 'ListItem',
        position: index + 1,
        name: nameText,
      }
      const url = typeof itemUrlBuilder === 'function' ? itemUrlBuilder(item, index) : ''
      if (url) row.url = url
      return row
    }),
  })
}

export function clearCatalogListJsonLd() {
  removeJsonLd(SITE_JSONLD_ID)
  removeJsonLd(LIST_JSONLD_ID)
}

export { DEFAULT_TITLE, DEFAULT_DESCRIPTION, SITE_NAME }
