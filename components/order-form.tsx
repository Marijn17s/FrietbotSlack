"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ChevronRight, Clock, Loader2, ShoppingBag, History, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import MultiSelect from "@/components/multi-select"
import QuantityInputs from "@/components/quantity-inputs"
import OrderSummary from "@/components/order-summary"
import CollapsibleSection from "@/components/collapsible-section"
import { v4 as uuidv4 } from "uuid"
import Cookies from "js-cookie"
import { motion, AnimatePresence } from "framer-motion"
import LoadingSkeleton from "@/components/loading-skeleton"

// Type definitions for menu items
interface MenuItem {
  id: string
  name: string
  category?: string
  categoryDisplayName?: string
}

interface MenuCategory {
  type: string
  displayName: string
  items: MenuItem[]
}

interface OrderStatus {
  isOpen: boolean
  nextOpening: string | null
  deadline: string | null
}

export default function OrderForm() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState("")
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([])
  const [selections, setSelections] = useState<Record<string, MenuItem[]>>({})
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [orderComplete, setOrderComplete] = useState(false)
  const [error, setError] = useState("")
  const [menuError, setMenuError] = useState("")
  const [isLoadingMenu, setIsLoadingMenu] = useState(true)
  const [menuLoadingFailed, setMenuLoadingFailed] = useState(false)
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [orderingJustOpened, setOrderingJustOpened] = useState(false)
  const [showOrderingOpenedMessage, setShowOrderingOpenedMessage] = useState(false)
  const [savedOrder, setSavedOrder] = useState<any>(null)
  const [showLastOrderPrompt, setShowLastOrderPrompt] = useState(false)
  const [timeUntilDeadline, setTimeUntilDeadline] = useState<string | null>(null)
  const [isDeadlineImminent, setIsDeadlineImminent] = useState(false)
  const [showDeadlineWarning, setShowDeadlineWarning] = useState(false)

  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const nextOpeningTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const deadlineTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const deadlineUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const messageTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Categories that should be in the collapsible section
  const collapsibleCategories = [
    "schotels_met_salades_en_frites",
    "schotels_met_salades_zonder_frites",
    "warme_dranken",
    "extras",
    "diversen",
    "dranken",
  ]

  // Fetch order status from API
  const fetchOrderStatus = async (showLoading = false) => {
    // Prevent too frequent API calls (minimum 5 seconds between calls)
    const now = Date.now()
    // if (now - lastStatusCheck < 5000) {
    //   console.log("Skipping status check - too soon since last check")
    //   return null
    // }

    if (showLoading) {
      setIsCheckingStatus(true)
    }

    try {
      const response = await fetch("https://nice-ethical-egret.ngrok-free.app/api/order/status", {
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch order status: ${response.status}`)
      }

      const data = await response.json()
      // console.log("Order status:", data)

      // Check if ordering just opened (was closed before but is open now)
      if (orderStatus && !orderStatus.isOpen && data.isOpen) {
        setOrderingJustOpened(true)
        setShowOrderingOpenedMessage(true)

        // Auto-dismiss the "ordering opened" message after 30 seconds
        if (messageTimeoutRef.current) {
          clearTimeout(messageTimeoutRef.current)
        }

        messageTimeoutRef.current = setTimeout(() => {
          setShowOrderingOpenedMessage(false)
        }, 30000)
      }

      setOrderStatus(data)

      if (data.deadline) {
        setupDeadlineTimer(data.deadline)
      }

      return data
    } catch (err) {
      console.error("Error fetching order status:", err)
      return null
    } finally {
      if (showLoading) {
        setIsCheckingStatus(false)
      }
    }
  }

  // Set up timer for next opening if ordering is closed
  const setupNextOpeningTimer = (nextOpeningTime: string) => {
    if (nextOpeningTimeoutRef.current) {
      clearTimeout(nextOpeningTimeoutRef.current)
    }

    const now = new Date().getTime()
    const openingTime = new Date(nextOpeningTime).getTime()
    const timeUntilOpening = Math.max(0, openingTime - now)

    if (timeUntilOpening > 0) {
      nextOpeningTimeoutRef.current = setTimeout(() => {
        fetchOrderStatus()
      }, timeUntilOpening + 1000) // Add 1 second buffer
    }
  }

  // Set up timer and interval for deadline
  const setupDeadlineTimer = (deadlineTime: string) => {
    if (deadlineTimeoutRef.current) {
      clearTimeout(deadlineTimeoutRef.current)
    }

    if (deadlineUpdateIntervalRef.current) {
      clearInterval(deadlineUpdateIntervalRef.current)
    }

    const updateDeadlineDisplay = () => {
      const now = new Date().getTime()
      const deadline = new Date(deadlineTime).getTime()
      const timeRemaining = Math.max(0, deadline - now)

      if (timeRemaining <= 0) {
        setTimeUntilDeadline("Gesloten")
        setIsDeadlineImminent(false)
        setShowDeadlineWarning(false)

        // Clear the interval immediately to prevent multiple calls
        if (deadlineUpdateIntervalRef.current) {
          clearInterval(deadlineUpdateIntervalRef.current)
          deadlineUpdateIntervalRef.current = null
        }

        // Schedule a single status refresh with a slight delay to prevent spam
        // Only do this if we haven't already scheduled one
        if (deadlineTimeoutRef.current === null) {
          deadlineTimeoutRef.current = setTimeout(() => {
            fetchOrderStatus() // Fetch the status once after a delay
            deadlineTimeoutRef.current = null // Reset the ref
          }, 10000) // 2 second delay before checking status after deadline
        }

        return
      }

      // Format the time remaining
      const minutes = Math.floor(timeRemaining / (1000 * 60))
      const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000)

      // Set imminent flag if less than 5 minutes remaining
      const isImminent = minutes < 5
      setIsDeadlineImminent(isImminent)

      // Only show the warning message when we first detect it's imminent
      if (isImminent && !isDeadlineImminent) {
        setShowDeadlineWarning(true)

        // Auto-dismiss the warning box after 15 seconds
        if (warningTimeoutRef.current) {
          clearTimeout(warningTimeoutRef.current)
        }

        warningTimeoutRef.current = setTimeout(() => {
          setShowDeadlineWarning(false)
        }, 15000)
      }

      // Format display string
      if (minutes > 0) {
        setTimeUntilDeadline(`${minutes}m ${seconds}s`)
      } else {
        setTimeUntilDeadline(`${seconds}s`)
      }
    }

    // Update immediately and then every second
    updateDeadlineDisplay()
    deadlineUpdateIntervalRef.current = setInterval(updateDeadlineDisplay, 1000)

    // Set timeout to refresh status when deadline is reached
    // This is a backup in case the interval somehow fails
    const now = new Date().getTime()
    const deadline = new Date(deadlineTime).getTime()
    const timeUntilDeadline = Math.max(0, deadline - now)

    if (timeUntilDeadline > 0) {
      deadlineTimeoutRef.current = setTimeout(() => {
        setTimeUntilDeadline("Gesloten")

        // Wait a moment before checking status to prevent spam
        setTimeout(() => {
          fetchOrderStatus() // Single check after deadline
        }, 2000)

        deadlineTimeoutRef.current = null
      }, timeUntilDeadline + 1000) // Add 1 second buffer
    }
  }

  // Format time until opening
  const formatTimeUntilOpening = (nextOpeningTime: string | null): string => {
    if (!nextOpeningTime) return "onbepaalde tijd"

    const now = new Date().getTime()
    const openingTime = new Date(nextOpeningTime).getTime()
    const timeUntilOpening = Math.max(0, openingTime - now)

    if (timeUntilOpening <= 0) {
      return "enkele ogenblikken"
    }

    const minutes = Math.floor(timeUntilOpening / (1000 * 60))

    if (minutes < 1) {
      return "enkele ogenblikken"
    }

    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60

    if (hours > 0) {
      return `${hours} uur${hours > 1 ? "" : ""} en ${remainingMinutes} ${remainingMinutes === 1 ? "minuut" : "minuten"}`
    } else {
      return `${minutes} ${minutes === 1 ? "minuut" : "minuten"}`
    }
  }

  // Fetch menu items from API
  const fetchMenu = async () => {
    setIsLoadingMenu(true)
    setMenuError("")

    try {
      const response = await fetch("https://nice-ethical-egret.ngrok-free.app/api/menu", {
        headers: {
          Accept: "application/json",
          "ngrok-skip-browser-warning": "true",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch menu: ${response.status}, ${response.statusText}`)
      }

      const data = await response.json()
      console.log("API response data:", data)

      const processedCategories: MenuCategory[] = Object.entries(data).map(([type, items]) => {
        let displayName = type
          .replace(/([A-Z])/g, " $1")
          .replace(/_/g, " ")
          .replace(/^./, (str) => str.toUpperCase())

        const itemsWithCategory = Array.isArray(items)
          ? items.map((item) => ({
              ...item,
              category: type,
              categoryDisplayName: displayName,
            }))
          : []

        return {
          type,
          displayName,
          items: itemsWithCategory,
        }
      })

      console.log("Processed categories:", processedCategories)

      if (processedCategories.length === 0) {
        throw new Error("No valid menu categories found in API response")
      }

      setMenuCategories(processedCategories)
      setMenuLoadingFailed(false)

      const initialSelections: Record<string, MenuItem[]> = {}
      processedCategories.forEach((category: MenuCategory) => {
        initialSelections[category.type] = []
      })
      setSelections(initialSelections)

      checkForLastOrder()
    } catch (err) {
      console.error("Error fetching menu:", err)
      setMenuLoadingFailed(true)
      setMenuError("Kon het menu niet laden van de server.")
    } finally {
      setIsLoadingMenu(false)
    }
  }

  // Check for last successful order
  const checkForLastOrder = () => {
    const lastOrder = Cookies.get("lastFrietOrder")
    if (lastOrder) {
      try {
        const parsedOrder = JSON.parse(lastOrder)
        if (parsedOrder && parsedOrder.items && parsedOrder.items.length > 0) {
          setShowLastOrderPrompt(true)
        }
      } catch (err) {
        console.error("Error parsing last order:", err)
      }
    }
  }

  // Initialize with both menu and order status
  useEffect(() => {
    fetchMenu()
    fetchOrderStatus(true)

    statusCheckIntervalRef.current = setInterval(() => {
      fetchOrderStatus()
    }, 20000)

    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current)
      }
      if (nextOpeningTimeoutRef.current) {
        clearTimeout(nextOpeningTimeoutRef.current)
      }
      if (deadlineTimeoutRef.current) {
        clearTimeout(deadlineTimeoutRef.current)
      }
      if (deadlineUpdateIntervalRef.current) {
        clearInterval(deadlineUpdateIntervalRef.current)
      }
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current)
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current)
      }
    }
  }, [])

  // Set up timer for next opening whenever order status changes
  useEffect(() => {
    if (orderStatus && !orderStatus.isOpen && orderStatus.nextOpening) {
      setupNextOpeningTimer(orderStatus.nextOpening)
    }
  }, [orderStatus])

  // Initialize quantities with default value of 1 for each selected item
  useEffect(() => {
    if (!menuCategories.length) return

    const allSelectedItems: MenuItem[] = []
    Object.values(selections).forEach((items) => {
      allSelectedItems.push(...items)
    })

    const newQuantities = { ...quantities }

    // Set default quantity of 1 for newly selected items
    allSelectedItems.forEach((item) => {
      if (newQuantities[item.id] === undefined) {
        newQuantities[item.id] = 1
      }
    })

    setQuantities(newQuantities)
  }, [selections, menuCategories])

  const handleSelectionChange = (category: string, selectedItems: MenuItem[]) => {
    setSelections((prev) => ({
      ...prev,
      [category]: selectedItems,
    }))
  }

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: quantity,
    }))
  }

  const handleRemoveItem = (itemId: string) => {
    // Find which category the item belongs to
    let categoryToUpdate = ""
    let itemToRemove: MenuItem | null = null

    Object.entries(selections).forEach(([category, items]) => {
      const foundItem = items.find((item) => item.id === itemId)
      if (foundItem) {
        categoryToUpdate = category
        itemToRemove = foundItem
      }
    })

    if (categoryToUpdate && itemToRemove) {
      setSelections((prev) => ({
        ...prev,
        [categoryToUpdate]: prev[categoryToUpdate].filter((item) => item.id !== itemId),
      }))

      setQuantities((prev) => {
        const newQuantities = { ...prev }
        delete newQuantities[itemId]
        return newQuantities
      })

      // Check if this was the last item, if so go back to step 1
      const allSelectedItems = getAllSelectedItems().filter((item) => item.id !== itemId)
      if (allSelectedItems.length === 0 && step === 2) {
        setStep(1)
      }
    }
  }

  const handleContinue = () => {
    if (step === 1) {
      const hasSelections = Object.values(selections).some((items) => items.length > 0)
      if (hasSelections && name.trim() !== "") {
        setStep(2)
      }
    } else if (step === 2) {
      setStep(3)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    } else if (step === 3) {
      setStep(2)
    }
  }

  // Get or create a user ID from cookies
  const getUserId = () => {
    let userId = Cookies.get("frietUserId")

    if (!userId) {
      userId = uuidv4()
      // Set cookie to expire in 1 year
      Cookies.set("frietUserId", userId, { expires: 365 })
    }

    return userId
  }

  // Save current order to local storage
  const saveOrderLocally = (orderPayload: any) => {
    try {
      localStorage.setItem("savedFrietOrder", JSON.stringify(orderPayload))
      setSavedOrder(orderPayload)
    } catch (err) {
      console.error("Error saving order locally:", err)
    }
  }

  // Save successful order to cookie
  const saveOrderToCookie = (orderPayload: any) => {
    try {
      Cookies.set("lastFrietOrder", JSON.stringify(orderPayload), { expires: 30 }) // Expires in 30 days
    } catch (err) {
      console.error("Error saving order to cookie:", err)
    }
  }

  // Load last order from cookie
  const loadLastOrder = () => {
    try {
      const lastOrderStr = Cookies.get("lastFrietOrder")
      if (lastOrderStr) {
        const order = JSON.parse(lastOrderStr)

        // Set name
        if (order.user_name) {
          setName(order.user_name)
        }

        // Process items
        if (order.items && Array.isArray(order.items)) {
          // Group items by category
          const itemsByCategory: Record<string, MenuItem[]> = {}
          const newQuantities: Record<string, number> = {}

          order.items.forEach((item: any) => {
            if (!item.type || !item.id) return

            if (!itemsByCategory[item.type]) {
              itemsByCategory[item.type] = []
            }

            // Find the item in our menu categories
            let menuItem: MenuItem | undefined

            for (const category of menuCategories) {
              if (category.type === item.type) {
                menuItem = category.items.find((menuItem) => menuItem.id === item.id)
                if (menuItem) break
              }
            }

            if (menuItem) {
              itemsByCategory[item.type].push(menuItem)
              newQuantities[item.id] = item.quantity || 1
            }
          })

          // Update selections and quantities
          setSelections(itemsByCategory)
          setQuantities(newQuantities)
        }

        // Hide the prompt
        setShowLastOrderPrompt(false)
      }
    } catch (err) {
      console.error("Error loading last order:", err)
    }
  }

  // Load saved order from local storage
  const loadSavedOrder = () => {
    try {
      const savedOrderStr = localStorage.getItem("savedFrietOrder")
      if (savedOrderStr) {
        const order = JSON.parse(savedOrderStr)
        setSavedOrder(order)
        return order
      }
    } catch (err) {
      console.error("Error loading saved order:", err)
    }
    return null
  }

  // Clear saved order from local storage
  const clearSavedOrder = () => {
    try {
      localStorage.removeItem("savedFrietOrder")
      setSavedOrder(null)
    } catch (err) {
      console.error("Error clearing saved order:", err)
    }
  }

  // Check if ordering is open before submitting
  const checkOrderingStatusBeforeSubmit = async () => {
    const status = await fetchOrderStatus()
    if (!status || !status.isOpen) {
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError("")

    try {
      // Check if ordering is open
      const isOrderingOpen = await checkOrderingStatusBeforeSubmit()

      if (!isOrderingOpen) {
        // Ordering is closed, save order locally
        const userId = getUserId()

        // Format the items for the API
        const items: any[] = []

        // Process each category
        Object.entries(selections).forEach(([category, categoryItems]) => {
          categoryItems.forEach((item) => {
            const quantity = quantities[item.id] || 1

            items.push({
              id: item.id,
              name: item.name,
              type: category,
              quantity: quantity,
              needsQuantity: false,
            })
          })
        })

        // Create the payload
        const payload = {
          user_id: userId,
          user_name: name,
          items,
        }

        // Save order locally
        saveOrderLocally(payload)

        // Show message to user
        setError(
          `Bestellen is momenteel niet mogelijk. Je bestelling is opgeslagen en kan worden verzonden zodra het bestellen weer open is ${orderStatus?.nextOpening ? `(over ongeveer ${formatTimeUntilOpening(orderStatus.nextOpening)})` : ""}.`,
        )

        return
      }

      // Get user ID from cookie or create a new one
      const userId = getUserId()

      // Format the items for the API
      const items: any[] = []

      // Process each category
      Object.entries(selections).forEach(([category, categoryItems]) => {
        categoryItems.forEach((item) => {
          const quantity = quantities[item.id] || 1

          items.push({
            id: item.id, // Send the item ID instead of name
            name: item.name, // Still include the name for reference
            type: category,
            quantity: quantity,
            needsQuantity: false,
          })
        })
      })

      // Create the payload
      const payload = {
        user_id: userId,
        user_name: name,
        items,
      }

      // Send the request with a timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      try {
        const response = await fetch("https://nice-ethical-egret.ngrok-free.app/api/order/guest", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
          mode: "cors", // Explicitly set CORS mode
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`)
        }

        // Handle successful response
        setOrderComplete(true)

        // Save successful order to cookie
        saveOrderToCookie(payload)

        // Clear any saved order
        clearSavedOrder()
      } catch (fetchError: any) {
        console.error("API Error:", fetchError)

        // Show appropriate error message based on the error type
        if (fetchError.name === "AbortError") {
          setError("De verbinding met de server is verlopen. Controleer je internetverbinding en probeer het opnieuw.")
        } else if (fetchError.message.includes("Failed to fetch")) {
          setError("Kan geen verbinding maken met de server. Controleer je internetverbinding en probeer het opnieuw.")
        } else {
          setError(`Er is een fout opgetreden bij het plaatsen van je bestelling: ${fetchError.message}`)
        }

        // Log the data that would have been sent
        console.log("Order data that would have been sent:", payload)
      }
    } catch (err) {
      console.error("Error preparing order:", err)
      setError("Er is een fout opgetreden bij het voorbereiden van je bestelling. Probeer het later opnieuw.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNewOrder = () => {
    setStep(1)

    // Reset selections for all categories
    const resetSelections: Record<string, MenuItem[]> = {}
    menuCategories.forEach((category) => {
      resetSelections[category.type] = []
    })

    setSelections(resetSelections)
    setQuantities({})
    setName("")
    setOrderComplete(false)
    setError("")
    setOrderingJustOpened(false)
    setShowOrderingOpenedMessage(false)
  }

  // Get all selected items across all categories
  const getAllSelectedItems = (): MenuItem[] => {
    const allItems: MenuItem[] = []
    Object.values(selections).forEach((items) => {
      allItems.push(...items)
    })
    return allItems
  }

  const allSelectedItems = getAllSelectedItems()

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2 },
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

  // Loading state while fetching menu
  if (isLoadingMenu) {
    return (
      <Card className="max-w-3xl mx-auto shadow-xl overflow-hidden border-amber-200 dark:border-amber-700">
        <CardContent className="p-0">
          {/* Progress indicator skeleton */}
          <div className="bg-amber-600 dark:bg-amber-800 p-4 rounded-t-lg">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-amber-400 dark:bg-amber-700 animate-pulse"></div>
                <div className="h-1 w-12 bg-amber-400 dark:bg-amber-700 animate-pulse"></div>
                <div className="w-8 h-8 rounded-full bg-amber-400 dark:bg-amber-700 animate-pulse"></div>
                <div className="h-1 w-12 bg-amber-400 dark:bg-amber-700 animate-pulse"></div>
                <div className="w-8 h-8 rounded-full bg-amber-400 dark:bg-amber-700 animate-pulse"></div>
              </div>
              <div className="h-5 w-24 bg-amber-400 dark:bg-amber-700 rounded animate-pulse"></div>
            </div>
          </div>

          <div className="p-6">
            <LoadingSkeleton />
          </div>

          <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-amber-200 dark:border-amber-700 flex justify-between rounded-b-lg">
            <div></div>
            <div className="h-10 w-28 bg-amber-300 dark:bg-amber-700 rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Group categories into regular and collapsible
  const regularCategories = menuCategories.filter((category) => !collapsibleCategories.includes(category.type))

  const collapsibleCategoriesData = menuCategories.filter((category) => collapsibleCategories.includes(category.type))

  return (
    <Card className="max-w-3xl mx-auto shadow-xl overflow-hidden border-amber-200 dark:border-amber-700 rounded-lg">
      <CardContent className="p-0">
        {/* Progress indicator */}
        <div className="bg-amber-600 dark:bg-amber-800 p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-200 dark:text-amber-900"
                    : "bg-amber-400 text-amber-100 dark:bg-amber-700 dark:text-amber-200"
                }`}
              >
                {step > 1 ? <Check className="w-5 h-5" /> : "1"}
              </div>
              <div
                className={`h-1 w-12 ${step > 1 ? "bg-amber-100 dark:bg-amber-200" : "bg-amber-400 dark:bg-amber-700"}`}
              />
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-200 dark:text-amber-900"
                    : "bg-amber-400 text-amber-100 dark:bg-amber-700 dark:text-amber-200"
                }`}
              >
                {step > 2 ? <Check className="w-5 h-5" /> : "2"}
              </div>
              <div
                className={`h-1 w-12 ${step > 2 ? "bg-amber-100 dark:bg-amber-200" : "bg-amber-400 dark:bg-amber-700"}`}
              />
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 3
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-200 dark:text-amber-900"
                    : "bg-amber-400 text-amber-100 dark:bg-amber-700 dark:text-amber-200"
                }`}
              >
                {step > 3 ? <Check className="w-5 h-5" /> : "3"}
              </div>
            </div>
            <div className="text-amber-100 dark:text-amber-200 font-medium">
              {step === 1 && "Selecteer items"}
              {step === 2 && "Hoeveelheden"}
              {step === 3 && "Bevestig bestelling"}
            </div>
          </div>
        </div>

        {/* Order deadline timer */}
        {orderStatus?.isOpen && timeUntilDeadline ? (
          <div
            className={`px-4 py-2 ${
              isDeadlineImminent
                ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                : "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
            } border-b border-amber-200 dark:border-amber-700 flex items-center justify-between`}
          >
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                {timeUntilDeadline === "Gesloten"
                    ? "Bestellen is gesloten"
                    : "Bestellen is open"}
              </span>
            </div>
            <div className="text-sm font-bold">
              {isDeadlineImminent
                ? "Nog " + timeUntilDeadline
                : timeUntilDeadline}
            </div>
          </div>
        ) : null}

        <div className="p-6 relative">
          {/* Status checking loading indicator - only shown when explicitly checking */}
          {isCheckingStatus && (
            <div className="absolute top-2 right-2 flex items-center text-amber-600 dark:text-amber-400 text-sm">
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
              <span>Status controleren...</span>
            </div>
          )}

          {/* Order status notification */}
          {orderStatus && !orderStatus.isOpen && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/50 dark:border-amber-700 dark:text-amber-200 rounded-md flex items-start">
              <Clock className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Bestellen is momenteel niet mogelijk</p>
                <p className="text-sm mt-1">
                  {`Je kunt het menu bekijken, maar bestellingen worden pas aangenomen over ${formatTimeUntilOpening(
                    orderStatus?.nextOpening,
                  )}.`}
                </p>
                {savedOrder && (
                  <p className="text-sm mt-2 font-medium">
                    Je bestelling is opgeslagen en kan worden verzonden zodra het bestellen open is.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Last order prompt - now positioned below the order status notification */}
          {showLastOrderPrompt && step === 1 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/50 dark:border-amber-700 dark:text-amber-200 rounded-md flex items-start">
              <History className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Vorige bestelling gevonden</p>
                <p className="text-sm mt-1">Wil je je vorige bestelling opnieuw plaatsen?</p>
                <div className="mt-2">
                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 mr-2" onClick={loadLastOrder}>
                    Vorige bestelling laden
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Ordering just opened notification - auto-dismisses after 30 seconds with animation */}
          <AnimatePresence>
            {orderingJustOpened && orderStatus?.isOpen && showOrderingOpenedMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20, transition: { duration: 0.5 } }}
                className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-200 rounded-md"
              >
                <p className="font-medium">Bestellen is nu geopend!</p>
                <p className="text-sm mt-1">Je kunt nu je bestelling plaatsen.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {menuLoadingFailed && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/50 dark:border-amber-700 dark:text-amber-200 rounded-md">
              {menuError}
              <div className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-800 border-amber-300 hover:bg-amber-100 dark:text-amber-200 dark:border-amber-700 dark:hover:bg-amber-800"
                  onClick={() => window.location.reload()}
                >
                  Vernieuw menu
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                    Jouw naam
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring bg-background text-foreground"
                    placeholder="Vul je naam in"
                  />
                </div>
              </div>

              {/* Regular categories */}
              {regularCategories.map((category) => (
                <div key={category.type}>
                  <MultiSelect
                    label={category.displayName}
                    items={category.items}
                    selectedItems={selections[category.type] || []}
                    onChange={(selected) => handleSelectionChange(category.type, selected)}
                  />
                </div>
              ))}

              {/* Collapsible section for special categories */}
              {collapsibleCategoriesData.length > 0 && (
                <CollapsibleSection title="Meer opties" defaultOpen={false}>
                  <div className="space-y-4">
                    {collapsibleCategoriesData.map((category) => (
                      <div key={category.type}>
                        <MultiSelect
                          label={category.displayName}
                          items={category.items}
                          selectedItems={selections[category.type] || []}
                          onChange={(selected) => handleSelectionChange(category.type, selected)}
                        />
                      </div>
                    ))}
                  </div>
                </CollapsibleSection>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <QuantityInputs
                selectedItems={allSelectedItems}
                quantities={quantities}
                onChange={handleQuantityChange}
                onRemove={handleRemoveItem}
              />
            </div>
          )}

          {step === 3 && !orderComplete && (
            <div>
              <OrderSummary name={name} selectedItems={allSelectedItems} quantities={quantities} />
              {error && (
                <div
                  className={`mt-4 p-4 rounded-md ${error.includes("Bestellen is momenteel niet mogelijk") ? "bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200" : "bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200"}`}
                >
                  <div className="flex items-start">
                    {error.includes("Bestellen is momenteel niet mogelijk") ? (
                      <Clock className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{error}</p>
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          className={
                            error.includes("Bestellen is momenteel niet mogelijk")
                              ? "text-amber-800 border-amber-300 hover:bg-amber-100 dark:text-amber-200 dark:border-amber-700 dark:hover:bg-amber-800"
                              : "text-red-700 border-red-300 hover:bg-red-50 dark:text-red-200 dark:border-red-700 dark:hover:bg-red-900/50"
                          }
                          onClick={() => setError("")}
                        >
                          {error.includes("Bestellen is momenteel niet mogelijk") ? "Begrepen" : "Probeer opnieuw"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {orderComplete && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Bestelling geplaatst!</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Bedankt voor je bestelling, {name}. Je bestelling is succesvol geplaatst.
              </p>
              <Button onClick={handleNewOrder} className="bg-amber-600 hover:bg-amber-700">
                Nieuwe bestelling
              </Button>
            </div>
          )}
        </div>

        {!orderComplete && (
          <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-amber-200 dark:border-amber-700 flex justify-between rounded-b-lg">
            {step > 1 ? (
              <Button variant="outline" onClick={handleBack}>
                Terug
              </Button>
            ) : (
              <div></div>
            )}

            {step < 3 ? (
              <Button
                onClick={handleContinue}
                disabled={step === 1 && (allSelectedItems.length === 0 || !name)}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Volgende
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || error !== ""}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Bezig met verwerken...
                  </>
                ) : (
                  <>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Bestelling plaatsen
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
