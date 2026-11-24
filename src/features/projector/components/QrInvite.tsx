import { QrCodeSvg } from '@/components/common/QrCodeSvg'
import { CAPTURE_URL } from '@/features/projector/constants'

interface QrInviteProps {
  readonly onOpen: () => void
}

/** QR code always on screen, inviting the guests to post. */
export function QrInvite({ onOpen }: QrInviteProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Abrir o QR Code em tela cheia"
      className="group w-full flex items-center gap-[1.4vw] text-left cursor-pointer"
    >
      <span className="shrink-0 p-1.5 rounded-lg bg-white transition-transform duration-500 group-hover:scale-105">
        <QrCodeSvg
          value={CAPTURE_URL}
          className="w-[clamp(6rem,15vh,11rem)] h-auto"
        />
      </span>
      <span>
        <span className="block font-serif text-[clamp(1.1rem,2.9vh,2rem)] leading-tight text-balance">
          Apareça no telão
        </span>
        <span className="block mt-[1vh] text-[clamp(0.75rem,1.7vh,1.2rem)] text-white/65 leading-snug text-pretty">
          Aponte a câmera, tire uma foto ou cumpra um desafio da festa.
        </span>
      </span>
    </button>
  )
}
