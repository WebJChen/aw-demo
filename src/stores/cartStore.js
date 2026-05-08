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

export const useCartStore = defineStore('cart', () => {
  const loadCartItems = () => {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
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

  const buildCartId = ({ regionPath, subNavPath, title }) => {
    return `${regionPath || 'unknown'}__${subNavPath || 'unknown'}__${title || 'unknown'}`
  }

  // 购物车仅允许加入带有 cartTestEnabled 标记的测试酒款，避免与其它业务数据联动
  const addCartItem = ({ item, regionPath, regionName, subNavPath, subNavName, quantity = 1 }) => {
    if (!item?.cartTestEnabled) return 'invalid'

    const addQuantity = Math.max(1, Number(quantity) || 1)
    const title = normalizeText(item.title, '测试酒款')
    const cartId = buildCartId({ regionPath, subNavPath, title })
    const existed = cartItems.value.find((cartItem) => cartItem.cartId === cartId)
    if (existed) {
      existed.quantity += addQuantity
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
      addedAt: Date.now()
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

  return {
    cartItems,
    MAX_CART_ITEMS,
    totalQuantity,
    totalAmount,
    addCartItem,
    updateQuantity,
    removeCartItem,
    clearCart
  }
})
