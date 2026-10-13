import { useEffect, useState, useRef, useCallback } from 'react';
import { Maximize2, Minimize2, Sparkles, Heart, QrCode, ArrowLeft, Camera } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Post } from '../types/domain';
import { getPostRepository, getRealtimeService } from '../services/repositories.factory';

const SLIDESHOW_INTERVAL_MS = 8000;
const FALLBACK_POLL_INTERVAL_MS = 30000;

export function ProjectorPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [newPostAlert, setNewPostAlert] = useState<Post | null>(null);

  const controlsTimeoutRef = useRef<number | null>(null);
  const postRepo = getPostRepository();
  const realtimeService = getRealtimeService();

  const loadPosts = useCallback(async () => {
    try {
      const fetched = await postRepo.getPosts();
      if (fetched.length > 0) {
        setPosts(fetched);
      }
    } catch {
      // Keep displaying current posts on error
    }
  }, [postRepo]);

  // Initial load & fallback polling
  useEffect(() => {
    loadPosts();

    const pollInterval = window.setInterval(() => {
      loadPosts();
    }, FALLBACK_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(pollInterval);
    };
  }, [loadPosts]);

  // Realtime subscription
  useEffect(() => {
    const unsubscribe = realtimeService.subscribeToNewPosts((incomingPost) => {
      setPosts((prev) => {
        if (prev.some((p) => p.id === incomingPost.id)) return prev;
        return [incomingPost, ...prev];
      });

      // Highlight new photo immediately
      setCurrentIndex(0);
      setNewPostAlert(incomingPost);

      // Dismiss alert banner after 6 seconds
      window.setTimeout(() => {
        setNewPostAlert((current) => (current?.id === incomingPost.id ? null : current));
      }, 6000);
    });

    return () => {
      unsubscribe();
    };
  }, [realtimeService]);

  // Slideshow auto-advance timer
  useEffect(() => {
    if (posts.length <= 1) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, SLIDESHOW_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [posts.length]);

  // Auto-hide controls after inactivity
  const handleMouseMove = () => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      setIsControlsVisible(false);
    }, 4000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const currentPost = posts[currentIndex];

  return (
    <div
      onMouseMove={handleMouseMove}
      className="min-h-screen w-screen bg-[#1A281E] text-sage-50 overflow-hidden relative select-none flex flex-col justify-between"
    >
      {/* Ambient background decoration */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold-400 via-transparent to-transparent" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sage-800/20 blur-3xl pointer-events-none" />

      {/* Top Wedding Header */}
      <header
        className={`relative z-30 px-8 py-5 flex items-center justify-between transition-opacity duration-500 bg-gradient-to-b from-[#142017]/90 to-transparent ${
          isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center space-x-4">
          <Link
            to="/"
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 backdrop-blur-md"
            title="Voltar ao Feed do App"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-serif text-2xl lg:text-3xl font-bold tracking-wide text-white flex items-center gap-2.5">
              <span>Thiago & Priscila</span>
              <span className="text-[11px] font-sans font-medium uppercase tracking-widest text-gold-400 border border-gold-400/40 px-2.5 py-0.5 rounded-full bg-gold-400/10">
                Ao Vivo
              </span>
            </h1>
            <p className="text-xs text-sage-200/80 font-sans tracking-wider">
              Mural de Memórias & Desafios da Festa
            </p>
          </div>
        </div>

        <button
          onClick={toggleFullscreen}
          className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10 backdrop-blur-md"
          title={isFullscreen ? 'Sair da Tela Cheia' : 'Modo Tela Cheia (F11)'}
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
        </button>
      </header>

      {/* New Photo Entrance Alert */}
      {newPostAlert && (
        <aside
          aria-live="polite"
          className="fixed top-24 inset-x-0 z-40 flex justify-center animate-in slide-in-from-top-4 duration-500 pointer-events-none"
        >
          <div className="bg-gradient-to-r from-gold-500 via-gold-400 to-gold-500 text-sage-950 px-7 py-3 rounded-full shadow-2xl flex items-center gap-3 font-semibold text-sm border-2 border-white/60">
            <Sparkles className="w-5 h-5 animate-spin" />
            <span>Nova foto na festa enviada por {newPostAlert.authorName}!</span>
          </div>
        </aside>
      )}

      {/* Main Wedding Photo Showcase */}
      <main className="flex-1 flex items-center justify-center p-4 lg:p-10 relative z-10">
        {currentPost ? (
          <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#FAF8F5] text-sage-900 p-6 lg:p-8 rounded-3xl shadow-2xl border border-gold-400/40 transition-all duration-700">
            {/* Fine Art Photo Frame */}
            <div className="lg:col-span-7 aspect-4/3 rounded-2xl overflow-hidden bg-sage-100 shadow-md relative border border-sage-200/80 flex items-center justify-center">
              <img
                key={currentPost.id}
                src={currentPost.mediaUrl}
                alt={currentPost.caption || `Foto por ${currentPost.authorName}`}
                className="w-full h-full object-cover animate-in fade-in zoom-in-95 duration-700"
              />
            </div>

            {/* Post Information & Romance Typography */}
            <div className="lg:col-span-5 flex flex-col justify-between h-full space-y-6 py-2">
              <div className="space-y-4">
                {currentPost.challenge ? (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold-400/15 text-gold-500 text-xs font-semibold border border-gold-400/30">
                    <span className="text-base">{currentPost.challenge.icon}</span>
                    <span>Desafio: {currentPost.challenge.title}</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-xs text-sage-800/60 uppercase tracking-widest font-semibold">
                    <Camera className="w-3.5 h-3.5 text-gold-500" />
                    <span>Registro Espontâneo</span>
                  </div>
                )}

                <div>
                  <span className="text-[11px] text-gold-500 uppercase tracking-widest font-bold">
                    Momento registrado por
                  </span>
                  <h2 className="font-serif text-3xl lg:text-4xl font-bold text-sage-900 tracking-tight mt-1">
                    {currentPost.authorName}
                  </h2>
                </div>

                {currentPost.caption ? (
                  <blockquote className="font-serif italic text-base lg:text-lg text-sage-800 leading-relaxed border-l-2 border-gold-500/50 pl-4 py-1">
                    &ldquo;{currentPost.caption}&rdquo;
                  </blockquote>
                ) : (
                  <p className="font-serif italic text-sm text-sage-800/60 pl-1">
                    Celebrando o grande dia com Thiago & Priscila ✨
                  </p>
                )}
              </div>

              {/* Likes counter badge */}
              <div className="pt-2 border-t border-sage-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100">
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  </div>
                  <span className="text-sm font-bold text-sage-900">
                    {currentPost.likesCount} {currentPost.likesCount === 1 ? 'curtida' : 'curtidas'}
                  </span>
                </div>

                <span className="text-xs text-sage-800/60 font-medium">
                  {currentIndex + 1} de {posts.length} fotos
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 bg-[#FAF8F5] text-sage-900 p-12 rounded-3xl shadow-2xl border border-gold-400/40 max-w-lg">
            <span className="text-5xl block animate-bounce">💍</span>
            <h2 className="font-serif text-2xl font-bold">
              Aguardando as fotos dos convidados...
            </h2>
            <p className="text-xs text-sage-800/80 leading-relaxed">
              Escaneie o QR Code das mesas com seu celular para tirar uma foto e aparecer no telão ao vivo!
            </p>
          </div>
        )}
      </main>

      {/* Bottom Thumbnails Strip & Wedding Invitation Callout */}
      <footer className="relative z-20 px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-t from-[#142017]/95 via-[#142017]/60 to-transparent">
        {/* Thumbnails row */}
        <div className="flex items-center gap-2.5 overflow-x-auto max-w-2xl py-1 scrollbar-none">
          {posts.slice(0, 10).map((post, idx) => (
            <button
              key={post.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                idx === currentIndex
                  ? 'border-gold-400 scale-105 shadow-lg shadow-gold-500/20 ring-2 ring-gold-400/40'
                  : 'border-white/20 opacity-60 hover:opacity-100 hover:border-white/40'
              }`}
            >
              <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>

        {/* QR Code Invitation Card */}
        <div className="flex items-center gap-3 bg-[#FAF8F5] text-sage-900 px-4 py-2.5 rounded-2xl border border-gold-400/50 shadow-xl shrink-0">
          <div className="w-10 h-10 rounded-xl bg-sage-900 text-white flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6 text-gold-400" />
          </div>
          <div>
            <p className="text-xs font-bold font-serif text-sage-900">
              Participe do Mural
            </p>
            <p className="text-[10px] text-sage-800/70 font-sans">
              Escaneie o QR Code na mesa e envie sua foto
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
