import type { CreatePostDTO, Post, ToggleLikeResult } from '@/types/domain'

export interface PostRepository {
  getPosts(): Promise<Post[]>
  /** Ids of every approved post, to notice the ones hidden or deleted. */
  getVisiblePostIds(): Promise<ReadonlySet<string>>
  /** Ids of every approved post that no moderator took off the projector. */
  getProjectorPostIds(): Promise<ReadonlySet<string>>
  getAllPostsForModeration(): Promise<Post[]>
  /** Creates a post. One already created with the same id is returned as is. */
  createPost(dto: CreatePostDTO): Promise<Post>
  toggleLike(postId: string, sessionId: string): Promise<ToggleLikeResult>
  hasUserLiked(postId: string, sessionId: string): Promise<boolean>
  getLikedPostIds(sessionId: string): Promise<Set<string>>
  /** Shows or hides a post. */
  setPostApproval(postId: string, isApproved: boolean): Promise<void>
  /** Sets the choice of the moderators about the projector (see `Post.hiddenFromProjector`). */
  setPostProjectorHidden(postId: string, isHidden: boolean | null): Promise<void>
  /** Deletes a post of the current guest. */
  deletePost(postId: string): Promise<void>
  deletePostAsAdmin(postId: string): Promise<void>
  clearAllPosts(): Promise<void>
}
