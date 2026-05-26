import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { buildWineDisplay, resolveWineCartUnitPrice } from '@/utils/wineGridExtras'
import { createDemoPinnedCartRows, isDemoPinnedCartId } from '@/utils/demoStaticCartShowcase'

const DEFAULT_PRICE = 188
const STORAGE_KEY = 'aw_cart_items'
const MAX_CART_ITEMS = 500

const normalizeText = (value, fallback = '') => {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return fallback
}

const extractDesc = (item) => {
  if (typeof item?.desc === 'string' && item.desc.trim()) return item.desc.trim()
  if (typeof item?.wineData?.desc === 'string' && item.wineData.desc.trim()) return item.wineData.desc.trim()
  if (typeof item?.info?.desc === 'string' && item.info.desc.trim()) return item.info.desc.trim()
  return ''
}

/** 与网格 `buildWineDisplay` 一致的产地 / 年份，用于购物车文案 */
const extractWineOriginVintage = (item, cartRegionNavName) => {
  const d = buildWineDisplay(item, { regionNavName: typeof cartRegionNavName === 'string' ? cartRegionNavName : '' })
  const o = String(d?.origin ?? '').trim()
  const v = String(d?.vintage ?? '').trim()
  return {
    wineOrigin: normalizeText(o, ''),
    wineVintage: normalizeText(v, '')
  }
}

const normalizeLoadedItem = (item) => {
  if (!item || typeof item !== 'object') return null
  const sourceHitKey = normalizeText(item.sourceHitKey)
  const fallbackCartId = normalizeText(item.cartId) || `${normalizeText(item.regionPath, 'unknown')}__${normalizeText(item.subNavPath, 'unknown')}__${normalizeText(item.title, 'unknown')}`
  return {
    ...item,
    cartId: sourceHitKey || fallbackCartId,
    quantity: Math.max(1, Number(item.quantity) || 1),
    selected: item.selected === true,
    sourceHitKey,
    demoPersistent: item.demoPersistent === true
  }
}

