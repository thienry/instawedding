import { Film, Volume2, VolumeX } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { getCachedBlurPlaceholder } from '@/utils/blur-placeholder'

interface FeedVideoPlayerProps {
  readonly src: string
  readonly cacheKey?: string
  readonly containerClassName?: string
  readonly className?: string
  readonly showControlsOverlay?: boolean
}

export function FeedVideoPlayer({
  src,
  cacheKey,
  containerClassName = 'w-full min-h-[260px]',
  className = 'w-full max-h-[75vh] object-contain',
  showControlsOverlay = true,
}: FeedVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isMuted, setIsMuted] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false)

  const posterUrl =
    getCachedBlurPlaceholder(cacheKey ?? '') ??
    getCachedBlurPlaceholder(src) ??
    undefined

  useEffect(() => {
    const videoEl = videoRef.current
    if (!videoEl || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        if (entry.isIntersecting) {
          void videoEl.play().catch(() => {
            // Autoplay prevented by browser power saver; user can tap to play
          })
        } else {
          videoEl.pause()
        }
      },
      { threshold: 0.55 }
    )

    observer.observe(videoEl)
    return () => {
      observer.disconnect()
    }
  }, [src])

  const handleToggleMute = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    const videoEl = videoRef.current
    if (!videoEl) return
    const nextMuted = !isMuted
    videoEl.muted = nextMuted
    setIsMuted(nextMuted)
    if (!nextMuted && videoEl.paused) {
      void videoEl.play().catch(() => {})
    }
  }

  return (
    <div
      className={`relative overflow-hidden bg-slate-950 flex items-center justify-center ${containerClassName}`}
    >
      {/* Ambient Blurred Video/Poster Backdrop: Eliminates black bars on mismatched aspect ratios / desktop web */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none"
      >
        {posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            className="w-full h-full object-cover scale-125 blur-2xl opacity-45 saturate-125"
          />
        ) : (
          <video
            src={src}
            muted
            loop
            playsInline
            className="w-full h-full object-cover scale-125 blur-2xl opacity-40 saturate-125"
          />
        )}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {posterUrl && !isLoaded && (
        <img
          src={posterUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-80 pointer-events-none z-[1]"
        />
      )}

      <video
        ref={videoRef}
        src={src}
        poster={posterUrl}
        muted={isMuted}
        loop
        playsInline
        preload="metadata"
        onLoadedData={() => setIsLoaded(true)}
        className={`relative z-[2] ${className}`}
      />

      {showControlsOverlay && (
        <>
          {/* Top-Left Video Badge */}
          <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 text-white text-[11px] font-bold backdrop-blur-xs pointer-events-none border border-white/15">
            <Film className="w-3.5 h-3.5 text-gold-400" />
            <span>Vídeo</span>
          </div>

          {/* Bottom-Right Mute/Unmute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Ativar som do vídeo' : 'Silenciar vídeo'}
            title={isMuted ? 'Ativar som' : 'Silenciar'}
            className="absolute bottom-3 right-3 z-10 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors border border-white/15 shadow-sm"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 text-gold-400" />
            )}
          </button>
        </>
      )}
    </div>
  )
}
