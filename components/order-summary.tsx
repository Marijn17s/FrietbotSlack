"use client"

import { motion } from "framer-motion"

interface Item {
  id: string
  name: string
  category?: string
  categoryDisplayName?: string
}

interface OrderSummaryProps {
  name: string
  selectedItems: Item[]
  quantities: Record<string, number>
}

export default function OrderSummary({ name, selectedItems, quantities }: OrderSummaryProps) {
  // Filter items with quantity > 0
  const itemsWithQuantity = selectedItems.filter((item) => quantities[item.id] && quantities[item.id] > 0)

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
  }

  if (itemsWithQuantity.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Geen items met hoeveelheden geselecteerd. Ga terug om hoeveelheden in te vullen.
      </div>
    )
  }

  // Group items by category
  const itemsByCategory: Record<string, Item[]> = {}

  itemsWithQuantity.forEach((item) => {
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
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">Bestelling overzicht</h3>
        <p className="text-gray-500 dark:text-gray-400">Controleer je bestelling voordat je deze plaatst</p>
      </div>

      <div className="border-t border-b border-amber-200 dark:border-amber-700 py-4">
        <div className="flex justify-between items-center mb-4">
          <span className="font-medium dark:text-gray-100">Naam:</span>
          <span className="dark:text-gray-100">{name}</span>
        </div>

        <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
          {categories.map(({ key, displayName }) => (
            <div key={key} className="mb-3">
              <h4 className="font-medium text-amber-800 dark:text-amber-200 border-b border-amber-200 dark:border-amber-700 pb-1 mb-2">
                {displayName}
              </h4>

              <div className="space-y-2">
                {itemsByCategory[key].map((item) => (
                  <motion.div key={item.id} variants={itemVariants} className="flex justify-between items-center">
                    <span className="dark:text-gray-100">{item.name}</span>
                    <span className="font-medium dark:text-gray-100">{quantities[item.id] || 1}x</span>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        Deze bestelling wordt verzameld voor de gezamenlijke bestelling. Er is geen betaling nodig via deze app.
      </div>
    </div>
  )
}
