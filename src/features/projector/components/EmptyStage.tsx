import { QrCodeSvg } from '@/components/common/QrCodeSvg'
import { CAPTURE_URL } from '@/features/projector/constants'

/** Invitation shown before the first post. */
export function EmptyStage() {
  return (
    <main className="relative h-full flex flex-col items-center justify-center text-center p-6 gap-[4.5vh]">
      <h1 className="projector-rise font-serif text-[clamp(2.5rem,10vh,7rem)] leading-none tracking-tight">
        Thiago <span className="italic text-gold-400">&amp;</span> Priscila
      </h1>
      <div className="projector-rise p-3 bg-white rounded-2xl">
        <QrCodeSvg
          value={CAPTURE_URL}
          className="w-[clamp(11rem,34vh,24rem)] h-auto"
        />
      </div>
      <div className="projector-rise">
        <h2 className="font-serif italic text-[clamp(1.4rem,4vh,2.75rem)] text-balance">
          Aguardando o primeiro clique da noite!
        </h2>
        <p className="mt-[1.5vh] mx-auto max-w-[36em] text-[clamp(0.9rem,2vh,1.4rem)] text-white/65 text-balance">
          Aponte a câmera do seu celular para o QR Code e envie a foto que vai
          estrear o telão.
        </p>
      </div>
    </main>
  )
}
