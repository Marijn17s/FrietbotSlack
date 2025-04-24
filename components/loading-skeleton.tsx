"use client"

export default function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Name input skeleton */}
      <div>
        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse"></div>
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>

      {/* Categories skeletons */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
      ))}

      {/* Collapsible section skeleton */}
      <div className="border border-amber-200 dark:border-amber-700 rounded-lg overflow-hidden">
        <div className="p-3 bg-amber-100 dark:bg-amber-900/50 flex justify-between items-center">
          <div className="h-5 w-28 bg-amber-200 dark:bg-amber-700 rounded animate-pulse"></div>
          <div className="h-5 w-5 bg-amber-200 dark:bg-amber-700 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  )
}
