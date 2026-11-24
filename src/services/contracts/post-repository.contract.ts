import type { CreatePostDTO, Post, ToggleLikeResult } from '@/types/domain'

export interface PostRepository {
  getPosts(): Promise<Post[]>
  getAllPostsForModeration(): Promise<Post[]>
  /** Creates a post. One already created with the same id is returned as is. */
  createPost(dto: CreatePostDTO): Promise<Post>
  toggleLike(postId: string, sessionId: string): Promise<ToggleLikeResult>
  hasUserLiked(postId: string, sessionId: string): Promise<boolean>
  getLikedPostIds(sessionId: string): Promise<Set<string>>
  togglePostApproval(postId: string): Promise<boolean>
  /** Deletes a post of the current guest. */
  deletePost(postId: string): Promise<void>
  deletePostAsAdmin(postId: string): Promise<void>
  clearAllPosts(): Promise<void>
}
