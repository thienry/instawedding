import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getAdminAuthService } from '@/services/admin-auth.factory'
import { getPostRepository } from '@/services/repositories.factory'

import type { Post } from '@/types/domain'

export function AdminPage() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState('')

  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const postRepo = getPostRepository()
  const adminAuth = getAdminAuthService()

  useEffect(() => {
    let isMounted = true
    adminAuth.checkSession().then((hasSession) => {
      if (isMounted) {
        setIsAuthenticated(hasSession)
        setIsVerifying(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [adminAuth])

  useEffect(() => {
    if (!isAuthenticated) return
    let isMounted = true

    postRepo
      .getAllPostsForModeration()
      .then((all) => {
        if (isMounted) {
          setPosts(all)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isAuthenticated, postRepo])

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPinError('')
    const result = await adminAuth.loginWithPin(pinInput)
    if (result.success) {
      setIsAuthenticated(true)
      setPinInput('')
    } else {
      setPinError(result.message || 'PIN incorreto. Tente novamente.')
      setPinInput('')
    }
  }

  const handleLogout = async () => {
    await adminAuth.logout()
    setIsAuthenticated(false)
  }

  const handleToggleApproval = async (postId: string) => {
    try {
      const newStatus = await postRepo.togglePostApproval(postId)
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isApproved: newStatus } : p))
      )
    } catch {
      // Failed to toggle
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (
      !window.confirm(
        'Tem certeza que deseja excluir esta foto permanentemente?'
      )
    )
      return
    try {
      await postRepo.deletePost(postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch {
      // Failed to delete
    }
  }

  const handleClearAll = async () => {
    const confirmation = window.prompt(
      'ATENÇÃO: Isso apagará todas as fotos de teste do banco/mural antes do evento oficial.\nDigite "ZERAR" para confirmar:'
    )
    if (confirmation === 'ZERAR') {
      await postRepo.clearAllPosts()
      setPosts([])
    }
  }

  if (isVerifying) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
        <div className="w-8 h-8 border-2 border-sage-800 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-sage-800/70">Verificando credenciais...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[70vh] text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-sage-100 text-sage-900 flex items-center justify-center">
          <Lock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-xl font-bold text-sage-900">
            Painel do Cerimonial
          </h2>
          <p className="text-xs text-sage-800/70 max-w-xs">
            Digite o PIN de segurança para moderar as fotos do telão (PIN
            padrão: 2026).
          </p>
        </div>

        <form
          onSubmit={handlePinSubmit}
          className="w-full max-w-xs space-y-3 pt-2"
        >
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="Digite o PIN"
            className="w-full px-4 py-3 rounded-xl border border-sage-200 bg-white text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-sage-800/30"
          />
          {pinError && <p className="text-xs text-rose-600">{pinError}</p>}

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-sage-900 hover:bg-sage-800 text-white text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm"
          >
            Acessar Painel
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2 border-b border-sage-200/80">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-sage-800 hover:text-sage-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao App</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sage-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Moderação Ativa</span>
          </div>

          <button
            onClick={handleLogout}
            title="Encerrar Sessão de Moderação"
            className="p-1.5 rounded-lg text-sage-800 hover:bg-sage-100 hover:text-sage-900 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats & Actions */}
      <div className="bg-white rounded-2xl p-4 border border-sage-200 flex items-center justify-between shadow-xs">
        <div>
          <p className="text-xs text-sage-800/70">Total de Publicações</p>
          <h3 className="font-serif text-2xl font-bold text-sage-900">
            {posts.length}
          </h3>
        </div>

        <button
          onClick={handleClearAll}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Zerar Posts de Teste</span>
        </button>
      </div>

      {/* Posts List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-sage-800/80">
          Gerenciar Fotos
        </h4>

        {isLoading ? (
          <p className="text-xs text-center text-sage-800/60 py-4">
            Carregando...
          </p>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-xs text-sage-800/60 bg-white rounded-2xl border border-sage-200">
            Nenhuma foto no sistema no momento.
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className={`p-3 rounded-2xl border transition-all flex items-center gap-3 bg-white ${
                post.isApproved
                  ? 'border-sage-200'
                  : 'border-rose-300 bg-rose-50/30'
              }`}
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-sage-100 shrink-0 border border-sage-200">
                <img
                  src={post.mediaUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold text-sage-900 truncate">
                    {post.authorName}
                  </h5>
                  <span
                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${
                      post.isApproved
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {post.isApproved ? 'No Telão' : 'Oculto'}
                  </span>
                </div>

                {post.caption && (
                  <p className="text-[11px] text-sage-800/80 truncate">
                    {post.caption}
                  </p>
                )}

                <p className="text-[10px] text-sage-800/50">
                  {new Date(post.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleToggleApproval(post.id)}
                  title={
                    post.isApproved ? 'Ocultar do Telão' : 'Aprovar no Telão'
                  }
                  className={`p-2 rounded-xl transition-colors ${
                    post.isApproved
                      ? 'text-sage-800 hover:bg-sage-100'
                      : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                  }`}
                >
                  {post.isApproved ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={() => handleDeletePost(post.id)}
                  title="Excluir Definitivamente"
                  className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
