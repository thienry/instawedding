/** Placeholder shown while the feed loads. */
export function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((n) => (
        <div
          key={n}
          className="bg-white rounded-3xl overflow-hidden border border-sage-200/70 shadow-xs animate-pulse"
        >
          <div className="p-4 flex items-center space-x-3">
            <div className="w-11 h-11 rounded-full bg-sage-200" />
            <div className="space-y-2 flex-1">
              <div className="w-32 h-4 bg-sage-200 rounded-sm" />
              <div className="w-20 h-3 bg-sage-100 rounded-sm" />
            </div>
          </div>
          <div className="aspect-4/3 bg-sage-100" />
          <div className="p-4 space-y-2.5">
            <div className="w-16 h-5 bg-sage-200 rounded-sm" />
            <div className="w-3/4 h-4 bg-sage-100 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  )
}
