import { Camera, Flame, Trophy } from 'lucide-react'

import type { FeedTab } from '@/features/feed/types'
import type { LucideIcon } from 'lucide-react'

interface IconTab {
  readonly id: FeedTab
  readonly label: string
  readonly Icon: LucideIcon
  readonly iconClass: string
}

const ICON_TABS: readonly IconTab[] = [
  {
    id: 'most-liked',
    label: 'Mais Curtidas',
    Icon: Flame,
    iconClass: 'text-amber-500',
  },
  {
    id: 'challenges',
    label: 'Desafios',
    Icon: Trophy,
    iconClass: 'text-gold-600',
  },
  {
    id: 'mine',
    label: 'Minhas',
    Icon: Camera,
    iconClass: 'text-sage-800',
  },
]

function tabClass(isActive: boolean): string {
  return `min-h-11 px-3.5 sm:px-4 rounded-full text-sm font-semibold transition-all ${
    isActive
      ? 'bg-sage-900 text-white shadow-sm'
      : 'bg-white text-sage-800 border border-sage-200 hover:bg-sage-100'
  }`
}

interface FilterTabsProps {
  readonly activeTab: FeedTab
  readonly onChange: (tab: FeedTab) => void
  readonly postCount: number
}

/** Feed filters. */
export function FilterTabs({ activeTab, onChange, postCount }: FilterTabsProps) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 scrollbar-none">
      <button
        type="button"
        onClick={() => onChange('all')}
        className={`shrink-0 ${tabClass(activeTab === 'all')}`}>
        Todas ({postCount})
      </button>
      {ICON_TABS.map(({ id, label, Icon, iconClass }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`shrink-0 inline-flex items-center gap-1.5 ${tabClass(activeTab === id)}`}>
          <Icon className={`w-4 h-4 ${iconClass}`} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  )
}
