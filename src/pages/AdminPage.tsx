import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getAdminAuthService } from '@/services/admin-auth.factory'
import { getPostRepository } from '@/services/repositories.factory'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'
import type { Post } from '@/types/domain'

export function AdminPage() {
  const navigate = useNavigate()
  const isMockEnv = import.meta.env.VITE_USE_MOCKS === 'true'

  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [isVerifying, setIsVerifying] = useState(true)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

  // OTP Login states
  const [otpStep, setOtpStep] = useState<'email' | 'code'>('email')
  const [emailInput, setEmailInput] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [debugOtpCode, setDebugOtpCode] = useState<string | null>(null)

  // Post moderation states
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const postRepo = getPostRepository()
  const adminAuth = getAdminAuthService()

  useEffect(() => {
    let isMounted = true

    adminAuth.checkSession().then((hasSession) => {
      if (isMounted) {
        if (hasSession) {
          setCurrentUser(adminAuth.getCurrentUser())
        } else {
          setCurrentUser(null)
        }
        setIsVerifying(false)
      }
    })

    const unsubscribe = adminAuth.onAuthStateChange((user) => {
      if (isMounted) {
        setCurrentUser(user)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [adminAuth])

  useEffect(() => {
    if (!currentUser) return
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
  }, [currentUser, postRepo])

  const handleRequestOtp = async (
    e?: React.FormEvent,
    directEmail?: string
  ) => {
    if (e) e.preventDefault()
    const targetEmail = (directEmail || emailInput).trim().toLowerCase()
    if (!targetEmail) {
      setAuthError('Por favor, informe seu endereço de e-mail.')
      return
    }

    setAuthError('')
    setAuthSuccess('')
    setIsSubmitting(true)

    const result = await adminAuth.requestOtp(targetEmail)
    setIsSubmitting(false)

    if (result.success) {
      setEmailInput(targetEmail)
      setOtpStep('code')
      setAuthSuccess(
        result.message || 'Código de 6 dígitos enviado para seu e-mail!'
      )
      if (result.debugCode) {
        setDebugOtpCode(result.debugCode)
      }
    } else {
      setAuthError(
        result.message ||
          'Falha ao solicitar código. Verifique se o e-mail está cadastrado.'
      )
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = codeInput.trim()
    if (cleanCode.length !== 6) {
      setAuthError('O código deve conter exatamente 6 dígitos numéricos.')
      return
    }

    setAuthError('')
    setIsSubmitting(true)

    const result = await adminAuth.verifyOtp(emailInput, cleanCode)
    setIsSubmitting(false)

    if (result.success && result.user) {
      setCurrentUser(result.user)
      setOtpStep('email')
      setEmailInput('')
      setCodeInput('')
      setDebugOtpCode(null)
      setAuthSuccess('')
    } else {
      setAuthError(
        result.message || 'Código incorreto ou expirado. Tente novamente.'
      )
    }
  }

  const handleResetOtpStep = () => {
    setOtpStep('email')
    setCodeInput('')
    setAuthError('')
    setAuthSuccess('')
    setDebugOtpCode(null)
  }

  const handleForceClearAllSessions = async () => {
    await adminAuth.logout()
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear()
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('instawedding_mock_admin_user')
      localStorage.removeItem('instawedding_mock_admin_auth')
    }
    setCurrentUser(null)
    setAuthError('')
    setAuthSuccess('')
    handleResetOtpStep()
  }

  const handleLogout = async () => {
    await handleForceClearAllSessions()
  }

  const handleToggleApproval = async (postId: string) => {
    try {
      const newStatus = await postRepo.togglePostApproval(postId)
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, isApproved: newStatus } : p))
      )
    } catch {
      // Toggle failure
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (currentUser?.role !== 'admin') {
      alert('Apenas administradores podem excluir fotos definitivamente.')
      return
    }

    if (
      !window.confirm(
        'Tem certeza que deseja excluir esta foto permanentemente do banco de dados e telão?'
      )
    ) {
      return
    }

    try {
      await postRepo.deletePost(postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
    } catch {
      // Delete failure
    }
  }

  const handleClearAll = async () => {
    if (currentUser?.role !== 'admin') {
      alert('Apenas administradores podem zerar o feed.')
      return
    }

    const confirmation = window.prompt(
      'ATENÇÃO: Isso apagará todas as fotos de teste do banco antes do evento oficial.\nDigite "ZERAR" para confirmar:'
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

  // Not authenticated: Login Gate
  if (!currentUser) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[75vh] text-center space-y-5 animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-full bg-sage-100 text-sage-900 flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-7 h-7 text-sage-800" />
        </div>

        <div className="space-y-1.5">
          <h2 className="font-serif text-2xl font-bold text-sage-900">
            Acesso Restrito
          </h2>
          <p className="text-xs text-sage-800/70 max-w-xs mx-auto">
            {otpStep === 'email'
              ? 'Painel exclusivo para os Noivos (Administração) e Cerimonial (Moderação ao vivo).'
              : `Digite o código de 6 dígitos enviado para ${emailInput}.`}
          </p>
        </div>

        {authError && (
          <div className="w-full max-w-xs p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 text-left">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {authSuccess && (
          <div className="w-full max-w-xs p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{authSuccess}</span>
          </div>
        )}

        {debugOtpCode && (
          <div className="w-full max-w-xs p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ambiente de Teste (Código OTP):</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-extrabold tracking-widest text-amber-950">
                {debugOtpCode}
              </span>
              <button
                type="button"
                onClick={() => setCodeInput(debugOtpCode)}
                className="px-2 py-0.5 rounded-md bg-amber-200 hover:bg-amber-300 text-[10px] font-bold text-amber-900 transition-colors"
              >
                Preencher
              </button>
            </div>
          </div>
        )}

        <div className="w-full max-w-xs space-y-4">
          {otpStep === 'email' ? (
            /* STEP 1: Enter Email */
            <form onSubmit={handleRequestOtp} className="space-y-3">
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-sage-800/50" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="seu-email@gmail.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-sage-300 bg-white text-xs text-sage-900 placeholder:text-sage-800/40 focus:outline-none focus:ring-2 focus:ring-sage-800/30 transition-all shadow-xs"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-sage-800 hover:bg-sage-700 disabled:opacity-60 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando código...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Receber código por e-mail</span>
                  </>
                )}
              </button>

              {/* Dev / Mock Quick Selector */}
              {isMockEnv && (
                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sage-800/70 block mb-2 text-center">
                    Atalhos de Teste Rápido (Mock)
                  </span>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleRequestOtp(undefined, 'thmoura14@gmail.com')
                      }
                      className="w-full p-2.5 rounded-xl border border-sage-200 bg-white hover:border-gold-500 hover:bg-sage-50/60 flex items-center justify-between text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-sage-900 block truncate">
                          Thiago (Noivo)
                        </span>
                        <span className="text-[11px] text-sage-800/60 block truncate">
                          thmoura14@gmail.com
                        </span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-gold-500/20 text-gold-600 shrink-0">
                        👑 Admin
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleRequestOtp(undefined, 'cerimonial@gmail.com')
                      }
                      className="w-full p-2.5 rounded-xl border border-sage-200 bg-white hover:border-sage-400 hover:bg-sage-50/60 flex items-center justify-between text-left transition-colors"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-sage-900 block truncate">
                          Equipe Cerimonial
                        </span>
                        <span className="text-[11px] text-sage-800/60 block truncate">
                          cerimonial@gmail.com
                        </span>
                      </div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-sage-200 text-sage-850 shrink-0">
                        🛡️ Mod
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          ) : (
            /* STEP 2: Enter 6-digit OTP Code */
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div className="space-y-1">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  required
                  value={codeInput}
                  onChange={(e) =>
                    setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-2xl border border-sage-300 bg-white text-center font-mono text-xl tracking-[0.4em] font-bold text-sage-900 focus:outline-none focus:ring-2 focus:ring-sage-800/30 transition-all shadow-xs"
                />
                <p className="text-[11px] text-sage-800/60 text-center">
                  Digite os 6 dígitos numéricos
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || codeInput.length !== 6}
                className="w-full py-3.5 px-4 rounded-2xl bg-sage-800 hover:bg-sage-700 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-xs active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Confirmar Código e Entrar</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleResetOtpStep}
                  className="text-xs text-sage-800/70 hover:text-sage-900 font-medium transition-colors"
                >
                  ← Trocar e-mail ou reenviar código
                </button>
              </div>
            </form>
          )}

          {/* Force Clear Sessions / Reset */}
          <div className="pt-3 border-t border-sage-200/80">
            <button
              type="button"
              onClick={handleForceClearAllSessions}
              className="text-[11px] text-sage-800/60 hover:text-rose-600 transition-colors inline-flex items-center gap-1.5"
              title="Limpar qualquer resquício de sessão antiga do navegador"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Limpar sessões salvas / Deslogar tudo</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated State (RBAC Protected Dashboard)
  const isAdmin = currentUser.role === 'admin'

  return (
    <div className="p-4 space-y-4">
      {/* Top Bar with User Info & Explicit Logout */}
      <div className="bg-white rounded-2xl p-4 border border-sage-200 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center space-x-3 min-w-0">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full border border-sage-200 object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-sage-100 text-sage-900 font-bold flex items-center justify-center border border-sage-200 text-sm shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-bold text-sage-900 leading-tight truncate">
                {currentUser.name}
              </h3>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm shrink-0 ${
                  isAdmin
                    ? 'bg-gold-500/20 text-gold-600'
                    : 'bg-sage-200 text-sage-850'
                }`}
              >
                {isAdmin ? '👑 Admin' : '🛡️ Moderador'}
              </span>
            </div>
            <p className="text-[11px] text-sage-800/60 leading-tight truncate">
              {currentUser.email}
            </p>
          </div>
        </div>

        {/* Visible Logout Button */}
        <button
          onClick={handleLogout}
          title="Encerrar sessão e deslogar"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors shadow-2xs shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
      </div>

      {/* Navigation Return */}
      <div className="flex items-center justify-between pb-1">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-xs text-sage-800 hover:text-sage-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para o Feed</span>
        </button>

        <span className="text-xs text-sage-800/70 flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Sessão Segura</span>
        </span>
      </div>

      {/* Stats & Destructive Actions */}
      <div className="bg-white rounded-2xl p-4 border border-sage-200 flex items-center justify-between shadow-xs">
        <div>
          <p className="text-xs text-sage-800/70">Total de Fotos Enviadas</p>
          <h3 className="font-serif text-2xl font-bold text-sage-900">
            {posts.length}
          </h3>
        </div>

        {isAdmin ? (
          <button
            onClick={handleClearAll}
            title="Apenas Admin: apaga todos os posts de teste"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Zerar Fotos</span>
          </button>
        ) : (
          <span className="text-[10px] text-sage-800/70 bg-sage-100 px-2.5 py-1.5 rounded-lg border border-sage-200 text-right">
            Modo Cerimonial
          </span>
        )}
      </div>

      {/* Posts Moderation List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-sage-800/80">
            Fila de Moderação
          </h4>
          <span className="text-[11px] text-sage-800/60">
            {posts.filter((p) => p.isApproved).length} aprovadas /{' '}
            {posts.filter((p) => !p.isApproved).length} ocultas
          </span>
        </div>

        {isLoading ? (
          <p className="text-xs text-center text-sage-800/60 py-6">
            Carregando fila de publicações...
          </p>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-xs text-sage-800/60 bg-white rounded-2xl border border-sage-200 shadow-xs">
            Nenhuma foto no sistema no momento.
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className={`p-3 rounded-2xl border transition-all flex items-center gap-3 bg-white shadow-2xs ${
                post.isApproved
                  ? 'border-sage-200'
                  : 'border-rose-300 bg-rose-50/20'
              }`}
            >
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-sage-100 shrink-0 border border-sage-200">
                <img
                  src={post.mediaUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <h5 className="text-xs font-bold text-sage-900 truncate">
                    {post.authorName}
                  </h5>
                  <span
                    className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
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

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Moderate: Toggle Approval (Available to Admin & Moderator) */}
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

                {/* Permanent Deletion: Restricted strictly to Admin role */}
                {isAdmin && (
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    title="Excluir Definitivamente (Apenas Admin)"
                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
