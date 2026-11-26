import { useState } from 'react'

import { FloatingEmojiLayer } from '@/components/common/FloatingEmojiLayer'
import { Backdrop } from '@/features/projector/components/Backdrop'
import { CountdownHeader } from '@/features/projector/components/CountdownHeader'
import { CountdownStage } from '@/features/projector/components/CountdownStage'
import { EmptyStage } from '@/features/projector/components/EmptyStage'
import { Filmstrip } from '@/features/projector/components/Filmstrip'
import { GoldDust } from '@/features/projector/components/GoldDust'
import { MainStage } from '@/features/projector/components/MainStage'
import { MomentHeader } from '@/features/projector/components/MomentHeader'
import { MomentStage } from '@/features/projector/components/MomentStage'
import { NewPostBanner } from '@/features/projector/components/NewPostBanner'
import { OperatorControls } from '@/features/projector/components/OperatorControls'
import { Podium } from '@/features/projector/components/Podium'
import { ProjectorHeader } from '@/features/projector/components/ProjectorHeader'
import { QrInvite } from '@/features/projector/components/QrInvite'
import { QrModal } from '@/features/projector/components/QrModal'
import { Spotlight } from '@/features/projector/components/Spotlight'
import { useAutoHideControls } from '@/features/projector/hooks/useAutoHideControls'
import { useHasReached } from '@/features/projector/hooks/useCountdown'
import { useFullscreen } from '@/features/projector/hooks/useFullscreen'
import { useMomentIntro } from '@/features/projector/hooks/useMomentIntro'
import { useProjectorFeed } from '@/features/projector/hooks/useProjectorFeed'
import { useProjectorReactions } from '@/features/projector/hooks/useProjectorReactions'
import { useProjectorShortcuts } from '@/features/projector/hooks/useProjectorShortcuts'
import { useSlideshow } from '@/features/projector/hooks/useSlideshow'
import { useMomentSchedule } from '@/hooks/useLiveMoment'
import { useWakeLock } from '@/hooks/useWakeLock'
import { getMomentStart } from '@/utils/moments'

/** The countdown takes the whole stage for its last seconds. */
const FINAL_COUNTDOWN_MS = 10_000

/** Slideshow of the party, with the controls of the operator. */
export function ProjectorShow() {
  const [isQrOpen, setIsQrOpen] = useState(false)
  const { posts, newPost } = useProjectorFeed()
  const { live: moment, upcoming } = useMomentSchedule()
  const upcomingStart = upcoming ? getMomentStart(upcoming) : null
  const isFinalCountdown = useHasReached(
    upcomingStart === null ? null : upcomingStart - FINAL_COUNTDOWN_MS
  )
  const slideshow = useSlideshow(posts, newPost, moment?.id ?? null)
  const momentKey = moment ? `${moment.id}-${moment.liveSince}` : null
  const isOpeningMoment = useMomentIntro(momentKey)
  const fullscreen = useFullscreen()
  const reactions = useProjectorReactions()
  const controls = useAutoHideControls()
  const { slide } = slideshow
  const momentPostCount = moment ? slideshow.slides.length : 0
  const isMomentStage = moment !== null && (isOpeningMoment || !slide)
  const isFullStage = isMomentStage || isFinalCountdown

  const openQr = () => setIsQrOpen(true)
  const closeQr = () => setIsQrOpen(false)

  useWakeLock()
  useProjectorShortcuts({
    onPrevious: slideshow.showPrevious,
    onNext: slideshow.showNext,
    onTogglePause: slideshow.togglePause,
    onToggleFullscreen: fullscreen.toggle,
    onCloseQr: closeQr,
  })

  return (
    <div
      onPointerMove={controls.reveal}
      onPointerDown={controls.reveal}
      className={`projector-ground h-dvh w-full overflow-hidden relative select-none ${
        controls.isVisible ? '' : 'cursor-none'
      }`}>
      {slide && !isFullStage && <Backdrop slide={slide} />}
      <GoldDust />

      <OperatorControls
        isVisible={controls.isVisible}
        postCount={posts.length}
        isMomentLive={moment !== null}
        slideshow={slideshow}
        fullscreen={fullscreen}
        reactions={reactions}
        onOpenQr={openQr}
      />

      {upcoming && upcomingStart !== null && isFinalCountdown ? (
        <CountdownStage moment={upcoming} start={upcomingStart} />
      ) : moment && isMomentStage ? (
        <MomentStage key={momentKey} moment={moment} hasPosts={momentPostCount > 0} />
      ) : slide ? (
        <main className="relative h-full grid grid-rows-[minmax(0,1fr)_auto] lg:grid-rows-none lg:grid-cols-[minmax(0,1fr)_clamp(19rem,27vw,34rem)]">
          <section className="min-h-0 min-w-0 flex flex-col p-6 pb-4 lg:p-[3.2vh] lg:pb-[2.4vh] gap-[2.4vh]">
            <div className="relative flex-1 min-h-0">
              <MainStage slide={slide} newPostId={newPost?.id} />
              <NewPostBanner post={newPost} />
            </div>
            <Filmstrip slideshow={slideshow} />
          </section>

          <aside className="min-h-0 flex flex-col justify-between gap-[2.5vh] px-6 pb-6 lg:py-[4.5vh] lg:pr-[3.2vw] lg:pl-[1vw]">
            {moment ? (
              <MomentHeader moment={moment} postCount={momentPostCount} />
            ) : upcoming && upcomingStart !== null ? (
              <CountdownHeader moment={upcoming} start={upcomingStart} />
            ) : (
              <ProjectorHeader posts={posts} />
            )}
            <Spotlight slide={slide} />
            <div className="hidden lg:block space-y-[3vh]">
              <Podium posts={posts} />
              <QrInvite onOpen={openQr} />
            </div>
          </aside>
        </main>
      ) : (
        <EmptyStage />
      )}

      <FloatingEmojiLayer
        emojis={reactions.emojis}
        className="floating-emoji-area absolute left-[1vw] bottom-[14vh] w-[16vw] min-w-24 h-[72vh] z-20 text-[7vh]"
      />

      {isQrOpen && <QrModal onClose={closeQr} />}
    </div>
  )
}
