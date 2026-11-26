import { Radio, Square, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { getMinutesOnAir, isMomentLive } from '@/utils/moments'

import type { ChallengeAdmin } from '@/features/admin/hooks/useChallenges'
import type { Challenge } from '@/types/domain'

const TICK_MS = 30_000

interface MomentCardProps {
  readonly moment: Challenge
  readonly now: number
  readonly onSetLive: (isLive: boolean) => void
  /** Deletes the moment. Omit to hide the button. */
  readonly onDelete?: () => void
}

function MomentCard({ moment, now, onSetLive, onDelete }: MomentCardProps) {
  const isLive = isMomentLive(moment, now)
  const minutes = getMinutesOnAir(moment, now)

  return (
    <div
      className={`p-3 sm:p-4 rounded-3xl border bg-white flex items-center justify-between gap-2 sm:gap-4 shadow-2xs ${
        isLive ? 'border-rose-300 ring-2 ring-rose-200' : 'border-sage-200'
      }`}>
      <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-sage-50 border border-sage-200 flex items-center justify-center text-2xl shrink-0">
          {moment.icon}
        </div>
        <div className="min-w-0 space-y-0.5">
          <h5 className="text-sm sm:text-base font-bold text-sage-900 truncate">{moment.title}</h5>
          {isLive ? (
            <p className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-700">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
              No ar há {minutes} min
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-sage-700 line-clamp-1">{moment.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center -mr-1 sm:mr-0 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => onSetLive(!isLive)}
          className={`min-h-11 px-3.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors ${
            isLive
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-sage-900 hover:bg-sage-800 text-white'
          }`}>
          {isLive ? <Square className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
          <span>{isLive ? 'Encerrar' : 'Ativar'}</span>
        </button>

        {onDelete && !isLive && (
          <button
            type="button"
            onClick={onDelete}
            title="Excluir Momento"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 transition-colors">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  )
}

interface MomentListProps {
  readonly moments: readonly Challenge[]
  readonly challengeAdmin: ChallengeAdmin
  readonly isAdmin: boolean
}

/** Moments of the party, which the ceremonial puts on air one at a time. */
export function MomentList({ moments, challengeAdmin, isAdmin }: MomentListProps) {
  const [now, setNow] = useState(() => Date.now())
  const { setMomentLive, deleteChallenge } = challengeAdmin

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(intervalId)
  }, [])

  if (moments.length === 0) return null

  return (
    <section className="space-y-2.5 sm:space-y-3">
      <div>
        <h4 className="text-sm font-bold uppercase tracking-wider text-sage-900">
          Momentos da festa
        </h4>
        <p className="text-xs sm:text-sm text-sage-700">
          Ao ativar, o telão e o feed destacam os posts do momento até você encerrar.
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 sm:gap-4">
        {moments.map((moment) => (
          <MomentCard
            key={moment.id}
            moment={moment}
            now={now}
            onSetLive={(isLive) => {
              setNow(Date.now())
              void setMomentLive(moment.id, isLive)
            }}
            onDelete={isAdmin ? () => void deleteChallenge(moment.id) : undefined}
          />
        ))}
      </div>
    </section>
  )
}
