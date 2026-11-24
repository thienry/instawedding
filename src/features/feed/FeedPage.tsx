import { useState } from 'react'

import { GuestNameModal } from '@/components/common/GuestNameModal'
import { PhotoLightboxModal } from '@/components/common/PhotoLightboxModal'
import { TermsModal } from '@/components/common/TermsModal'
import { ChallengeFilterPill } from '@/features/feed/components/ChallengeFilterPill'
import { DeletePostModal } from '@/features/feed/components/DeletePostModal'
import { EmptyFeed } from '@/features/feed/components/EmptyFeed'
import { FeedFooter } from '@/features/feed/components/FeedFooter'
import { FeedSidebar } from '@/features/feed/components/FeedSidebar'
import { FeedSkeleton } from '@/features/feed/components/FeedSkeleton'
import { FeedToolbar } from '@/features/feed/components/FeedToolbar'
import { FilterTabs } from '@/features/feed/components/FilterTabs'
import { NewPostsPill } from '@/features/feed/components/NewPostsPill'
import { PostGrid } from '@/features/feed/components/PostGrid'
import { PullIndicator } from '@/features/feed/components/PullIndicator'
import { ShareToast } from '@/features/feed/components/ShareToast'
import { UploadCard } from '@/features/feed/components/UploadCard'
import { useFeedFilter } from '@/features/feed/hooks/useFeedFilter'
import { useFeedGuest } from '@/features/feed/hooks/useFeedGuest'
import { useFeedPosts } from '@/features/feed/hooks/useFeedPosts'
import { useLightbox } from '@/features/feed/hooks/useLightbox'
import { useLikes } from '@/features/feed/hooks/useLikes'
import { usePendingUploads } from '@/features/feed/hooks/usePendingUploads'
import { usePostDeletion } from '@/features/feed/hooks/usePostDeletion'
import { usePostSharing } from '@/features/feed/hooks/usePostSharing'
import { usePullToRefresh } from '@/features/feed/hooks/usePullToRefresh'
import { useDialog } from '@/hooks/useDialog'
import { useFeedNotifications } from '@/hooks/useFeedNotifications'

import type { FeedViewMode } from '@/features/feed/types'

/** Photo wall: the posts of the party, live. */
export function FeedPage() {
  const [viewMode, setViewMode] = useState<FeedViewMode>('list')
  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const { notify, dialog } = useDialog()
  const notifications = useFeedNotifications()
  const pendingUploads = usePendingUploads()
  const guest = useFeedGuest()
  const feed = useFeedPosts(guest)
  const { posts, likedPostIds, isLoading, isRefreshing, refresh } = feed
  const filter = useFeedFilter(posts, guest)
  const likes = useLikes(feed, guest)
  const sharing = usePostSharing()
  const lightbox = useLightbox()
  const pull = usePullToRefresh(isRefreshing, refresh)

  const handleDeleted = (postId: string) => {
    feed.removePost(postId)
    if (lightbox.postId === postId) lightbox.close()
  }
  const deletion = usePostDeletion(handleDeleted, { notify })

  const handleRevealNewPosts = () => {
    feed.revealNewPosts()
    filter.setTab('all')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const lightboxPost = posts.find((post) => post.id === lightbox.postId) ?? null

  return (
    <div className="p-4 sm:p-6 lg:p-8" {...pull.touchHandlers}>
      <PullIndicator pull={pull} isRefreshing={isRefreshing} />

      <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-start">
        <div className="lg:col-span-8 space-y-6">
          <FeedToolbar
            guest={guest}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            isRefreshing={isRefreshing}
            onRefresh={() => void refresh()}
          />
          <FilterTabs
            activeTab={filter.tab}
            onChange={filter.setTab}
            postCount={posts.length}
          />

          {filter.challengeId !== null && (
            <ChallengeFilterPill
              challengeId={filter.challengeId}
              challenge={filter.challenge}
              onClear={filter.clearChallenge}
            />
          )}

          {pendingUploads.length > 0 && (
            <div className="space-y-3">
              {pendingUploads.map((task) => (
                <UploadCard key={task.id} task={task} />
              ))}
            </div>
          )}

          <NewPostsPill
            notifications={notifications}
            onReveal={handleRevealNewPosts}
            onDismiss={feed.revealNewPosts}
          />

          {isLoading ? (
            <FeedSkeleton />
          ) : filter.filteredPosts.length === 0 ? (
            <EmptyFeed
              hasPosts={posts.length > 0}
              challengeId={filter.challengeId}
            />
          ) : (
            <PostGrid
              filter={filter}
              feed={feed}
              guest={guest}
              likes={likes}
              sharing={sharing}
              viewMode={viewMode}
              unseenPostIds={notifications.unseenAwayPostIds}
              onOpenPost={lightbox.open}
              onDeletePost={deletion.requestDeletion}
            />
          )}

          <FeedFooter onOpenTerms={() => setIsTermsOpen(true)} />
        </div>

        <FeedSidebar posts={posts} />
      </div>

      <DeletePostModal deletion={deletion} />
      <PhotoLightboxModal
        post={lightboxPost}
        isLiked={lightboxPost !== null && likedPostIds.has(lightboxPost.id)}
        onClose={lightbox.close}
        onToggleLike={(postId) => void likes.toggleLike(postId)}
        onDownload={(post) => void sharing.downloadPost(post)}
        onShare={(post) => void sharing.sharePost(post)}
      />
      <ShareToast message={sharing.toastMessage} />
      {dialog}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <GuestNameModal
        isOpen={guest.authPrompt !== null}
        guestUser={guest.guestUser}
        reasonMessage={guest.authPrompt?.reason}
        redirectPath="/"
        onClose={guest.closeAuthPrompt}
        onAuthChanged={guest.setGuestUser}
      />
    </div>
  )
}
