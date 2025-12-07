/**
 * SkeletonCard component - animated shimmer skeleton for loading state
 */

export default function SkeletonCard() {
  return (
    <div
      className="bg-white rounded-2xl border-2 border-slate-200 p-4 md:p-6 animate-pulse"
      role="status"
      aria-label="Loading exam"
    >
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        </div>
        <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
      </div>

      {/* Description skeleton */}
      <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-slate-200 rounded w-5/6 mb-4"></div>

      {/* Time skeleton */}
      <div className="h-4 bg-slate-200 rounded w-2/3 mb-4"></div>

      {/* Metadata skeleton */}
      <div className="flex items-center gap-4 mb-4">
        <div className="h-4 bg-slate-200 rounded w-20"></div>
        <div className="h-4 bg-slate-200 rounded w-24"></div>
      </div>

      {/* Badges skeleton */}
      <div className="flex gap-2 mb-4">
        <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
        <div className="h-6 w-28 bg-slate-200 rounded-full"></div>
      </div>

      {/* Teacher and points skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-slate-200 rounded w-32"></div>
        <div className="h-4 bg-slate-200 rounded w-20"></div>
      </div>

      {/* Button skeleton */}
      <div className="h-10 bg-slate-200 rounded-md"></div>
    </div>
  )
}
