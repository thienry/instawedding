import { Play, Radio, Square, Timer, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  formatCountdown,
  getMinutesOnAir,
  getMomentStart,
  getSecondsLeft,
  isMomentLive,
  isMomentUpcoming,
  MOMENT_COUNTDOWN_MINUTES,
} from '@/utils/moments'

import type { ChallengeAdmin } from '@/features/admin/hooks/useChallenges'
import type { Challenge } from '@/types/domain'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

const TICK_MS = 1000

interface ActionButtonProps {
  readonly onClick: () => void
  readonly Icon: LucideIcon
  readonly variant: 'primary' | 'danger' | 'outline'
  readonly children: ReactNode
}

const VARIANT_CLASSES = {
  primary: 'bg-sage-900 hover:bg-sage-800 text-white',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  outline: 'border border-sage-200 text-sage-900 hover:bg-sage-50',
} as const

function ActionButton({ onClick, Icon, variant, children }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-11 px-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-colors ${VARIANT_CLASSES[variant]}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span>{children}</span>
    </button>
  )
}

interface MomentCardProps {
  readonly moment: Challenge
  readonly now: number
  /** Puts the moment on air after `delayMinutes`, or takes it off. */
  readonly onSetLive: (isLive: boolean, delayMinutes?: number) => void
  /** Deletes the moment. Omit to hide the button. */
  readonly onDelete?: () => void
}

function MomentCard({ moment, now, onSetLive, onDelete }: MomentCardProps) {
  const isLive = isMomentLive(moment, now)
  const isUpcoming = isMomentUpcoming(moment, now)
  const start = getMomentStart(moment)

  return (
    <div
      className={`p-3 sm:p-4 rounded-3xl border bg-white shadow-2xs space-y-3 ${
        isLive || isUpcoming ? 'border-rose-300 ring-2 ring-rose-200' : 'border-sage-200'
      }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-sage-50 border border-sage-200 flex items-center justify-center text-2xl shrink-0">
            {moment.icon}
          </div>
          <div className="min-w-0 space-y-0.5">
            <h5 className="text-sm sm:text-base font-bold text-sage-900 truncate">
              {moment.title}
            </h5>
            {isLive ? (
              <p className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-700">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                No ar há {getMinutesOnAir(moment, now)} min
              </p>
            ) : isUpcoming && start !== null ? (
              <p className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-700 tabular-nums">
                <Timer className="w-4 h-4" />
                Começa em {formatCountdown(getSecondsLeft(start, now))}
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-sage-700 line-clamp-1">{moment.description}</p>
            )}
          </div>
        </div>

        {onDelete && !isLive && !isUpcoming && (
          <button
            type="button"
            onClick={onDelete}
            title="Excluir Momento"
            className="w-11 h-11 flex items-center justify-center rounded-xl text-rose-600 hover:bg-rose-50 transition-colors shrink-0">
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {isLive ? (
          <ActionButton onClick={() => onSetLive(false)} Icon={Square} variant="danger">
            Encerrar
          </ActionButton>
        ) : isUpcoming ? (
          <>
            <ActionButton onClick={() => onSetLive(true)} Icon={Play} variant="primary">
              Começar agora
            </ActionButton>
            <ActionButton onClick={() => onSetLive(false)} Icon={X} variant="outline">
              Cancelar
            </ActionButton>
          </>
        ) : (
          <>
            <ActionButton onClick={() => onSetLive(true)} Icon={Radio} variant="primary">
              Ativar
            </ActionButton>
            {MOMENT_COUNTDOWN_MINUTES.map((minutes) => (
              <ActionButton
                key={minutes}
                onClick={() => onSetLive(true, minutes)}
                Icon={Timer}
                variant="outline">
                Em {minutes} min
              </ActionButton>
            ))}
          </>
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
          Ao ativar, o telão e o feed destacam os posts do momento até você encerrar. Com contagem
          regressiva, o telão conta até o momento começar sozinho.
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5 sm:gap-4">
        {moments.map((moment) => (
          <MomentCard
            key={moment.id}
            moment={moment}
            now={now}
            onSetLive={(isLive, delayMinutes) => {
              setNow(Date.now())
              void setMomentLive(moment.id, isLive, delayMinutes)
            }}
            onDelete={isAdmin ? () => void deleteChallenge(moment.id) : undefined}
          />
        ))}
      </div>
    </section>
  )
}
