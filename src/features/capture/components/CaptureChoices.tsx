import {
  AlertCircle,
  Camera,
  Film,
  Image as ImageIcon,
  PenTool,
} from 'lucide-react'

interface CaptureChoicesProps {
  readonly errorMessage: string
  readonly onOpenCamera: () => void
  readonly onOpenRecorder: () => void
  readonly onOpenGallery: () => void
  readonly onOpenGuestbook: () => void
}

/** Ways to add media: camera, Boomerang, gallery or guestbook. */
export function CaptureChoices({
  errorMessage,
  onOpenCamera,
  onOpenRecorder,
  onOpenGallery,
  onOpenGuestbook,
}: CaptureChoicesProps) {
  return (
    <div className="bg-white rounded-3xl p-8 sm:p-10 border border-sage-200/90 text-center space-y-5 shadow-xs">
      <div className="w-20 h-20 rounded-full bg-sage-100 text-sage-900 flex items-center justify-center mx-auto shadow-2xs">
        <Camera className="w-9 h-9" />
      </div>
      <div className="space-y-2">
        <h3 className="font-serif text-2xl font-bold text-sage-900">
          Registre o Momento
        </h3>
        <p className="text-sm text-sage-800/75 max-w-md mx-auto leading-relaxed">
          Tire uma foto, grave um Boomerang (5s) ou escolha fotos e vídeos da
          sua galeria (até 25MB)!
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-center gap-2 text-rose-700 text-xs sm:text-sm max-w-md mx-auto">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3.5 pt-2">
        <button
          type="button"
          onClick={onOpenCamera}
          className="flex flex-col items-center justify-center p-5 rounded-2xl bg-sage-900 text-white hover:bg-sage-800 active:scale-95 transition-all shadow-md space-y-2"
        >
          <Camera className="w-7 h-7 text-gold-400" />
          <span className="text-sm font-bold">Tirar Foto</span>
        </button>

        <button
          type="button"
          onClick={onOpenRecorder}
          className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-br from-sage-900 to-sage-800 text-white hover:from-sage-800 hover:to-sage-700 active:scale-95 transition-all shadow-md border border-gold-400/40 space-y-2"
        >
          <Film className="w-7 h-7 text-gold-400" />
          <span className="text-sm font-bold">Boomerang (5s)</span>
        </button>

        <button
          type="button"
          onClick={onOpenGallery}
          className="col-span-2 flex items-center justify-center gap-3 p-4 rounded-2xl bg-sage-100 text-sage-900 hover:bg-sage-200 active:scale-95 transition-all border border-sage-200"
        >
          <ImageIcon className="w-5 h-5 text-sage-800 shrink-0" />
          <div className="text-left sm:text-center">
            <span className="text-sm font-bold block">Escolher da Galeria</span>
            <span className="text-xs text-sage-800/70">
              Fotos e vídeos de até 25MB
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenGuestbook}
          className="col-span-2 flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#112419] via-[#1B3827] to-[#112419] text-white hover:from-[#173022] hover:to-[#173022] active:scale-95 transition-all shadow-md border border-gold-400/50"
        >
          <PenTool className="w-5 h-5 text-gold-400 shrink-0" />
          <div className="text-left sm:text-center">
            <span className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Livro de Recados Digital</span>
              <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-gold-400 text-sage-950">
                Novo
              </span>
            </span>
            <span className="text-xs text-gold-200/80">
              Envie seus votos e mensagem carinhosa para Thiago &amp; Priscila
            </span>
          </div>
        </button>
      </div>
    </div>
  )
}
