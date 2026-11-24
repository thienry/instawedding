import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { getCachedBlurPlaceholder } from '@/utils/blur-placeholder'

// Session-wide memory set of already decoded image URLs so switching tabs/views is instant (0ms fade)
const decodedImageUrls = new Set<string>()

export interface ProgressiveImageProps {
  readonly src: string
  readonly alt: string
  readonly cacheKey?: string
  readonly className?: string
  readonly containerClassName?: string
  readonly priority?: boolean
}

export function ProgressiveImage({
  src,
  alt,
  cacheKey,
  className = '',
  containerClassName = 'min-h-[220px]',
  priority = false,
}: ProgressiveImageProps) {
  const isAlreadyDecoded = decodedImageUrls.has(src)
  const [shouldLoad, setShouldLoad] = useState<boolean>(
    priority || isAlreadyDecoded || typeof IntersectionObserver === 'undefined'
  )
  const [isLoaded, setIsLoaded] = useState<boolean>(isAlreadyDecoded)
  const [hasError, setHasError] = useState<boolean>(false)
  const [retryCount, setRetryCount] = useState<number>(0)

  const containerRef = useRef<HTMLDivElement>(null)

  const blurPlaceholder =
    (cacheKey ? getCachedBlurPlaceholder(cacheKey) : null) ?? getCachedBlurPlaceholder(src)

  // Predictive viewport preloader: starts fetching 650px before user scrolls to the photo
  useEffect(() => {
    if (shouldLoad) return

    const element = containerRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
            break
          }
        }
      },
      {
        rootMargin: '650px 0px',
        threshold: 0.01,
      }
    )

    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [shouldLoad])

  // Auto-retry failed images when mobile connection recovers
  useEffect(() => {
    if (!hasError || typeof window === 'undefined') return
    const handleOnline = () => {
      setHasError(false)
      setRetryCount((prev) => prev + 1)
    }
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [hasError])

  const effectiveSrc =
    retryCount > 0 && !src.startsWith('data:') && !src.startsWith('blob:')
      ? `${src}${src.includes('?') ? '&' : '?'}retry=${retryCount}`
      : src

  const handleImageLoad = () => {
    decodedImageUrls.add(src)
    setIsLoaded(true)
    setHasError(false)
  }

  const handleImageError = () => {
    if (retryCount < 1 && !src.startsWith('data:') && !src.startsWith('blob:')) {
      // Automatic silent retry once after 1.2s on flaky mobile signal
      setTimeout(() => {
        setRetryCount((prev) => prev + 1)
      }, 1200)
      return
    }
    setHasError(true)
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 ${containerClassName}`}>
      {/* Ambient Blurred Backdrop: Eliminates black bars on mismatched aspect ratios / desktop web */}
      {shouldLoad && !hasError && (
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
          <img
            src={effectiveSrc}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover scale-125 blur-2xl opacity-45 saturate-125 transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-black/35" />
        </div>
      )}

      {/* 1. Instant Blur-Up Placeholder or Shimmer Skeleton while downloading */}
      {!isLoaded && !hasError && (
        <div
          aria-hidden="true"
          className="absolute inset-0 overflow-hidden pointer-events-none z-[1]">
          {blurPlaceholder ? (
            <img
              src={blurPlaceholder}
              alt=""
              className="w-full h-full object-cover scale-110 blur-xl opacity-80"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-900/60 via-slate-800/40 to-slate-900/60 animate-pulse backdrop-blur-xs" />
          )}
        </div>
      )}

      {/* 2. Error Fallback with 1-Tap Retry for Bad Mobile Signal */}
      {hasError && (
        <div className="py-16 px-4 text-center space-y-2.5 z-10">
          <p className="text-xs text-white/75 font-medium">
            Sinal móvel lento ao carregar esta foto
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setHasError(false)
              setRetryCount((prev) => prev + 1)
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-semibold border border-white/20 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar novamente</span>
          </button>
        </div>
      )}

      {/* 3. Main Photo with Async Decoding and Priority Hints */}
      {shouldLoad && !hasError && (
        <img
          src={effectiveSrc}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`relative z-[2] ${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}
