// ============================================================
//  Forest Brew — Zustand Cart Store
// ============================================================

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import type { CartItem, CartCustomization, ProductCategory } from '@/types'

interface CartStore {
  items: CartItem[]
  isOpen: boolean

  // Actions
  openCart: () => void
  closeCart: () => void
  toggleCart: () => void

  addItem: (
    product: {
      id: string
      name: string
      basePrice: number
      imageUrl: string
      category?: ProductCategory
    },
    customization?: CartCustomization
  ) => void

  removeItem: (cartItemId: string) => void

  updateQuantity: (cartItemId: string, delta: number) => void

  updateInstructions: (cartItemId: string, instructions: string) => void

  clearCart: () => void

  // Computed
  totalItems: () => number
  totalPrice: () => number // in paise
}

// Calculate the extra price added by customizations
function calcCustomizationPrice(
  customization: CartCustomization,
  category?: ProductCategory,
  productName?: string
): number {
  let extra = 0
  const isFoodOnly = category === 'FOOD'
  const isCombo = category === 'RESERVE' && productName && productName.toLowerCase().includes('sandwich') && productName.toLowerCase().includes('latte')

  // Calculate food extra if category is FOOD or it is a combo
  if (isFoodOnly || isCombo) {
    const foodSizePrices: Record<string, number> = {
      regular: 0,
      large: 5000, // ₹50
    }
    if (customization.foodSize && foodSizePrices[customization.foodSize] !== undefined) {
      extra += foodSizePrices[customization.foodSize]
    }
    const foodAddonPrices: Record<string, number> = {
      extra_cheese: 3000, // ₹30
      gluten_free: 4000,  // ₹40
    }
    if (customization.foodAddons) {
      customization.foodAddons.forEach((addon) => {
        if (foodAddonPrices[addon] !== undefined) {
          extra += foodAddonPrices[addon]
        }
      })
    }
  }

  // Calculate drink extra if category is NOT FOOD or it is a combo
  if (!isFoodOnly || isCombo) {
    const milkPrices: Record<string, number> = {
      oat: 4000,     // ₹40
      almond: 5000,  // ₹50
      soy: 4000,     // ₹40
      coconut: 5000, // ₹50
      whole: 0,
      skimmed: 0,
    }
    if (customization.milk && milkPrices[customization.milk] !== undefined) {
      extra += milkPrices[customization.milk]
    }
    const syrupPrice = 3000 // ₹30 per syrup
    if (customization.syrups) {
      extra += customization.syrups.length * syrupPrice
    }
    const sizePrices: Record<string, number> = {
      tall: 0,
      grande: 5000,  // ₹50
      venti: 10000,  // ₹100
    }
    if (customization.size && sizePrices[customization.size] !== undefined) {
      extra += sizePrices[customization.size]
    }
  }

  return extra
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      addItem: (product, customization = {}) => {
        const category = product.category
        let finalCustomization = customization
        const isCombo = category === 'RESERVE' && product.name.toLowerCase().includes('sandwich') && product.name.toLowerCase().includes('latte')
        
        if (isCombo) {
          finalCustomization = {
            foodWarming: customization.foodWarming || 'not_warmed',
            foodSize: customization.foodSize || 'regular',
            foodAddons: customization.foodAddons || [],
            milk: customization.milk || 'whole',
            syrups: customization.syrups || [],
            temperature: customization.temperature || 'hot',
            size: customization.size || 'tall',
          }
        } else if (category === 'FOOD') {
          finalCustomization = {
            foodWarming: customization.foodWarming || 'not_warmed',
            foodSize: customization.foodSize || 'regular',
            foodAddons: customization.foodAddons || [],
          }
        }
        const customizationPrice = calcCustomizationPrice(finalCustomization, category, product.name)
        const randomId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15)
        const newItem: CartItem = {
          id: randomId,
          productId: product.id,
          name: product.name,
          basePrice: product.basePrice,
          imageUrl: product.imageUrl,
          quantity: 1,
          category,
          customization: finalCustomization,
          customizationPrice,
          lineTotal: product.basePrice + customizationPrice,
        }
        set((state) => ({ items: [...state.items, newItem] }))
      },

      removeItem: (cartItemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== cartItemId),
        })),

      updateQuantity: (cartItemId, delta) =>
        set((state) => {
          const updated = state.items
            .map((item) => {
              if (item.id !== cartItemId) return item
              const newQty = item.quantity + delta
              if (newQty <= 0) return null
              return {
                ...item,
                quantity: newQty,
                lineTotal: (item.basePrice + item.customizationPrice) * newQty,
              }
            })
            .filter(Boolean) as CartItem[]
          return { items: updated }
        }),

      updateInstructions: (cartItemId, instructions) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === cartItemId
              ? {
                  ...item,
                  customization: {
                    ...item.customization,
                    specialInstructions: instructions,
                  },
                }
              : item
          ),
        })),

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalPrice: () =>
        get().items.reduce((sum, i) => sum + i.lineTotal, 0),
    }),
    {
      name: 'forest-brew-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'forest-brew-cart') {
      useCartStore.persist.rehydrate()
    }
  })
}
