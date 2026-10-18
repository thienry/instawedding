import type { CreatePostDTO, Post, ToggleLikeResult } from '@/types/domain'

export interface PostRepository {
  getPosts(): Promise<Post[]>
  getAllPostsForModeration(): Promise<Post[]>
  createPost(dto: CreatePostDTO): Promise<Post>
  toggleLike(postId: string, sessionId: string): Promise<ToggleLikeResult>
  hasUserLiked(postId: string, sessionId: string): Promise<boolean>
  getLikedPostIds(sessionId: string): Promise<Set<string>>
  togglePostApproval(postId: string): Promise<boolean>
  deletePost(postId: string): Promise<void>
  clearAllPosts(): Promise<void>
}
