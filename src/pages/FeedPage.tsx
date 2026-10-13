import { useEffect, useState, useCallback } from 'react';
import { Heart, Sparkles, RefreshCw } from 'lucide-react';
import type { Post } from '../types/domain';
import { getPostRepository, getRealtimeService } from '../services/repositories.factory';
import { getGuestSession } from '../utils/session';
import { Link } from 'react-router-dom';

export function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const postRepo = getPostRepository();
  const realtimeService = getRealtimeService();
  const session = getGuestSession();

  const loadPosts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const fetchedPosts = await postRepo.getPosts();
      setPosts(fetchedPosts);

      // Check which posts the current guest liked
      const likedChecks = await Promise.all(
        fetchedPosts.map(async (p) => {
          const isLiked = await postRepo.hasUserLiked(p.id, session.sessionId);
          return { id: p.id, isLiked };
        })
      );

      const likedSet = new Set<string>();
      for (const item of likedChecks) {
        if (item.isLiked) likedSet.add(item.id);
      }
      setLikedPostIds(likedSet);
    } catch {
      // Failed to load posts
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [postRepo, session.sessionId]);

  useEffect(() => {
    loadPosts();

    // Subscribe to new posts in realtime
    const unsubscribe = realtimeService.subscribeToNewPosts((newPost) => {
      setPosts((prev) => {
        if (prev.some((p) => p.id === newPost.id)) return prev;
        return [newPost, ...prev];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [loadPosts, realtimeService]);

  const handleToggleLike = async (postId: string) => {
    const isCurrentlyLiked = likedPostIds.has(postId);

    // Optimistic UI update
    setLikedPostIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const newCount = isCurrentlyLiked
          ? Math.max(0, p.likesCount - 1)
          : p.likesCount + 1;
        return { ...p, likesCount: newCount };
      })
    );

    try {
      const result = await postRepo.toggleLike(postId, session.sessionId);
      // Synchronize with server/storage response
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likesCount: result.likesCount } : p))
      );
    } catch {
      // Rollback on failure
      setLikedPostIds((prev) => {
        const next = new Set(prev);
        if (isCurrentlyLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
    }
  };

  const formatTimestamp = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      if (diffMin < 1) return 'Agora mesmo';
      if (diffMin < 60) return `há ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `há ${diffHours} h`;
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Top Banner / Pull to Refresh */}
      <div className="flex items-center justify-between pb-1">
        <span className="text-xs font-medium text-sage-800/70">
          Feed de Momentos
        </span>
        <button
          onClick={() => loadPosts(true)}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 text-xs text-sage-800 hover:text-sage-900 transition-colors p-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="bg-white rounded-2xl p-4 border border-sage-200/60 animate-pulse space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-sage-200 rounded-full" />
                <div className="h-4 bg-sage-200 rounded w-24" />
              </div>
              <div className="h-64 bg-sage-200 rounded-xl" />
              <div className="h-4 bg-sage-200 rounded w-48" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-sage-200 text-center space-y-3 shadow-xs">
          <span className="text-3xl block">📷</span>
          <h3 className="font-serif text-lg font-bold text-sage-900">
            Nenhuma foto publicada ainda
          </h3>
          <p className="text-xs text-sage-800/70 max-w-xs mx-auto">
            Seja o primeiro a registrar e compartilhar um momento especial da festa!
          </p>
          <Link
            to="/capture"
            className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-full bg-sage-900 text-white text-xs font-semibold hover:bg-sage-800 transition-colors shadow-sm"
          >
            Tirar Primeira Foto
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => {
            const isLiked = likedPostIds.has(post.id);

            return (
              <article
                key={post.id}
                className="bg-white rounded-2xl overflow-hidden border border-sage-200/70 shadow-xs transition-all"
              >
                {/* Author Header */}
                <div className="p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-full bg-sage-100 text-sage-900 font-serif font-bold text-xs flex items-center justify-center border border-sage-200">
                      {post.authorName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-sage-900 leading-none">
                        {post.authorName}
                      </h4>
                      <span className="text-[10px] text-sage-800/60 leading-none">
                        {formatTimestamp(post.createdAt)}
                      </span>
                    </div>
                  </div>

                  {post.challenge && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-gold-400/15 text-gold-500 border border-gold-400/30">
                      <span>{post.challenge.icon}</span>
                      <span>{post.challenge.title}</span>
                    </span>
                  )}
                </div>

                {/* Media Image */}
                <div className="relative aspect-4/3 bg-sage-100 overflow-hidden">
                  <img
                    src={post.mediaUrl}
                    alt={post.caption || `Foto por ${post.authorName}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Post Actions & Caption */}
                <div className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleToggleLike(post.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-sage-900 hover:opacity-80 active:scale-95 transition-all"
                    >
                      <Heart
                        className={`w-5 h-5 transition-colors ${
                          isLiked
                            ? 'fill-rose-500 text-rose-500'
                            : 'text-sage-800/70 stroke-[1.75]'
                        }`}
                      />
                      <span>{post.likesCount}</span>
                    </button>

                    {post.challengeId && (
                      <span className="text-[10px] text-sage-800/60 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-gold-500" />
                        Desafio Concluído
                      </span>
                    )}
                  </div>

                  {post.caption && (
                    <p className="text-xs text-sage-800/90 leading-relaxed pt-0.5">
                      <span className="font-semibold text-sage-900 mr-1.5">
                        {post.authorName}
                      </span>
                      {post.caption}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
