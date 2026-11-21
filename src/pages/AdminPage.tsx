import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Image as ImageIcon,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  Tv,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getAdminAuthService } from '@/services/admin-auth.factory'
import {
  getChallengeRepository,
  getPostRepository,
} from '@/services/repositories.factory'
import { resolvePostMediaType } from '@/utils/video'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'
import type { Challenge, Post } from '@/types/domain'

type AdminTab = 'photos' | 'challenges'
type PhotoModerationFilter = 'all' | 'approved' | 'hidden'

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

  // Dashboard tabs & data states
  const [activeTab, setActiveTab] = useState<AdminTab>('photos')
  const [photoFilter, setPhotoFilter] = useState<PhotoModerationFilter>('all')
  const [posts, setPosts] = useState<Post[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDownloadingAlbum, setIsDownloadingAlbum] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<{
    current: number
    total: number
  } | null>(null)

  // New Challenge Form states
  const [newChallengeIcon, setNewChallengeIcon] = useState('🥂')
  const [newChallengeTitle, setNewChallengeTitle] = useState('')
  const [newChallengeDesc, setNewChallengeDesc] = useState('')
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false)

  const postRepo = getPostRepository()
  const challengeRepo = getChallengeRepository()
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

    Promise.all([
      postRepo.getAllPostsForModeration(),
      challengeRepo.getAllChallenges(),
    ])
      .then(([allPosts, allChallenges]) => {
        if (isMounted) {
          setPosts(allPosts)
          setChallenges(allChallenges)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [currentUser, postRepo, challengeRepo])

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

  const handleDownloadAlbum = async () => {
    const approvedPosts = posts.filter((p) => p.isApproved)
    if (approvedPosts.length === 0) {
      alert('Não há fotos aprovadas para baixar.')
      return
    }

    setIsDownloadingAlbum(true)
    setDownloadProgress({ current: 0, total: approvedPosts.length })

    for (let i = 0; i < approvedPosts.length; i++) {
      const post = approvedPosts[i]
      setDownloadProgress({ current: i + 1, total: approvedPosts.length })
      try {
        const res = await fetch(post.mediaUrl)
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        const safeAuthor = post.authorName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
        const ext = resolvePostMediaType(post) === 'video' ? 'mp4' : 'webp'
        a.download = `midia-${String(i + 1).padStart(3, '0')}-${safeAuthor}.${ext}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        await new Promise((resolve) => window.setTimeout(resolve, 350))
      } catch {
        // Continue to next photo if individual fetch fails
      }
    }

    setIsDownloadingAlbum(false)
    setDownloadProgress(null)
  }

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChallengeTitle.trim() || !newChallengeDesc.trim()) return

    setIsCreatingChallenge(true)
    try {
      const created = await challengeRepo.createChallenge({
        title: newChallengeTitle.trim(),
        description: newChallengeDesc.trim(),
        icon: newChallengeIcon.trim() || '✨',
      })
      setChallenges((prev) => [...prev, created])
      setNewChallengeTitle('')
      setNewChallengeDesc('')
      setNewChallengeIcon('✨')
    } catch {
      alert('Falha ao criar desafio. Verifique as permissões no Supabase.')
    } finally {
      setIsCreatingChallenge(false)
    }
  }

  const handleToggleChallenge = async (id: number) => {
    try {
      const newStatus = await challengeRepo.toggleChallengeActive(id)
      setChallenges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isActive: newStatus } : c))
      )
    } catch {
      alert('Não foi possível alterar o status do desafio.')
    }
  }

  const handleDeleteChallenge = async (id: number) => {
    if (currentUser?.role !== 'admin') {
      alert('Apenas administradores podem excluir desafios.')
      return
    }
    if (!window.confirm('Deseja excluir este desafio permanentemente?')) {
      return
    }
    try {
      await challengeRepo.deleteChallenge(id)
      setChallenges((prev) => prev.filter((c) => c.id !== id))
    } catch {
      alert('Não foi possível excluir o desafio.')
    }
  }

  const filteredPosts = useMemo(() => {
    if (photoFilter === 'approved') return posts.filter((p) => p.isApproved)
    if (photoFilter === 'hidden') return posts.filter((p) => !p.isApproved)
    return posts
  }, [posts, photoFilter])

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
              ? 'Painel exclusivo para os Noivos (Administração) e Cerimonial (Moderação).'
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Bar with User Info & Explicit Logout */}
      <div className="bg-white rounded-3xl p-5 border border-sage-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5 min-w-0">
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.name}
              className="w-12 h-12 rounded-full border border-sage-200 object-cover shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-sage-100 text-sage-900 font-bold flex items-center justify-center border border-sage-200 text-base shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-sage-900 leading-tight truncate">
                {currentUser.name}
              </h3>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-md shrink-0 ${
                  isAdmin
                    ? 'bg-gold-500/20 text-gold-500'
                    : 'bg-sage-200 text-sage-800'
                }`}
              >
                {isAdmin ? '👑 Admin' : '🛡️ Moderador'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-sage-800/65 leading-tight truncate mt-0.5">
              {currentUser.email}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          title="Encerrar sessão e deslogar"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-bold border border-rose-200 transition-colors shadow-2xs shrink-0"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>
      </div>

      {/* Navigation Return & Projector Shortcut */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-sage-200 text-sm text-sage-800 hover:text-sage-900 hover:bg-sage-100 transition-colors font-semibold shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para o Feed</span>
          </button>

          <button
            onClick={() => navigate('/projector')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-sage-900 hover:bg-sage-800 text-sm text-white transition-colors font-semibold shadow-2xs"
          >
            <Tv className="w-4 h-4 text-gold-400" />
            <span>Abrir Modo Telão</span>
          </button>
        </div>

        <span className="text-xs sm:text-sm text-sage-800/75 flex items-center gap-1.5 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Sessão Administrativa Segura</span>
        </span>
      </div>

      {/* Main Section Switcher: Photos vs Challenges */}
      <div className="grid grid-cols-2 gap-2.5 bg-sage-200/70 p-1.5 rounded-2xl max-w-md">
        <button
          type="button"
          onClick={() => setActiveTab('photos')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'photos'
              ? 'bg-white text-sage-900 shadow-xs'
              : 'text-sage-800 hover:text-sage-900'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Fotos ({posts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('challenges')}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'challenges'
              ? 'bg-white text-sage-900 shadow-xs'
              : 'text-sage-800 hover:text-sage-900'
          }`}
        >
          <Trophy className="w-4 h-4 text-gold-500" />
          <span>Desafios ({challenges.length})</span>
        </button>
      </div>

      {activeTab === 'photos' ? (
        <>
          {/* Stats & Album Actions */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-sage-200 space-y-4 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-sage-800/75 font-medium">
                  Total de Fotos Enviadas na Festa
                </p>
                <h3 className="font-serif text-3xl font-bold text-sage-900 mt-0.5">
                  {posts.length}
                </h3>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={isDownloadingAlbum || posts.length === 0}
                  onClick={handleDownloadAlbum}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 text-white text-sm font-semibold transition-colors shadow-xs"
                >
                  {isDownloadingAlbum ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {downloadProgress
                          ? `${downloadProgress.current}/${downloadProgress.total}`
                          : 'Baixando...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Baixar Álbum Completo</span>
                    </>
                  )}
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    title="Apenas Admin: apaga todos os posts de teste"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold border border-rose-200 transition-colors shadow-2xs"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Zerar Feed</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-sage-100">
              <button
                type="button"
                onClick={() => setPhotoFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                  photoFilter === 'all'
                    ? 'bg-sage-900 text-white'
                    : 'bg-sage-100 text-sage-800 hover:bg-sage-200'
                }`}
              >
                Todas ({posts.length})
              </button>
              <button
                type="button"
                onClick={() => setPhotoFilter('approved')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                  photoFilter === 'approved'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                Aprovadas ({posts.filter((p) => p.isApproved).length})
              </button>
              <button
                type="button"
                onClick={() => setPhotoFilter('hidden')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                  photoFilter === 'hidden'
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                Ocultas ({posts.filter((p) => !p.isApproved).length})
              </button>
            </div>
          </div>

          {/* Posts Moderation Grid */}
          <div>
            {isLoading ? (
              <p className="text-sm text-center text-sage-800/60 py-8">
                Carregando fila de postagens...
              </p>
            ) : filteredPosts.length === 0 ? (
              <div className="p-10 text-center text-sm text-sage-800/65 bg-white rounded-3xl border border-sage-200 shadow-xs">
                Nenhuma foto encontrada neste filtro.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className={`p-4 rounded-3xl border transition-all flex items-center gap-4 bg-white shadow-2xs ${
                      post.isApproved
                        ? 'border-sage-200'
                        : 'border-rose-300 bg-rose-50/25'
                    }`}
                  >
                    <div className="w-18 h-18 rounded-2xl overflow-hidden bg-sage-100 shrink-0 border border-sage-200 relative">
                      {resolvePostMediaType(post) === 'video' ? (
                        <video
                          src={post.mediaUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={post.mediaUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm sm:text-base font-bold text-sage-900 truncate">
                          {post.authorName}
                        </h5>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            post.isApproved
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {post.isApproved ? 'No Telão' : 'Oculto'}
                        </span>
                      </div>

                      {post.caption && (
                        <p className="text-xs sm:text-sm text-sage-800/80 truncate">
                          {post.caption}
                        </p>
                      )}

                      <p className="text-xs text-sage-800/55">
                        {new Date(post.createdAt).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleApproval(post.id)}
                        title={
                          post.isApproved
                            ? 'Ocultar do Telão'
                            : 'Aprovar no Telão'
                        }
                        className={`p-2.5 rounded-xl transition-colors ${
                          post.isApproved
                            ? 'text-sage-800 hover:bg-sage-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {post.isApproved ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          title="Excluir Definitivamente (Apenas Admin)"
                          className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* CHALLENGES MANAGEMENT TAB */
        <div className="space-y-6">
          {/* Create Challenge Form */}
          <form
            onSubmit={handleCreateChallenge}
            className="w-full bg-white rounded-3xl p-5 sm:p-6 border border-sage-200 shadow-xs space-y-4"
          >
            <h4 className="text-sm font-bold uppercase tracking-wider text-sage-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-gold-500" />
              <span>Criar Novo Desafio</span>
            </h4>

            <div className="grid grid-cols-4 lg:grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-1 lg:col-span-2 xl:col-span-1">
                <label className="text-xs font-bold text-sage-800 block mb-1.5">
                  Ícone
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={newChallengeIcon}
                  onChange={(e) => setNewChallengeIcon(e.target.value)}
                  placeholder="🥂"
                  className="w-full h-11 px-3 rounded-xl border border-sage-200 text-center text-lg bg-white"
                />
              </div>
              <div className="col-span-3 lg:col-span-4 xl:col-span-5">
                <label className="text-xs font-bold text-sage-800 block mb-1.5">
                  Título do Desafio
                </label>
                <input
                  type="text"
                  required
                  value={newChallengeTitle}
                  onChange={(e) => setNewChallengeTitle(e.target.value)}
                  placeholder="Ex: Selfie com os Noivos"
                  className="w-full h-11 px-3.5 rounded-xl border border-sage-200 text-sm bg-white"
                />
              </div>
              <div className="col-span-4 lg:col-span-6">
                <label className="text-xs font-bold text-sage-800 block mb-1.5">
                  Descrição para os Convidados
                </label>
                <input
                  type="text"
                  required
                  value={newChallengeDesc}
                  onChange={(e) => setNewChallengeDesc(e.target.value)}
                  placeholder="Ex: Tire uma selfie divertida ao lado de Thiago & Priscila!"
                  className="w-full h-11 px-3.5 rounded-xl border border-sage-200 text-sm bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreatingChallenge}
              className="w-full py-3 px-4 rounded-xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {isCreatingChallenge ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Adicionar Desafio à Festa</span>
                </>
              )}
            </button>
          </form>

          {/* Existing Challenges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className={`p-4 rounded-3xl border bg-white flex items-center justify-between gap-4 shadow-2xs ${
                  challenge.isActive
                    ? 'border-sage-200'
                    : 'border-sage-200/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-sage-50 border border-sage-200 flex items-center justify-center text-2xl shrink-0">
                    {challenge.icon}
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm sm:text-base font-bold text-sage-900 truncate">
                        {challenge.title}
                      </h5>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          challenge.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {challenge.isActive ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-sage-800/75 truncate">
                      {challenge.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleChallenge(challenge.id)}
                    title={
                      challenge.isActive ? 'Pausar Desafio' : 'Ativar Desafio'
                    }
                    className="p-2.5 rounded-xl text-sage-800 hover:bg-sage-100 transition-colors"
                  >
                    {challenge.isActive ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteChallenge(challenge.id)}
                      title="Excluir Desafio"
                      className="p-2.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
