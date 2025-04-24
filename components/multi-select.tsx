"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import { motion } from "framer-motion"

interface Item {
  id: string
  name: string
}

interface MultiSelectProps {
  label: string
  items: Item[]
  selectedItems: Item[]
  onChange: (selectedItems: Item[]) => void
}

export default function MultiSelect({ label, items, selectedItems, onChange }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter items based on search query
  const filteredItems = items.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 10)
    } else {
      setSearchQuery("")
    }
  }, [isOpen])

  // Scroll into view when opening dropdown
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      // First, get dropdown position
      const dropdownRect = dropdownRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight

      // Check if dropdown extends beyond viewport
      if (dropdownRect.bottom > viewportHeight) {
        // Calculate how much we need to scroll
        const scrollNeeded = Math.min(
          dropdownRect.bottom - viewportHeight + 20, // Add 20px buffer
          dropdownRect.top - 100, // Don't scroll more than needed to keep header visible
        )

        // Smooth scroll
        if (scrollNeeded > 0) {
          window.scrollBy({
            top: scrollNeeded,
            behavior: "smooth",
          })
        }
      }
    }
  }, [isOpen])

  const toggleItem = (item: Item) => {
    const isSelected = selectedItems.some((selectedItem) => selectedItem.id === item.id)

    if (isSelected) {
      onChange(selectedItems.filter((selectedItem) => selectedItem.id !== item.id))
    } else {
      onChange([...selectedItems, item])
    }
  }

  const removeItem = (item: Item) => {
    onChange(selectedItems.filter((selectedItem) => selectedItem.id !== item.id))
  }

  // Toggle dropdown with scroll adjustment
  const handleToggleDropdown = () => {
    setIsOpen(!isOpen)
  }

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't handle Enter key here, let it bubble up to the form
    if (e.key === "Escape") {
      setIsOpen(false)
      e.stopPropagation()
    }
  }

  // Animation variants for items
  const itemVariants = {
    hidden: { opacity: 0, y: -5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 24,
      },
    },
  }

  return (
    <div className="space-y-2 mb-4" ref={ref} onKeyDown={handleKeyDown}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>

      <div
        className="relative border border-amber-300 dark:border-amber-700 rounded-md p-2 cursor-pointer bg-white dark:bg-gray-800"
        onClick={handleToggleDropdown}
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {selectedItems.length === 0 ? (
              <span className="text-gray-500 dark:text-gray-400">Selecteer {label.toLowerCase()}</span>
            ) : (
              selectedItems.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-md text-sm flex items-center"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeItem(item)
                  }}
                >
                  {item.name}
                  <X className="ml-1 h-3 w-3" />
                </motion.div>
              ))
            )}
          </div>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </div>
      </div>

      {/* Dropdown - no height animation, just display/hide */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="mt-1 w-full bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-md shadow-xl overflow-auto"
          style={{
            maxHeight: "300px",
          }}
        >
          <div className="sticky top-0 bg-white dark:bg-gray-800 p-2 border-b border-amber-100 dark:border-amber-700 z-10">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 border border-amber-200 dark:border-amber-700 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 text-sm dark:bg-gray-700 dark:text-gray-100"
                placeholder={`Zoek in ${label.toLowerCase()}...`}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  // Prevent Enter from submitting the form
                  if (e.key === "Enter") {
                    e.stopPropagation()
                  }
                }}
              />
            </div>
          </div>

          <div className="overflow-auto" style={{ maxHeight: "250px" }}>
            <motion.ul
              className="py-1"
              variants={{
                visible: {
                  transition: {
                    staggerChildren: 0.03,
                  },
                },
              }}
              initial="hidden"
              animate="visible"
            >
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isSelected = selectedItems.some((selectedItem) => selectedItem.id === item.id)

                  return (
                    <motion.li
                      key={item.id}
                      variants={itemVariants}
                      className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-amber-50 dark:hover:bg-amber-900/30 ${
                        isSelected ? "bg-amber-50 dark:bg-amber-900/30" : "bg-white dark:bg-gray-800"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleItem(item)
                      }}
                    >
                      <span className="dark:text-gray-100">{item.name}</span>
                      {isSelected && <Check className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
                    </motion.li>
                  )
                })
              ) : (
                <li className="px-3 py-2 text-gray-500 dark:text-gray-400 text-sm">Geen resultaten gevonden</li>
              )}
            </motion.ul>
          </div>
        </div>
      )}
    </div>
  )
}
