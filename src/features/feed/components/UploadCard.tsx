import { AlertCircle, CloudUpload, Loader2, WifiOff, X } from 'lucide-react'

import { OfflineQueueService } from '@/services/offline-queue.service'

import type { BackgroundUploadTask } from '@/services/offline-queue/upload-task'

interface UploadCardProps {
  readonly task: BackgroundUploadTask
}

/** Progress of a background upload, with retry and cancel. */
export function UploadCard({ task }: UploadCardProps) {
  const isOffline = !navigator.onLine
  const isPaused = isOffline || task.status === 'failed'
  const isRefused = task.isPermanentFailure === true && !isOffline
  const PausedIcon = isRefused ? AlertCircle : WifiOff
  const isVideo = task.mediaType === 'video'

  return (
    <div className="bg-white rounded-2xl p-3.5 border border-sage-200/90 shadow-sm space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 relative border border-sage-200">
            <img
              src={
                isVideo
                  ? task.blurDataUrl || '/favicon.svg'
                  : task.previewUrl || task.blurDataUrl || '/favicon.svg'
              }
              alt="Postando mídia"
              className="w-full h-full object-cover"
            />
            {task.status === 'uploading' && (
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-sage-900 truncate flex items-center gap-1.5">
              {isPaused ? (
                <>
                  <PausedIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    {isOffline
                      ? 'Aguardando internet...'
                      : isRefused
                        ? 'Não foi possível enviar'
                        : 'Envio pausado'}
                  </span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5 text-sage-800 shrink-0" />
                  <span>{isVideo ? 'Postando seu vídeo...' : 'Postando sua foto...'}</span>
                </>
              )}
            </p>
            <p className={`text-xs ${isRefused ? 'text-rose-700' : 'text-sage-800 truncate'}`}>
              {isRefused
                ? task.errorMessage
                : isPaused
                  ? 'Salvo no aparelho. Enviaremos automaticamente com o app aberto.'
                  : `${task.progress}% enviado`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isPaused && (
            <button
              type="button"
              onClick={() => void OfflineQueueService.retryTask(task.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-sage-900 text-white hover:bg-sage-800 transition-colors">
              Tentar agora
            </button>
          )}
          <button
            type="button"
            onClick={() => void OfflineQueueService.cancelTask(task.id)}
            title="Cancelar envio"
            aria-label="Cancelar envio"
            className="p-1.5 rounded-full text-sage-800/50 hover:text-rose-600 hover:bg-rose-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="h-1.5 w-full rounded-full bg-sage-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isPaused ? 'bg-amber-500' : 'bg-gradient-to-r from-sage-800 to-gold-500'
          }`}
          style={{
            width: `${Math.max(12, task.progress)}%`,
          }}
        />
      </div>
    </div>
  )
}
