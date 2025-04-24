"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown } from "lucide-react"

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export default function CollapsibleSection({ title, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const contentRef = useRef<HTMLDivElement>(null)

  const toggleSection = () => {
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    if (isOpen && contentRef.current) {
      const scrollToBottom = () => {
        const element = contentRef.current
        if (element) {
          const elementRect = element.getBoundingClientRect()
          const absoluteElementTop = elementRect.top + window.pageYOffset
          const middle = absoluteElementTop + elementRect.height / 2
          const windowHeight = window.innerHeight
          const scrollTo = middle - windowHeight / 2
          
          window.scrollTo({
            top: scrollTo,
            behavior: 'smooth'
          })
        }
      }

      // Wait for the animation to complete
      setTimeout(scrollToBottom, 400)
    }
  }, [isOpen])

  return (
    <div className="border border-amber-200 dark:border-amber-700 rounded-lg mb-4 overflow-hidden">
      <button
        type="button"
        onClick={toggleSection}
        className="w-full p-3 flex justify-between items-center bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/70 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-medium">{title}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: {
                  duration: 0.4,
                  ease: [0.04, 0.62, 0.23, 0.98],
                },
                opacity: { duration: 0.25, delay: 0.15 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.3 },
                opacity: { duration: 0.25 },
              },
            }}
            className="overflow-hidden"
          >
            <div className="p-3" ref={contentRef}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
