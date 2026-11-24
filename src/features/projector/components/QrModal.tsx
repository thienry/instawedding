import { X } from 'lucide-react'

import { QrCodeSvg } from '@/components/common/QrCodeSvg'
import { CAPTURE_URL } from '@/features/projector/constants'

interface QrModalProps {
  readonly onClose: () => void
}

/** Full screen QR code, readable from the back of the room. */
export function QrModal({ onClose }: QrModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      onClick={onClose}
      className="projector-modal"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="projector-rise flex flex-col items-center text-center gap-[3.5vh]"
      >
        <h2
          id="qr-modal-title"
          className="font-serif text-[clamp(1.75rem,6vh,4.5rem)] leading-tight text-balance"
        >
          Envie sua foto para o telão
        </h2>
        <div className="p-4 bg-white rounded-2xl">
          <QrCodeSvg
            value={CAPTURE_URL}
            className="w-[min(78vw,54vh)] h-auto"
          />
        </div>
        <p className="text-[clamp(0.85rem,2.2vh,1.4rem)] text-white/65 break-all">
          {CAPTURE_URL}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar QR Code"
        className="projector-control absolute top-5 right-5"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}
