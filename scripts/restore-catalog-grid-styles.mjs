import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const orig = execSync('git show HEAD:src/views/ItemGrid.vue', { cwd: root, encoding: 'utf8' })

const start = orig.indexOf('<style scoped lang="scss">') + '<style scoped lang="scss">'.length
const end = orig.indexOf('</style>', start)
let css = orig.slice(start, end)

css = css.replace(/:deep\(([^)]+)\)/g, '$1')
css = css.replace(/z-index:\s*v-bind\('Z_INDEX\.page\.floatingPagination'\)/g, 'z-index: 100')

function removeBlock(text, pattern) {
  const m = text.match(pattern)
  if (!m) return text
  const i = m.index
  const braceStart = text.indexOf('{', i)
  let depth = 0
  let j = braceStart
  for (; j < text.length; j++) {
    if (text[j] === '{') depth++
    if (text[j] === '}') {
      depth--
      if (depth === 0) {
        j++
        break
      }
    }
  }
  return (text.slice(0, i) + text.slice(j)).replace(/\n{3,}/g, '\n\n')
}

css = removeBlock(css, /^\.subnav-box/m)
css = removeBlock(css, /^\/\* PC端子导航/m)

css += `

.info-list--winery .info-item.info-item--nav-menu .nav-menu-name:has(.nav-menu-name-text:hover) .nav-menu-wine-icon {
  transform: none;
}
.info-list--winery .info-item.info-item--nav-menu .nav-menu-name-text:hover {
  color: inherit;
  border-bottom-color: transparent;
}
.wine-filter-toolbar--winery {
  grid-template-columns: minmax(220px, 1.3fr) minmax(128px, 0.72fr) auto;
}
@media (max-width: 640px) {
  .wine-filter-toolbar--winery {
    grid-template-columns: 1fr;
  }
}
`

const outPath = path.join(root, 'src/styles/catalogGridShell.scss')
fs.writeFileSync(outPath, `/* ItemGrid git HEAD 共享网格样式（不含子导航） */\n${css.trim()}\n`, 'utf8')

let brace = 0
for (const ch of css) {
  if (ch === '{') brace++
  if (ch === '}') brace--
}

console.log('written', outPath)
console.log('chars', css.length, 'brace', brace, 'promo', css.includes('promo-chip'))
