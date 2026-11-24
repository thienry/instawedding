import { ArrowLeft, Lock } from 'lucide-react'
import { Link } from 'react-router-dom'

/** Shown to visitors without access to the projector. */
export function ProjectorLocked() {
  return (
    <div className="projector-ground h-dvh w-full flex items-center justify-center p-6">
      <div className="projector-rise max-w-md w-full text-center">
        <Lock className="w-6 h-6 text-gold-400 mx-auto" strokeWidth={1.5} />
        <h1 className="mt-6 font-serif text-4xl text-balance">
          Modo Telão Bloqueado
        </h1>
        <p className="mt-4 text-sm text-white/65 leading-relaxed">
          O acesso à exibição do telão é exclusivo para Administradores e
          Moderadores autenticados.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/admin"
            className="py-3 px-5 rounded-full bg-gold-400 hover:bg-[#d8bf9b] text-sage-900 text-sm font-semibold transition-colors"
          >
            Entrar como Admin / Moderador
          </Link>
          <Link
            to="/"
            className="py-3 px-5 rounded-full text-white/75 hover:text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Feed
          </Link>
        </div>
      </div>
    </div>
  )
}
