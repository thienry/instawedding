/** Placeholder cards shown while the challenges load. */
export function ChallengesSkeleton() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-6">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className="bg-white rounded-3xl p-4 sm:p-5 border border-sage-200/60 animate-pulse flex items-center gap-4">
          <div className="w-14 h-14 bg-sage-200 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2.5">
            <div className="h-5 bg-sage-200 rounded w-36" />
            <div className="h-4 bg-sage-100 rounded w-56" />
          </div>
        </div>
      ))}
    </div>
  )
}
