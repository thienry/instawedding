import { MOCK_ADMIN_EMAIL } from '@/services/mock/mock-admin-auth.service'

interface MockAccount {
  readonly name: string
  readonly email: string
  readonly badge: string
  readonly badgeClass: string
  readonly hoverClass: string
}

const MOCK_ACCOUNTS: readonly MockAccount[] = [
  {
    name: 'Thiago (Noivo)',
    email: MOCK_ADMIN_EMAIL,
    badge: '👑 Admin',
    badgeClass: 'bg-gold-500/20 text-gold-500',
    hoverClass: 'hover:border-gold-500',
  },
  {
    name: 'Equipe Cerimonial',
    email: 'cerimonial@gmail.com',
    badge: '🛡️ Mod',
    badgeClass: 'bg-sage-200 text-sage-800',
    hoverClass: 'hover:border-sage-800',
  },
]

interface MockLoginShortcutsProps {
  readonly onSelect: (email: string) => void
}

/** One-click logins for development. Renders nothing with real services. */
export function MockLoginShortcuts({ onSelect }: MockLoginShortcutsProps) {
  if (import.meta.env.VITE_USE_MOCKS === 'false') return null

  return (
    <div className="pt-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-sage-800/70 block mb-2 text-center">
        Atalhos de Teste Rápido (Mock)
      </span>
      <div className="space-y-1.5">
        {MOCK_ACCOUNTS.map(({ name, email, badge, badgeClass, hoverClass }) => (
          <button
            key={email}
            type="button"
            onClick={() => onSelect(email)}
            className={`w-full p-2.5 rounded-xl border border-sage-200 bg-white ${hoverClass} hover:bg-sage-50/60 flex items-center justify-between text-left transition-colors`}>
            <div className="min-w-0">
              <span className="text-xs font-bold text-sage-900 block truncate">{name}</span>
              <span className="text-[11px] text-sage-800/60 block truncate">{email}</span>
            </div>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${badgeClass} shrink-0`}>
              {badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
