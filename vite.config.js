import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'
import path from 'path'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

const SEO_STATE_PATHS = [
  'tasmania',
  'new-south-wales',
  'south-australia',
  'western-australia',
  'victoria',
  'queensland',
  'northern-territory',
  'canberra',
]

const SEO_WINE_SUB_NAV = [
  'red-wine',
  'white-wine',
  'sparkling-wine',
  'whisky',
  'other-spirits',
  'cider',
]

const SEO_WINERY_SUB_NAV = ['wineries', 'Spirits', 'spirits', 'other-spirits']

function joinPublicUrl(origin, base, routePath) {
  const o = String(origin || '').replace(/\/+$/, '')
  let b = String(base || '/')
  if (!b.startsWith('/')) b = `/${b}`
  if (!b.endsWith('/')) b = `${b}/`
  const p = String(routePath || '').replace(/^\//, '')
  return `${o}${b}${p}`
}

function listSeoHubPaths() {
  const paths = ['', 'wine', ...SEO_WINE_SUB_NAV.map((sub) => `wine/${sub}`)]
  SEO_STATE_PATHS.forEach((state) => {
    SEO_WINERY_SUB_NAV.forEach((sub) => {
      paths.push(`winery/${state}/${sub}`)
    })
  })
  return paths
}

function listWineryDetailPaths() {
  const itemJsonPath = path.resolve('src/data/item.json')
  if (!fs.existsSync(itemJsonPath)) return []
  let regions = []
  try {
    const parsed = JSON.parse(fs.readFileSync(itemJsonPath, 'utf8'))
    regions = Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
  const paths = []
  for (const region of regions) {
    const regionPath = String(region?.path || '').trim()
    if (!regionPath) continue
    for (const sub of region.subNavList || []) {
      if (sub?.isShow === false) continue
      const subNavPath = String(sub?.subNavPath || '').trim()
      if (!subNavPath) continue
      const items = Array.isArray(sub.itemData)
        ? sub.itemData
        : (Array.isArray(sub.info) ? sub.info : [])
      items.forEach((_, idx) => {
        paths.push(`winery/${regionPath}/${subNavPath}/winery__${regionPath}__${subNavPath}__${idx}`)
      })
    }
  }
  return paths
}

function seoBuildPlugin(env) {
  return {
    name: 'awo-seo-build',
    closeBundle() {
      const dist = path.resolve('dist')
      // 保留 public/404.html 的 gh-pages ?/ 回退，不要用 index.html 覆盖
      // 构建 sitemap 用公开站点 Origin；不把 .env 推进仓库
      const origin = String(env.VITE_SITE_ORIGIN || 'https://webjchen.github.io').trim().replace(/\/+$/, '')
      const base = env.VITE_APP_BASE || '/aw-demo/'
      if (!origin || !fs.existsSync(dist)) return
      const urls = [...listSeoHubPaths(), ...listWineryDetailPaths()]
        .map((hub) => `  <url><loc>${joinPublicUrl(origin, base, hub)}</loc></url>`)
        .join('\n')
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
      fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const appBase = env.VITE_APP_BASE || '/aw-demo/'

  return {
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [ElementPlusResolver({ importStyle: 'sass' })],
      }),
      seoBuildPlugin(env),
    ],
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/element-theme.scss" as *;`,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    base: appBase,
    server: {
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8080',
          changeOrigin: true,
        },
      },
    },
  }
})