export const useCartStore = defineStore('cart', () => {
  /** 仅从 localStorage 读取（过滤内置演示 cartId，避免与种子重复） */
  const loadStoredCartOnly = () => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return []
      return parsed
        .map(normalizeLoadedItem)
        .filter(Boolean)
        .filter((item) => !isDemoPinnedCartId(item.cartId))
    } catch (error) {
      console.error('加载购物车数据失败:', error)
    }
    return []
  }

  const mergeWithDemoPinnedRows = () => [
    ...createDemoPinnedCartRows(),
    ...loadStoredCartOnly()
  ]

  const savePersistedSlice = (items) => {
    if (typeof window === 'undefined') return
    try {
      const payload = items.filter((item) => !item.demoPersistent)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (error) {
      console.error('保存购物车数据失败:', error)
    }
  }

  const cartItems = ref(mergeWithDemoPinnedRows())

  watch(
    cartItems,
    (newVal) => {
      savePersistedSlice(newVal)
    },
    { deep: true }
  )

  const totalQuantity = computed(() => {
    return cartItems.value.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
  })

  const totalAmount = computed(() => {
    return cartItems.value.reduce((sum, item) => {
      const price = Number(item.price) || 0
      const quantity = Number(item.quantity) || 0
      return sum + (price * quantity)
    }, 0)
  })

  // 被勾选的条目代表用户有购买倾向
  const selectedCount = computed(() => {
    return cartItems.value.filter((item) => item.selected).length
  })

  const selectedQuantity = computed(() => {
    return cartItems.value.reduce((sum, item) => {
      if (!item.selected) return sum
      return sum + (Number(item.quantity) || 0)
    }, 0)
  })

  const selectedAmount = computed(() => {
    return cartItems.value.reduce((sum, item) => {
      if (!item.selected) return sum
      const price = Number(item.price) || 0
      const quantity = Number(item.quantity) || 0
      return sum + (price * quantity)
    }, 0)
  })

  const selectedItems = computed(() => cartItems.value.filter((item) => item.selected))

  const isAllSelected = computed(() => {
    return cartItems.value.length > 0 && cartItems.value.every((item) => item.selected)
  })

  const buildCartId = ({ regionPath, subNavPath, title, sourceHitKey = '' }) => {
    if (sourceHitKey) return sourceHitKey
    return `${regionPath || 'unknown'}__${subNavPath || 'unknown'}__${title || 'unknown'}`
  }

  /** 酒款网格 / 类目酒庄等条目均可加购（无后端，本地 Pinia）；无标题则拒绝 */
  const addCartItem = ({
    item,
    regionPath,
    regionName,
    subNavPath,
    subNavName,
    quantity = 1,
    cartRegionNavName = ''
  }) => {
    if (!item || typeof item !== 'object') return 'invalid'
    const rawTitle =
      normalizeText(item.title, '') ||
      normalizeText(item.dialogInfoTitle || item.dialogTitle || item.name || item.cnTitle, '')
    if (!rawTitle) return 'invalid'

    const addQuantity = Math.max(1, Number(quantity) || 1)
    const title = rawTitle || '商品'
    const sourceHitKey = normalizeText(item?.__hitKey || item?.sourceHitKey)
    const cartId = buildCartId({ regionPath, subNavPath, title, sourceHitKey })
    const unitPrice = resolveWineCartUnitPrice(item, { regionNavName: cartRegionNavName })
    const { wineOrigin, wineVintage } = extractWineOriginVintage(item, cartRegionNavName)

    const existed = cartItems.value.find((cartItem) => cartItem.cartId === cartId)
    if (existed) {
      existed.quantity += addQuantity
      existed.title = title
      existed.enTitle = normalizeText(item.enTitle)
      existed.desc = extractDesc(item)
      existed.img = normalizeText(item.img)
      existed.price = unitPrice || existed.price || DEFAULT_PRICE
      existed.wineOrigin = wineOrigin || existed.wineOrigin || ''
      existed.wineVintage = wineVintage || existed.wineVintage || ''
      existed.regionPath = normalizeText(regionPath) || existed.regionPath
      existed.regionName = normalizeText(regionName) || existed.regionName
      existed.subNavPath = normalizeText(subNavPath) || existed.subNavPath
      existed.subNavName = normalizeText(subNavName) || existed.subNavName
      existed.sourceHitKey = sourceHitKey || existed.sourceHitKey || ''
      return 'success'
    }

    if (cartItems.value.length >= MAX_CART_ITEMS) {
      return 'limit'
    }

    cartItems.value.unshift({
      cartId,
      title,
      enTitle: normalizeText(item.enTitle),
      desc: extractDesc(item),
      img: normalizeText(item.img),
      wineOrigin,
      wineVintage,
      price: unitPrice || DEFAULT_PRICE,
      quantity: addQuantity,
      regionPath: normalizeText(regionPath),
      regionName: normalizeText(regionName),
      subNavPath: normalizeText(subNavPath),
      subNavName: normalizeText(subNavName),
      addedAt: Date.now(),
      selected: false,
      sourceHitKey
    })
    return 'success'
  }

  const updateQuantity = (cartId, quantity) => {
    const target = cartItems.value.find((item) => item.cartId === cartId)
    if (!target) return
    target.quantity = Math.max(1, Number(quantity) || 1)
  }

  const removeCartItem = (cartId) => {
    if (isDemoPinnedCartId(cartId)) return
    cartItems.value = cartItems.value.filter((item) => item.cartId !== cartId)
  }

  const clearCart = () => {
    cartItems.value = createDemoPinnedCartRows()
  }

  /**
   * 移除已勾选的普通商品（模拟支付成功后）；内置演示备货始终保留，并取消其勾选以免影响下次。
   */
  const removeSelectedItems = () => {
    cartItems.value = cartItems.value.filter(
      (item) => item.demoPersistent || !item.selected
    )
    cartItems.value.forEach((item) => {
      if (item.demoPersistent) item.selected = false
    })
  }

  const setItemSelected = (cartId, selected) => {
    const target = cartItems.value.find((item) => item.cartId === cartId)
    if (!target) return
    target.selected = !!selected
  }

  const setAllSelected = (selected) => {
    const nextSelected = !!selected
    cartItems.value.forEach((item) => {
      item.selected = nextSelected
    })
  }

  return {
    cartItems,
    MAX_CART_ITEMS,
    totalQuantity,
    totalAmount,
    selectedCount,
    selectedQuantity,
    selectedAmount,
    selectedItems,
    isAllSelected,
    addCartItem,
    updateQuantity,
    removeCartItem,
    clearCart,
    removeSelectedItems,
    setItemSelected,
    setAllSelected
  }
})
