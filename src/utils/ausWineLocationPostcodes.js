export const UNCATEGORIZED_LOCATION = '暂未分类'

/** 排序模式常量 */
export const SORT_MODES = {
  POSTCODE: 'postcode',
  NAME_EN: 'nameEn',
  NAME_ZH: 'nameZh',
}

/** 排序模式显示标签 */
export const SORT_MODE_LABELS = {
  [SORT_MODES.POSTCODE]: '按邮编排序',
  [SORT_MODES.NAME_EN]: '按英文名排序',
  [SORT_MODES.NAME_ZH]: '按中文名排序',
}

/** 全澳酒庄/产区地点邮编目录（示例数据，后续补充） */
export const AUS_WINE_LOCATION_POSTCODES = [
  // ===== 北领地 NT =====
  { label: 'Darwin 0800', town: 'Darwin', postcode: '0800', nameZh: '达尔文' },
  { label: 'Katherine 0850', town: 'Katherine', postcode: '0850', nameZh: '凯瑟琳' },
  { label: 'Alice Springs 0870', town: 'Alice Springs', postcode: '0870', nameZh: '艾丽斯斯普林斯' },

  // ===== 新南威尔士州 NSW =====
  { label: 'Hunter Valley 2320', town: 'Hunter Valley', postcode: '2320', nameZh: '猎人谷' },
  { label: 'Southern Highlands 2576', town: 'Southern Highlands', postcode: '2576', nameZh: '南部高地' },
  // ===== 首都领地 ACT =====
  { label: 'Murrumbateman 2582', town: 'Murrumbateman', postcode: '2582', nameZh: '马拉巴德曼' },
  { label: 'Canberra District 2600', town: 'Canberra District', postcode: '2600', nameZh: '堪培拉产区' },
  // ===== 新南威尔士州 NSW（续）=====
  { label: 'Orange 2800', town: 'Orange', postcode: '2800', nameZh: '奥兰治' },
  { label: 'Mudgee 2850', town: 'Mudgee', postcode: '2850', nameZh: '马奇' },

  // ===== 维多利亚州 VIC =====
  { label: 'Heathcote 3523', town: 'Heathcote', postcode: '3523', nameZh: '希思科特' },
  { label: 'Rutherglen 3685', town: 'Rutherglen', postcode: '3685', nameZh: '拉瑟格伦' },
  { label: 'Yarra Valley 3770', town: 'Yarra Valley', postcode: '3770', nameZh: '雅拉谷' },
  { label: 'Mornington Peninsula 3931', town: 'Mornington Peninsula', postcode: '3931', nameZh: '莫宁顿半岛' },

  // ===== 昆士兰州 QLD =====
  { label: 'Gold Coast Hinterland 4211', town: 'Gold Coast Hinterland', postcode: '4211', nameZh: '黄金海岸腹地' },
  { label: 'Brisbane Valley 4311', town: 'Brisbane Valley', postcode: '4311', nameZh: '布里斯班谷' },
  { label: 'Granite Belt 4380', town: 'Granite Belt', postcode: '4380', nameZh: '花岗岩带' },

  // ===== 南澳大利亚州 SA =====
  { label: 'Adelaide Hills 5152', town: 'Adelaide Hills', postcode: '5152', nameZh: '阿德莱德山' },
  { label: 'McLaren Vale 5171', town: 'McLaren Vale', postcode: '5171', nameZh: '麦克拉伦谷' },
  { label: 'Barossa Valley 5352', town: 'Barossa Valley', postcode: '5352', nameZh: '巴罗萨谷' },
  { label: 'Clare Valley 5453', town: 'Clare Valley', postcode: '5453', nameZh: '克莱尔谷' },

  // ===== 西澳大利亚州 WA =====
  { label: 'Swan Valley 6055', town: 'Swan Valley', postcode: '6055', nameZh: '天鹅谷' },
  { label: 'Margaret River 6285', town: 'Margaret River', postcode: '6285', nameZh: '玛格丽特河' },
  { label: 'Great Southern 6330', town: 'Great Southern', postcode: '6330', nameZh: '大南部' },

  // ===== 塔斯马尼亚州 TAS =====
  { label: 'Hobart 7000', town: 'Hobart', postcode: '7000', nameZh: '霍巴特' },
  { label: 'Coal River Valley 7140', town: 'Coal River Valley', postcode: '7140', nameZh: '科尔河谷' },
  { label: 'Launceston 7250', town: 'Launceston', postcode: '7250', nameZh: '朗塞斯顿' },
  { label: 'Port Sorell 7307', town: 'Port Sorell', postcode: '7307', nameZh: '索雷尔港' },
]

/**
 * 构建排序映射表
 * 邮编模式：按 postcode 数字排序，同邮编按 label 字母排序
 * 英文名/中文名模式：按 town 首字母分组排序
 */
function buildOrderMap(mode) {
  const sorted = [...AUS_WINE_LOCATION_POSTCODES].sort((a, b) => {
    if (mode === SORT_MODES.POSTCODE) {
      const numA = parseInt(a.postcode, 10)
      const numB = parseInt(b.postcode, 10)
      if (numA !== numB) return numA - numB
    } else if (mode === SORT_MODES.NAME_ZH) {
      const cmp = (a.nameZh || a.town).localeCompare((b.nameZh || b.town), 'zh-Hans-CN')
      if (cmp !== 0) return cmp
    } else {
      const keyA = (a.town || '').charAt(0).toUpperCase()
      const keyB = (b.town || '').charAt(0).toUpperCase()
      if (keyA !== keyB) return keyA.localeCompare(keyB, 'en')
    }
    return a.label.localeCompare(b.label, 'en')
  })
  const map = new Map()
  sorted.forEach((item, idx) => map.set(item.label, idx))
  return map
}

