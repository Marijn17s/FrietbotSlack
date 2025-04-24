"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Check, Minus, Plus, Trash2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface Item {
  id: string
  name: string
  category?: string
  categoryDisplayName?: string
}

interface QuantityInputsProps {
  selectedItems: Item[]
  quantities: Record<string, number>
  onChange: (itemId: string, quantity: number) => void
  onRemove: (itemId: string) => void
}

export default function QuantityInputs({ selectedItems, quantities, onChange, onRemove }: QuantityInputsProps) {
  const [deletingItems, setDeletingItems] = useState<Record<string, boolean>>({})
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  // Set timeout to reset confirmation state
  useEffect(() => {
    if (confirmDelete) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      timerRef.current = setTimeout(() => {
        setConfirmDelete(null)
      }, 3000) // Reset after 3 seconds
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [confirmDelete])

  const handleIncrement = (itemId: string) => {
    const currentQuantity = quantities[itemId] || 1
    onChange(itemId, currentQuantity + 1)
    // Reset delete confirmation if user changes quantity
    if (confirmDelete === itemId) {
      setConfirmDelete(null)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }

  const handleDecrement = (itemId: string) => {
    const currentQuantity = quantities[itemId] || 1
    if (currentQuantity > 1) {
      onChange(itemId, currentQuantity - 1)
      // Reset delete confirmation if user changes quantity
      if (confirmDelete === itemId) {
        setConfirmDelete(null)
        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }
      }
    }
  }

  const handleInputChange = (itemId: string, value: string) => {
    const numValue = Number.parseInt(value, 10)
    if (!isNaN(numValue) && numValue >= 1) {
      onChange(itemId, numValue)
      // Reset delete confirmation if user changes quantity
      if (confirmDelete === itemId) {
        setConfirmDelete(null)
        if (timerRef.current) {
          clearTimeout(timerRef.current)
        }
      }
    } else if (value === "") {
      onChange(itemId, 1)
    }
  }

  const handleDeleteClick = (itemId: string) => {
    if (confirmDelete === itemId) {
      // Second click - confirm deletion
      // Clear the timer immediately to prevent state conflicts
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      // Set deleting state for this specific item
      setDeletingItems((prev) => ({ ...prev, [itemId]: true }))

      // Reset confirmation state
      setConfirmDelete(null)

      // Add a small delay to allow the animation to play
      setTimeout(() => {
        // Only call onRemove if we're still mounted and the item is still marked for deletion
        onRemove(itemId)
      }, 500) // Increased delay to allow animation to complete
    } else {
      // First click - request confirmation
      setConfirmDelete(itemId)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
    exit: {
      opacity: 0,
      x: -100,
      scale: 0.8,
      transition: { duration: 0.5, ease: "easeInOut" },
    },
  }

  if (selectedItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Geen items geselecteerd. Ga terug om items te selecteren.
      </div>
    )
  }

  // Filter out items that are being deleted
  const visibleItems = selectedItems.filter((item) => !deletingItems[item.id])

  // Group items by category
  const itemsByCategory: Record<string, Item[]> = {}

  visibleItems.forEach((item) => {
    const category = item.category || "other"
    if (!itemsByCategory[category]) {
      itemsByCategory[category] = []
    }
    itemsByCategory[category].push(item)
  })

  // Get unique category display names with their keys
  const categories = Object.keys(itemsByCategory).map((key) => {
    const displayName =
      itemsByCategory[key][0]?.categoryDisplayName ||
      key
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^./, (str) => str.toUpperCase())

    return { key, displayName }
  })

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Hoeveel wil je van elk item?</h3>

      <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
        {categories.map(({ key, displayName }) => (
          <div key={key} className="space-y-4">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 border-b border-amber-200 dark:border-amber-700 pb-2">
              {displayName}
            </h4>

            <AnimatePresence mode="popLayout">
              {itemsByCategory[key].map((item) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  className="flex items-center justify-between p-3 border border-amber-200 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/30"
                >
                  <span className="font-medium dark:text-gray-100">{item.name}</span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleDecrement(item.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-300 dark:hover:bg-amber-600 transition-colors"
                      aria-label="Verminder hoeveelheid"
                    >
                      <Minus className="h-4 w-4" />
                    </button>

                    <input
                      type="text"
                      value={quantities[item.id] || 1}
                      onChange={(e) => handleInputChange(item.id, e.target.value)}
                      className="w-12 text-center border border-amber-300 dark:border-amber-700 rounded-md p-1 dark:bg-gray-700 dark:text-gray-100 quantity-input"
                      aria-label="Hoeveelheid"
                    />

                    <button
                      type="button"
                      onClick={() => handleIncrement(item.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-300 dark:hover:bg-amber-600 transition-colors"
                      aria-label="Verhoog hoeveelheid"
                    >
                      <Plus className="h-4 w-4" />
                    </button>

                    <motion.button
                      type="button"
                      onClick={() => handleDeleteClick(item.id)}
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.1 }}
                      className={`ml-2 w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300 ${
                        confirmDelete === item.id
                          ? "bg-red-500 text-white dark:bg-red-600 dark:text-white animate-pulse"
                          : "bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                      }`}
                      aria-label={confirmDelete === item.id ? "Klik nogmaals om te verwijderen" : "Verwijder item"}
                      style={{
                        animationDuration: confirmDelete === item.id ? "2s" : "1s", // Slower pulse animation
                      }}
                    >
                      {confirmDelete === item.id ? <Check className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ))}
      </motion.div>
    </div>
  )
}
