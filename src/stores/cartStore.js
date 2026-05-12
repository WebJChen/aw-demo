import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

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

const normalizeLoadedItem = (item) => {
  if (!item || typeof item !== 'object') return null
  const sourceHitKey = normalizeText(item.sourceHitKey)
  const fallbackCartId = normalizeText(item.cartId) || `${normalizeText(item.regionPath, 'unknown')}__${normalizeText(item.subNavPath, 'unknown')}__${normalizeText(item.title, 'unknown')}`
  return {
    ...item,
    cartId: sourceHitKey || fallbackCartId,
    quantity: Math.max(1, Number(item.quantity) || 1),
    selected: item.selected === true,
    sourceHitKey
  }
}

export const useCartStore = defineStore('cart', () => {
  const loadCartItems = () => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (!Array.isArray(parsed)) return []
        return parsed.map(normalizeLoadedItem).filter(Boolean)
      }
    } catch (error) {
      console.error('加载购物车数据失败:', error)
    }
    return []
  }

  const saveCartItems = (items) => {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('保存购物车数据失败:', error)
    }
  }

  const cartItems = ref(loadCartItems())

  watch(cartItems, (newVal) => {
    saveCartItems(newVal)
  }, { deep: true })

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

  // 购物车仅允许加入带有 cartTestEnabled 标记的测试酒款，避免与其它业务数据联动
  const addCartItem = ({ item, regionPath, regionName, subNavPath, subNavName, quantity = 1 }) => {
    if (!item?.cartTestEnabled) return 'invalid'

    const addQuantity = Math.max(1, Number(quantity) || 1)
    const title = normalizeText(item.title, '测试酒款')
    const sourceHitKey = normalizeText(item?.__hitKey || item?.sourceHitKey)
    const cartId = buildCartId({ regionPath, subNavPath, title, sourceHitKey })
    const existed = cartItems.value.find((cartItem) => cartItem.cartId === cartId)
    if (existed) {
      existed.quantity += addQuantity
      existed.title = title
      existed.enTitle = normalizeText(item.enTitle)
      existed.desc = extractDesc(item)
      existed.img = normalizeText(item.img)
      existed.price = Number(item.testPrice) || existed.price || DEFAULT_PRICE
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
      price: Number(item.testPrice) || DEFAULT_PRICE,
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
    cartItems.value = cartItems.value.filter((item) => item.cartId !== cartId)
  }

  const clearCart = () => {
    cartItems.value = []
  }

  const removeSelectedItems = () => {
    cartItems.value = cartItems.value.filter((item) => !item.selected)
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