/**
 * 从 wine 条目中读取 locationLabel
 * 优先从 item 根级读取，其次从 wineData 读取
 */
function getLocationLabelFromItem(item) {
  const wineData = item?.wineData && typeof item.wineData === 'object' ? item.wineData : {}
  return String(item?.locationLabel || wineData.locationLabel || '').trim()
}

/**
 * 解析 wine 条目的地点标签，返回 "地名 邮编" 格式或 "暂未分类"
 */
export function resolveLocationLabel(item) {
  const fromData = getLocationLabelFromItem(item)
  if (fromData) {
    const parts = String(fromData).trim().split(/\s+/)
    const postcode = parts.length >= 2 ? parts[parts.length - 1] : ''
    if (/^\d{4}$/.test(postcode)) return fromData
  }
  return UNCATEGORIZED_LOCATION
}

/**
 * 获取排序序号
 */
export function getLocationSortOrder(item, mode = SORT_MODES.POSTCODE) {
  const label = resolveLocationLabel(item)
  if (label === UNCATEGORIZED_LOCATION) return 9999
  const orderMap = buildOrderMap(mode)
  if (orderMap.has(label)) return orderMap.get(label)
  return 9998
}

/**
 * 获取分组用的 town
 */
export function getGroupingTownFromItem(item) {
  const wineData = item?.wineData && typeof item.wineData === 'object' ? item.wineData : {}
  return String(item?.town || wineData.town || '').trim()
}

/**
 * 构建 Cascader 懒加载数据
 * 仅包含当前条目中实际使用的地名+邮编标签
 */
export function createLocationLazyLoad(items = [], mode = SORT_MODES.POSTCODE) {
  const categorizedLabels = new Set()
  let hasUncategorized = false

  items.forEach((item) => {
    const label = resolveLocationLabel(item)
    if (!label) return
    if (label === UNCATEGORIZED_LOCATION) {
      hasUncategorized = true
      return
    }
    categorizedLabels.add(label)
  })

  const orderMap = buildOrderMap(mode)
  const sortedLabels = Array.from(categorizedLabels).sort((left, right) => {
    const leftOrder = orderMap.has(left) ? orderMap.get(left) : 9998
    const rightOrder = orderMap.has(right) ? orderMap.get(right) : 9998
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return left.localeCompare(right, 'en')
  })

  const isPostcodeMode = mode === SORT_MODES.POSTCODE

  // 按第一级 key 分组
  const groupMap = new Map()
  sortedLabels.forEach((label) => {
    const parts = String(label).trim().split(/\s+/)
    const postcode = parts.length >= 2 ? parts[parts.length - 1] : ''

    let firstLevelKey
    if (isPostcodeMode) {
      firstLevelKey = postcode
    } else {
      const townName = parts.length >= 2 ? parts.slice(0, -1).join(' ') : label
      firstLevelKey = townName.charAt(0).toUpperCase()
    }

    if (!firstLevelKey) return

    if (!groupMap.has(firstLevelKey)) {
      groupMap.set(firstLevelKey, [])
    }
    groupMap.get(firstLevelKey).push(label)
  })

  // 第一级排序
  const firstLevelKeys = Array.from(groupMap.keys()).sort((a, b) => {
    if (isPostcodeMode) {
      const numA = parseInt(a, 10)
      const numB = parseInt(b, 10)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    }
    return a.localeCompare(b, 'en')
  })

  if (hasUncategorized) {
    firstLevelKeys.push(UNCATEGORIZED_LOCATION)
  }

  return function lazyLoad(node, resolve) {
    if (node.level === 0) {
      resolve(firstLevelKeys.map((key) => {
        const isUncategorized = key === UNCATEGORIZED_LOCATION
        return {
          value: key,
          label: key,
          leaf: isUncategorized,
        }
      }))
    } else {
      const locations = groupMap.get(node.value) || []
      resolve(locations.map((loc) => ({
        value: loc,
        label: getLocationDisplayLabel(loc, mode),
        leaf: true,
      })))
    }
  }
}

/**
 * 获取地点显示标签（中文模式时附加中文名）
 * @param {string} label - 原始标签，如 "Hobart 7000"
 * @param {string} mode - 排序模式
 * @returns {string} 显示标签，如 "霍巴特 Hobart 7000"
 */
export function getLocationDisplayLabel(label, mode = SORT_MODES.POSTCODE) {
  if (!label || label === UNCATEGORIZED_LOCATION) return label
  if (mode !== SORT_MODES.NAME_ZH) return label
  const entry = AUS_WINE_LOCATION_POSTCODES.find((e) => e.label === label)
  if (entry && entry.nameZh) {
    return `${entry.nameZh} ${label}`
  }
  return label
}

/**
 * 根据 locationLabel 反查 town
 */
export function getTownByLocationLabel(label) {
  if (!label) return ''
  const found = AUS_WINE_LOCATION_POSTCODES.find((item) => item.label === label)
  return found ? found.town : ''
}