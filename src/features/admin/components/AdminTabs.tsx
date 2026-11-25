import { Image as ImageIcon, Trophy, UserCheck } from 'lucide-react'

import type { AdminTab } from '@/features/admin/types'
import type { LucideIcon } from 'lucide-react'

interface TabOption {
  readonly id: AdminTab
  readonly label: string
  readonly Icon: LucideIcon
  readonly iconClass: string
}

const PHOTOS_AND_CHALLENGES: readonly TabOption[] = [
  { id: 'photos', label: 'Fotos', Icon: ImageIcon, iconClass: 'w-4 h-4' },
  {
    id: 'challenges',
    label: 'Desafios',
    Icon: Trophy,
    iconClass: 'w-4 h-4 text-gold-600',
  },
]

const ALL_TABS: readonly TabOption[] = [
  ...PHOTOS_AND_CHALLENGES,
  {
    id: 'ceremonial',
    label: 'Cerimonial',
    Icon: UserCheck,
    iconClass: 'w-4 h-4 text-emerald-600',
  },
]

interface AdminTabsProps {
  readonly activeTab: AdminTab
  readonly onChange: (tab: AdminTab) => void
  /** Number of items shown next to each tab label. */
  readonly counts: Readonly<Record<AdminTab, number>>
  /** Whether the ceremonialists tab is available. */
  readonly isAdmin: boolean
}

/** Switches between the dashboard sections. */
export function AdminTabs({ activeTab, onChange, counts, isAdmin }: AdminTabsProps) {
  const tabs = isAdmin ? ALL_TABS : PHOTOS_AND_CHALLENGES

  return (
    <div
      className={`grid ${
        isAdmin ? 'grid-cols-3 max-w-xl' : 'grid-cols-2 max-w-md'
      } gap-1 sm:gap-2.5 bg-sage-200/70 p-1 sm:p-1.5 rounded-2xl`}>
      {tabs.map(({ id, label, Icon, iconClass }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex items-center justify-center gap-1.5 min-h-11 px-0.5 rounded-xl whitespace-nowrap text-[11px] min-[360px]:text-xs sm:text-sm font-bold transition-all ${
            activeTab === id
              ? 'bg-white text-sage-900 shadow-xs'
              : 'text-sage-800 hover:text-sage-900'
          }`}>
          <Icon className={`${iconClass} shrink-0 hidden min-[430px]:block`} />
          <span>
            {label} ({counts[id]})
          </span>
        </button>
      ))}
    </div>
  )
}
