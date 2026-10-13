import type { CreatePostDTO, Post, ToggleLikeResult } from '../../types/domain';

export interface PostRepository {
  getPosts(): Promise<Post[]>;
  createPost(dto: CreatePostDTO): Promise<Post>;
  toggleLike(postId: string, sessionId: string): Promise<ToggleLikeResult>;
  hasUserLiked(postId: string, sessionId: string): Promise<boolean>;
}
